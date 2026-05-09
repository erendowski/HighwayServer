using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class SensorStatusHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly SensorStateStore _sensorStore;
    private readonly TrackStateStore _trackStore;
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly ILogger<SensorStatusHandler> _logger;

    public string TopicPattern => "highway/sensors/+/status";

    public SensorStatusHandler(
        SensorStateStore sensorStore,
        TrackStateStore trackStore,
        IHubContext<TelemetryHub> hub,
        ILogger<SensorStatusHandler> logger)
    {
        _sensorStore = sensorStore;
        _trackStore  = trackStore;
        _hub         = hub;
        _logger      = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<SensorStatusPayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[SensorStatusHandler] Invalid payload on {Topic}", topic);
            return;
        }

        _sensorStore.UpdateStatus(data.SensorId, data.Status, data.TsUtc);

        if (data.Status == "offline")
            _trackStore.PruneSensor(data.SensorId);

        await _hub.Clients.All.SendAsync(
            "SensorStatusChanged",
            new SensorStatusChangedEvent(data.SensorId, data.Status, data.TsUtc),
            ct);
    }
}
