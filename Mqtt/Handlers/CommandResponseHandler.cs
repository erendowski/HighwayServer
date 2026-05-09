using System.Text.Json;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Mqtt.Handlers;

public sealed class CommandResponseHandler : IMqttMessageHandler
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly IHubContext<TelemetryHub> _hub;
    private readonly ILogger<CommandResponseHandler> _logger;

    public string TopicPattern => "highway/commands/+/response";

    public CommandResponseHandler(
        IHubContext<TelemetryHub> hub,
        ILogger<CommandResponseHandler> logger)
    {
        _hub    = hub;
        _logger = logger;
    }

    public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        var data = JsonSerializer.Deserialize<CommandResponsePayload>(payload.Span, _jsonOpts);
        if (data is null || data.SchemaVersion != 1)
        {
            _logger.LogWarning("[CommandResponseHandler] Invalid payload on {Topic}", topic);
            return;
        }

        await _hub.Clients.All.SendAsync(
            "CommandResponseReceived",
            new CommandResponseReceivedEvent(
                data.SensorId,
                data.CorrelationId,
                data.Command,
                data.Ok,
                data.Message,
                data.TsUtc),
            ct);

        _logger.LogInformation(
            "Command response: sensor={SensorId} cmd={Command} correlationId={CorrelationId} ok={Ok} msg={Message}",
            data.SensorId, data.Command, data.CorrelationId, data.Ok, data.Message);
    }
}
