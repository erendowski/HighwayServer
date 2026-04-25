using HighwayServer.Models;
using InfluxDB.Client;
using InfluxDB.Client.Api.Domain;
using InfluxDB.Client.Writes;

namespace HighwayServer.Services;

public class InfluxService
{
    private readonly InfluxDBClient _client;
    private readonly string _bucket;
    private readonly string _org;

    public InfluxService(IConfiguration config)
    {
        var cfg = config.GetSection("InfluxDb");
        _client = new InfluxDBClient(cfg["Url"]!, cfg["Token"]);
        _bucket  = cfg["Bucket"] ?? "highway";
        _org     = cfg["Org"]    ?? "highway";
    }

    public async Task WriteAsync(TelemetryMessage msg)
    {
        var api = _client.GetWriteApiAsync();

        var point = PointData.Measurement("detections")
            .Tag("vehicleId", msg.VehicleId)
            .Tag("class",     msg.Class)
            .Tag("trackId",   msg.TrackId)
            .Field("speed",   msg.Speed)
            .Timestamp(msg.Timestamp, WritePrecision.Ms);

        await api.WritePointAsync(point, _bucket, _org);
    }

    public async Task<List<TelemetryMessage>> QueryAsync(
        DateTime from, DateTime to, string? vehicleId)
    {
        var api = _client.GetQueryApi();

        var vehicleFilter = vehicleId is not null
            ? $"|> filter(fn: (r) => r[\"vehicleId\"] == \"{vehicleId}\")"
            : string.Empty;

        var flux = $"""
            from(bucket: "{_bucket}")
              |> range(start: {from.ToUniversalTime():yyyy-MM-ddTHH:mm:ssZ}, stop: {to.ToUniversalTime():yyyy-MM-ddTHH:mm:ssZ})
              |> filter(fn: (r) => r["_measurement"] == "detections")
              {vehicleFilter}
              |> pivot(rowKey: ["_time", "vehicleId", "class", "trackId"], columnKey: ["_field"], valueColumn: "_value")
            """;

        var tables  = await api.QueryAsync(flux, _org);
        var results = new List<TelemetryMessage>();

        foreach (var table in tables)
        foreach (var record in table.Records)
        {
            results.Add(new TelemetryMessage
            {
                VehicleId = record.GetValueByKey("vehicleId")?.ToString() ?? string.Empty,
                Class     = record.GetValueByKey("class")?.ToString()     ?? string.Empty,
                Speed     = Convert.ToDouble(record.GetValueByKey("speed") ?? 0d),
                Timestamp = record.GetTime()?.ToDateTimeUtc() ?? DateTime.UtcNow,
                TrackId   = record.GetValueByKey("trackId")?.ToString()   ?? string.Empty,
            });
        }

        return results;
    }
}
