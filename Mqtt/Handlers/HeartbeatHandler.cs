using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class HeartbeatHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly SensorStateStore _sensorStore;
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly ILogger<HeartbeatHandler> _logger;

    public string TopicPattern => "highway/sensors/+/heartbeat";

    public HeartbeatHandler(
        SensorStateStore sensorStore,
        IHubContext<TelemetryHub> hub,
        ILogger<HeartbeatHandler> logger)
    {
        _sensorStore = sensorStore;
        _hub         = hub;
        _logger      = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<HeartbeatPayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[HeartbeatHandler] Invalid payload on {Topic}", topic);
            return;
        }

        _sensorStore.UpdateHeartbeat(data.SensorId, data.TsUtc);

        await _hub.Clients.All.SendAsync(
            "HeartbeatReceived",
            new HeartbeatReceivedEvent(data.SensorId, data.Alive, data.TsUtc),
            ct);
    }
}
