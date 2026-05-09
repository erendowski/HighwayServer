using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class VehicleEnterHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly TrackStateStore _trackStore;
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly InfluxService _influx;
    private readonly ILogger<VehicleEnterHandler> _logger;

    public string TopicPattern => "highway/events/+/vehicle/enter";

    public VehicleEnterHandler(
        TrackStateStore trackStore,
        IHubContext<TelemetryHub> hub,
        InfluxService influx,
        ILogger<VehicleEnterHandler> logger)
    {
        _trackStore = trackStore;
        _hub        = hub;
        _influx     = influx;
        _logger     = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<VehicleEventPayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[VehicleEnterHandler] Invalid payload on {Topic}", topic);
            return;
        }

        var sensorId = data.SensorId;
        var obj      = data.Object;

        _trackStore.Upsert(sensorId, new DetectedObject
        {
            TrackId    = obj.TrackId,
            Class      = obj.Class,
            Confidence = obj.Confidence,
            Bbox       = obj.Bbox,
            TrackState = "enter",
        }, data.TsUtc);

        await _hub.Clients.All.SendAsync(
            "VehicleEntered",
            new VehicleEnteredEvent(sensorId, obj.TrackId, obj.Class, data.TsUtc),
            ct);

        await _influx.WriteVehicleEventAsync(sensorId, data, "enter");
    }
}
