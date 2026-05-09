using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class StatsHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly SensorStateStore _sensorStore;
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly InfluxService _influx;
    private readonly ILogger<StatsHandler> _logger;

    public string TopicPattern => "highway/telemetry/+/stats";

    public StatsHandler(
        SensorStateStore sensorStore,
        IHubContext<TelemetryHub> hub,
        InfluxService influx,
        ILogger<StatsHandler> logger)
    {
        _sensorStore = sensorStore;
        _hub         = hub;
        _influx      = influx;
        _logger      = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<StatsPayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[StatsHandler] Invalid payload on {Topic}", topic);
            return;
        }

        _sensorStore.UpdateStats(data.SensorId, data);

        await _hub.Clients.All.SendAsync(
            "SensorStatsUpdated",
            new SensorStatsUpdatedEvent(
                data.SensorId,
                data.Fps,
                data.QueueSize,
                data.MqttConnected,
                data.Published,
                data.Dropped,
                data.TracksActiveTotal,
                data.TracksConfirmed,
                data.TracksLost,
                data.TracksTentative,
                data.TsUtc),
            ct);

        await _influx.WriteStatsAsync(data);
    }
}
