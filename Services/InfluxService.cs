using HighwayServer.Contracts.Mqtt;
using HighwayServer.Models;
using HighwayServer.Options;
using InfluxDB.Client;
using InfluxDB.Client.Api.Domain;
using InfluxDB.Client.Writes;
using Microsoft.Extensions.Options;

namespace HighwayServer.Services;

public sealed class InfluxService
{
    private readonly InfluxDBClient _client;
    private readonly InfluxDbOptions _opts;
    private readonly ILogger<InfluxService> _logger;

    public InfluxService(IOptions<InfluxDbOptions> opts, ILogger<InfluxService> logger)
    {
        _opts   = opts.Value;
        _logger = logger;
        _client = new InfluxDBClient(_opts.Url, _opts.Token);
    }

    // ── Write methods ─────────────────────────────────────────────────────────

    public async Task WriteDetectionAsync(
        string sensorId, DetectedObject obj, int frameId, DateTimeOffset ts)
    {
        try
        {
            var api   = _client.GetWriteApiAsync();
            var point = PointData.Measurement("detection")
                .Tag("sensor_id",   sensorId)
                .Tag("class",       obj.Class)
                .Tag("track_state", obj.TrackState)
                .Field("track_id",   (long)obj.TrackId)
                .Field("confidence", (double)obj.Confidence)
                .Field("frame_id",   (long)frameId);

            if (obj.Bbox?.Length >= 4)
            {
                point = point
                    .Field("bbox_x", (long)obj.Bbox[0])
                    .Field("bbox_y", (long)obj.Bbox[1])
                    .Field("bbox_w", (long)obj.Bbox[2])
                    .Field("bbox_h", (long)obj.Bbox[3]);
            }

            point = point.Timestamp(ts.UtcDateTime, WritePrecision.Ms);
            await api.WritePointAsync(point, _opts.Bucket, _opts.Org);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to write detection for sensor={SensorId} track={TrackId}",
                sensorId, obj.TrackId);
        }
    }

    public async Task WriteStatsAsync(StatsPayload stats)
    {
        try
        {
            var api   = _client.GetWriteApiAsync();
            var point = PointData.Measurement("sensor_stats")
                .Tag("sensor_id",          stats.SensorId)
                .Field("fps",              stats.Fps)
                .Field("queue_size",       (long)stats.QueueSize)
                .Field("published",        (long)stats.Published)
                .Field("dropped",          (long)stats.Dropped)
                .Field("events_published", (long)stats.EventsPublished)
                .Field("tracks_confirmed", (long)stats.TracksConfirmed)
                .Field("tracks_lost",      (long)stats.TracksLost)
                .Field("tracks_tentative", (long)stats.TracksTentative)
                .Field("tracks_active_total", (long)stats.TracksActiveTotal)
                .Timestamp(stats.TsUtc.UtcDateTime, WritePrecision.Ms);

            await api.WritePointAsync(point, _opts.Bucket, _opts.Org);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write stats for sensor={SensorId}", stats.SensorId);
        }
    }

    public async Task WriteVehicleEventAsync(
        string sensorId, VehicleEventPayload evt, string eventType)
    {
        try
        {
            var api   = _client.GetWriteApiAsync();
            var point = PointData.Measurement("vehicle_event")
                .Tag("sensor_id",   sensorId)
                .Tag("class",       evt.Object.Class)
                .Tag("event_type",  eventType)
                .Field("track_id",  (long)evt.Object.TrackId)
                .Field("frame_id",  (long)evt.FrameId)
                .Timestamp(evt.TsUtc.UtcDateTime, WritePrecision.Ms);

            await api.WritePointAsync(point, _opts.Bucket, _opts.Org);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to write vehicle event for sensor={SensorId} type={EventType}",
                sensorId, eventType);
        }
    }

    public async Task WriteAnomalyAsync(
        string sensorId, int trackId, string vehicleClass,
        string anomalyType, string severity, float speedKmh, float? delta, DateTimeOffset ts)
    {
        try
        {
            var api   = _client.GetWriteApiAsync();
            var point = PointData.Measurement("anomalies")
                .Tag("sensor_id",    sensorId)
                .Tag("track_id",     trackId.ToString())
                .Tag("type",         anomalyType)
                .Tag("severity",     severity)
                .Tag("class",        vehicleClass)
                .Field("speed_kmh",  (double)speedKmh)
                .Field("confidence", 1.0);

            if (delta.HasValue)
                point = point.Field("delta", (double)delta.Value);

            point = point.Timestamp(ts.UtcDateTime, WritePrecision.Ms);
            await api.WritePointAsync(point, _opts.Bucket, _opts.Org);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to write anomaly for sensor={SensorId} track={TrackId} type={Type}",
                sensorId, trackId, anomalyType);
        }
    }

    public async Task WriteSensorHealthAsync(string sensorId, bool alive, DateTimeOffset ts)
    {
        try
        {
            var api   = _client.GetWriteApiAsync();
            var point = PointData.Measurement("sensor_health")
                .Tag("sensor_id", sensorId)
                .Field("alive",   alive ? 1L : 0L)
                .Timestamp(ts.UtcDateTime, WritePrecision.Ms);

            await api.WritePointAsync(point, _opts.Bucket, _opts.Org);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to write sensor health for sensor={SensorId}", sensorId);
        }
    }

    // ── Query methods ─────────────────────────────────────────────────────────

    public async Task<List<DetectionRecord>> QueryDetectionsAsync(
        string sensorId, DateTimeOffset from, DateTimeOffset to, string? vehicleClass)
    {
        var classFilter = vehicleClass is not null
            ? $"|> filter(fn: (r) => r[\"class\"] == \"{vehicleClass}\")"
            : string.Empty;

        var flux = $"""
            from(bucket: "{_opts.Bucket}")
              |> range(start: {from.UtcDateTime:yyyy-MM-ddTHH:mm:ssZ}, stop: {to.UtcDateTime:yyyy-MM-ddTHH:mm:ssZ})
              |> filter(fn: (r) => r["_measurement"] == "detection")
              |> filter(fn: (r) => r["sensor_id"] == "{sensorId}")
              {classFilter}
              |> pivot(rowKey: ["_time", "sensor_id", "class", "track_state"], columnKey: ["_field"], valueColumn: "_value")
            """;

        try
        {
            var tables  = await _client.GetQueryApi().QueryAsync(flux, _opts.Org);
            var results = new List<DetectionRecord>();
            foreach (var table in tables)
            foreach (var record in table.Records)
            {
                var rawTime = record.GetTime()?.ToDateTimeUtc() ?? DateTime.UtcNow;
                results.Add(new DetectionRecord(
                    Ts:           new DateTimeOffset(rawTime, TimeSpan.Zero),
                    SensorId:     record.GetValueByKey("sensor_id")?.ToString()   ?? string.Empty,
                    TrackId:      Convert.ToInt32(record.GetValueByKey("track_id")   ?? 0),
                    VehicleClass: record.GetValueByKey("class")?.ToString()       ?? string.Empty,
                    TrackState:   record.GetValueByKey("track_state")?.ToString() ?? string.Empty,
                    Confidence:   Convert.ToSingle(record.GetValueByKey("confidence") ?? 0f),
                    BboxX:        Convert.ToInt32(record.GetValueByKey("bbox_x")  ?? 0),
                    BboxY:        Convert.ToInt32(record.GetValueByKey("bbox_y")  ?? 0),
                    BboxW:        Convert.ToInt32(record.GetValueByKey("bbox_w")  ?? 0),
                    BboxH:        Convert.ToInt32(record.GetValueByKey("bbox_h")  ?? 0),
                    FrameId:      Convert.ToInt32(record.GetValueByKey("frame_id") ?? 0)));
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "InfluxDB detection query failed for sensor={SensorId}", sensorId);
            return [];
        }
    }

    public async Task<List<StatsRecord>> QueryStatsAsync(
        string sensorId, DateTimeOffset from, DateTimeOffset to)
    {
        var flux = $"""
            from(bucket: "{_opts.Bucket}")
              |> range(start: {from.UtcDateTime:yyyy-MM-ddTHH:mm:ssZ}, stop: {to.UtcDateTime:yyyy-MM-ddTHH:mm:ssZ})
              |> filter(fn: (r) => r["_measurement"] == "sensor_stats")
              |> filter(fn: (r) => r["sensor_id"] == "{sensorId}")
              |> pivot(rowKey: ["_time", "sensor_id"], columnKey: ["_field"], valueColumn: "_value")
            """;

        try
        {
            var tables  = await _client.GetQueryApi().QueryAsync(flux, _opts.Org);
            var results = new List<StatsRecord>();
            foreach (var table in tables)
            foreach (var record in table.Records)
            {
                var rawTime = record.GetTime()?.ToDateTimeUtc() ?? DateTime.UtcNow;
                results.Add(new StatsRecord(
                    Ts:               new DateTimeOffset(rawTime, TimeSpan.Zero),
                    SensorId:         record.GetValueByKey("sensor_id")?.ToString() ?? string.Empty,
                    Fps:              Convert.ToSingle(record.GetValueByKey("fps")    ?? 0f),
                    TracksActiveTotal: Convert.ToInt32(record.GetValueByKey("tracks_active_total") ?? 0),
                    Published:        Convert.ToInt32(record.GetValueByKey("published")  ?? 0),
                    Dropped:          Convert.ToInt32(record.GetValueByKey("dropped")    ?? 0),
                    QueueSize:        Convert.ToInt32(record.GetValueByKey("queue_size") ?? 0)));
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "InfluxDB stats query failed for sensor={SensorId}", sensorId);
            return [];
        }
    }

    public async Task<List<VehicleEventRecord>> QueryVehicleEventsAsync(
        string sensorId, DateTimeOffset from, DateTimeOffset to)
    {
        var flux = $"""
            from(bucket: "{_opts.Bucket}")
              |> range(start: {from.UtcDateTime:yyyy-MM-ddTHH:mm:ssZ}, stop: {to.UtcDateTime:yyyy-MM-ddTHH:mm:ssZ})
              |> filter(fn: (r) => r["_measurement"] == "vehicle_event")
              |> filter(fn: (r) => r["sensor_id"] == "{sensorId}")
              |> pivot(rowKey: ["_time", "sensor_id", "class", "event_type"], columnKey: ["_field"], valueColumn: "_value")
            """;

        try
        {
            var tables  = await _client.GetQueryApi().QueryAsync(flux, _opts.Org);
            var results = new List<VehicleEventRecord>();
            foreach (var table in tables)
            foreach (var record in table.Records)
            {
                var rawTime = record.GetTime()?.ToDateTimeUtc() ?? DateTime.UtcNow;
                results.Add(new VehicleEventRecord(
                    Ts:           new DateTimeOffset(rawTime, TimeSpan.Zero),
                    SensorId:     record.GetValueByKey("sensor_id")?.ToString()  ?? string.Empty,
                    TrackId:      Convert.ToInt32(record.GetValueByKey("track_id") ?? 0),
                    VehicleClass: record.GetValueByKey("class")?.ToString()      ?? string.Empty,
                    EventType:    record.GetValueByKey("event_type")?.ToString() ?? string.Empty));
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "InfluxDB vehicle events query failed for sensor={SensorId}", sensorId);
            return [];
        }
    }
}
