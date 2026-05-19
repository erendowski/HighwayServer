using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class AnomalyHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly IHubContext<TelemetryHub> _hub;
    private readonly InfluxService _influx;
    private readonly ILogger<AnomalyHandler> _logger;

    public string TopicPattern => "highway/anomalies/+/detections";

    public AnomalyHandler(
        IHubContext<TelemetryHub> hub,
        InfluxService influx,
        ILogger<AnomalyHandler> logger)
    {
        _hub    = hub;
        _influx = influx;
        _logger = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<AnomalyPayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[AnomalyHandler] Invalid payload on {Topic}", topic);
            return;
        }

        foreach (var a in data.Anomalies)
        {
            // POSSIBLE_ACCIDENT has no single track_id — use first involved or 0
            var trackId = a.TrackId
                ?? a.InvolvedTrackIds?.FirstOrDefault()
                ?? 0;

            var evt = new AnomalyDetectedEvent(
                SensorId:     data.SensorId,
                TrackId:      trackId,
                VehicleClass: a.ClassName,
                AnomalyType:  a.Type,
                Severity:     a.Severity,
                SpeedKmh:     a.SpeedKmh,
                Delta:        a.DecelKmh,
                Confidence:   1.0f,
                TsUtc:        data.TsUtc);

            await _hub.Clients.All.SendAsync("anomalydetected", evt, ct);
            await _influx.WriteAnomalyAsync(
                data.SensorId, trackId, a.ClassName,
                a.Type, a.Severity, a.SpeedKmh, a.DecelKmh, data.TsUtc);

            _logger.LogInformation(
                "[AnomalyHandler] {Type} sensor={SensorId} track={TrackId} class={Class} speed={Speed} severity={Severity}",
                a.Type, data.SensorId, trackId, a.ClassName, a.SpeedKmh, a.Severity);
        }
    }
}
