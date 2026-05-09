using System.Collections.Concurrent;
using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class DetectionsHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly SensorStateStore _sensorStore;
    private readonly TrackStateStore _trackStore;
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly InfluxService _influx;
    private readonly ILogger<DetectionsHandler> _logger;

    // Per-sensor last-broadcast timestamp for SignalR rate limiting (max 10 Hz).
    private readonly ConcurrentDictionary<string, DateTime> _lastBroadcast = new();

    public string TopicPattern => "highway/telemetry/+/detections";

    public DetectionsHandler(
        SensorStateStore sensorStore,
        TrackStateStore trackStore,
        IHubContext<TelemetryHub> hub,
        InfluxService influx,
        ILogger<DetectionsHandler> logger)
    {
        _sensorStore = sensorStore;
        _trackStore  = trackStore;
        _hub         = hub;
        _influx      = influx;
        _logger      = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<DetectionPayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[DetectionsHandler] Invalid payload on {Topic}", topic);
            return;
        }

        _sensorStore.Touch(data.SensorId, data.TsUtc);

        foreach (var obj in data.Objects)
            _trackStore.Upsert(data.SensorId, obj, data.TsUtc);

        // SignalR broadcast — rate-limited to 10 Hz per sensor.
        var now = DateTime.UtcNow;
        if (!_lastBroadcast.TryGetValue(data.SensorId, out var last) ||
            (now - last).TotalMilliseconds >= 100)
        {
            var dtos = data.Objects
                .Select(o => new DetectedObjectDto(o.TrackId, o.Class, o.Confidence, o.Bbox, o.TrackState))
                .ToArray();

            await _hub.Clients.All.SendAsync(
                "DetectionsUpdated",
                new DetectionsUpdatedEvent(data.SensorId, data.FrameId, data.Fps, dtos, data.TsUtc),
                ct);

            _lastBroadcast[data.SensorId] = now;
        }

        // InfluxDB write — NOT rate-limited, one call per detected object.
        foreach (var obj in data.Objects)
            await _influx.WriteDetectionAsync(data.SensorId, obj, data.FrameId, data.TsUtc);
    }
}
