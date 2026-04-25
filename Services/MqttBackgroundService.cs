using System.Text.Json;
using HighwayServer.Hubs;
using HighwayServer.Models;
using Microsoft.AspNetCore.SignalR;
using MQTTnet;
using MQTTnet.Client;

namespace HighwayServer.Services;

public class MqttBackgroundService : BackgroundService
{
    private readonly IConfiguration _config;
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly InfluxService _influx;
    private readonly ILogger<MqttBackgroundService> _logger;

    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public MqttBackgroundService(
        IConfiguration config,
        IHubContext<TelemetryHub> hub,
        InfluxService influx,
        ILogger<MqttBackgroundService> logger)
    {
        _config  = config;
        _hub     = hub;
        _influx  = influx;
        _logger  = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var cfg  = _config.GetSection("Mqtt");
        var host = cfg["Host"] ?? "localhost";
        var port = cfg.GetValue("Port", 1883);

        var factory = new MqttFactory();
        using var client = factory.CreateMqttClient();

        var options = new MqttClientOptionsBuilder()
            .WithTcpServer(host, port)
            .WithClientId(cfg["ClientId"] ?? "HighwayServer")
            .WithKeepAlivePeriod(TimeSpan.FromSeconds(30))
            .Build();

        client.ApplicationMessageReceivedAsync += async e =>
        {
            try
            {
                var payload = e.ApplicationMessage.ConvertPayloadToString();
                var msg = JsonSerializer.Deserialize<TelemetryMessage>(payload, _jsonOpts);
                if (msg is null) return;

                await Task.WhenAll(
                    _influx.WriteAsync(msg),
                    _hub.Clients.All.SendAsync("telemetry", msg, stoppingToken));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message on {Topic}",
                    e.ApplicationMessage.Topic);
            }
        };

        client.DisconnectedAsync += async e =>
        {
            if (stoppingToken.IsCancellationRequested) return;
            _logger.LogWarning("MQTT disconnected — reconnecting in 5 s...");
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            try   { await client.ConnectAsync(options, stoppingToken); }
            catch (Exception ex) { _logger.LogError(ex, "MQTT reconnect failed"); }
        };

        // Initial connect with retry
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await client.ConnectAsync(options, stoppingToken);
                _logger.LogInformation("MQTT connected to {Host}:{Port}", host, port);
                break;
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "MQTT connect failed — retrying in 5 s...");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        var subOptions = factory.CreateSubscribeOptionsBuilder()
            .WithTopicFilter(f => f.WithTopic("highway/detections/#"))
            .Build();

        await client.SubscribeAsync(subOptions, stoppingToken);
        _logger.LogInformation("Subscribed to highway/detections/#");

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
