using System.Text.Json;
using HighwayServer.Contracts.Http;
using HighwayServer.Contracts.Mqtt;
using HighwayServer.Mqtt;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HighwayServer.Controllers;

[ApiController]
[Route("api/sensors/{sensorId}/commands")]
public sealed class CommandsController : ControllerBase
{
    private readonly IMqttClientService _mqtt;
    private readonly ILogger<CommandsController> _logger;

    public CommandsController(IMqttClientService mqtt, ILogger<CommandsController> logger)
    {
        _mqtt   = mqtt;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/sensors/{sensorId}/commands
    /// Publishes a command request to the Jetson. The response arrives asynchronously
    /// via SignalR "CommandResponseReceived" matched by correlationId.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting("commands")]
    public async Task<IActionResult> Post(
        string sensorId,
        [FromBody] CommandRequest body,
        CancellationToken ct)
    {
        if (string.IsNullOrEmpty(body.Command))
            return BadRequest(new { error = "Command must not be empty" });

        var correlationId = Guid.NewGuid().ToString("N");

        var mqttPayload = new CommandRequestPayload
        {
            CorrelationId = correlationId,
            Command       = body.Command,
            Parameters    = body.Parameters,
        };

        var json = JsonSerializer.Serialize(mqttPayload);

        try
        {
            await _mqtt.PublishAsync(
                $"highway/commands/{sensorId}/request",
                json,
                qos:    1,
                retain: false,
                ct:     ct);
        }
        catch (InvalidOperationException)
        {
            return StatusCode(503, new { error = "MQTT broker not connected" });
        }

        _logger.LogInformation(
            "Command published: sensor={SensorId} cmd={Command} correlationId={CorrelationId}",
            sensorId, body.Command, correlationId);

        return Accepted(new CommandAck(correlationId, sensorId, body.Command, "published", DateTimeOffset.UtcNow));
    }
}
