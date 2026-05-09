using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class SensorMetaHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly SensorStateStore _sensorStore;
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly ILogger<SensorMetaHandler> _logger;

    public string TopicPattern => "highway/sensors/+/meta";

    public SensorMetaHandler(
        SensorStateStore sensorStore,
        IHubContext<TelemetryHub> hub,
        ILogger<SensorMetaHandler> logger)
    {
        _sensorStore = sensorStore;
        _hub         = hub;
        _logger      = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<SensorMetaPayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[SensorMetaHandler] Invalid payload on {Topic}", topic);
            return;
        }

        _sensorStore.UpdateMeta(data.SensorId, data);

        await _hub.Clients.All.SendAsync(
            "SensorMetaUpdated",
            new SensorMetaUpdatedEvent(data.SensorId, data.Device, data.Capabilities, data.TsUtc),
            ct);
    }
}
