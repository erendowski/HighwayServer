using System.Text;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Protocol;

namespace HighwayServer.Mqtt;

public sealed class MqttClientService : BackgroundService, IMqttClientService
{
    private readonly MqttOptions _opts;
    private readonly MqttTopicRouter _router;
    private readonly ILogger<MqttClientService> _logger;
    private readonly IMqttClient _mqttClient;

    // Reset at the start of every connect attempt so the router loop can wait on it.
    private TaskCompletionSource _disconnectedTcs =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    public bool IsConnected => _mqttClient.IsConnected;

    public MqttClientService(
        IOptions<MqttOptions> opts,
        MqttTopicRouter router,
        ILogger<MqttClientService> logger)
    {
        _opts   = opts.Value;
        _router = router;
        _logger = logger;
        _mqttClient = new MqttFactory().CreateMqttClient();

        _mqttClient.DisconnectedAsync += _ =>
        {
            _disconnectedTcs.TrySetResult();
            return Task.CompletedTask;
        };

        _mqttClient.ApplicationMessageReceivedAsync += e =>
        {
            var topic = e.ApplicationMessage.Topic;
            // MQTTnet pooled buffer'ı geri alıyor — Task.Run'a vermeden ÖNCE kopyala.
            // Aksi halde async handler çalıştığında payload bozuk olur, JSON parse fail eder
            // ve telemetri sessizce düşer.
            ReadOnlyMemory<byte> payload = e.ApplicationMessage.PayloadSegment.ToArray();

            _ = Task.Run(async () =>
            {
                try
                {
                    await _router.RouteAsync(topic, payload, CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unhandled error routing MQTT message on topic {Topic}", topic);
                }
            });

            return Task.CompletedTask;
        };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var willPayload = Encoding.UTF8.GetBytes(
            "{\"status\":\"offline\",\"client\":\"HighwayServer\"}");

        var optionsBuilder = new MqttClientOptionsBuilder()
            .WithTcpServer(_opts.Host, _opts.Port)
            .WithClientId(_opts.ClientId)
            .WithKeepAlivePeriod(TimeSpan.FromSeconds(30))
            .WithWillTopic("highway/server/status")
            .WithWillPayload(willPayload)
            .WithWillQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
            .WithWillRetain(true);

        if (!string.IsNullOrEmpty(_opts.Username))
            optionsBuilder = optionsBuilder.WithCredentials(_opts.Username, _opts.Password);

        var connectOptions = optionsBuilder.Build();

        var subOptions = new MqttFactory().CreateSubscribeOptionsBuilder()
            .WithTopicFilter(f => f
                .WithTopic("highway/#")
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce))
            .Build();

        while (!stoppingToken.IsCancellationRequested)
        {
            // Fresh TCS for this connection attempt — avoids ghost-disconnect from prior iteration.
            _disconnectedTcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            try
            {
                await _mqttClient.ConnectAsync(connectOptions, stoppingToken);
                _logger.LogInformation("MQTT connected to {Host}:{Port}", _opts.Host, _opts.Port);
                await _mqttClient.SubscribeAsync(subOptions, stoppingToken);

                // Block until the broker drops us or the app shuts down.
                await Task.WhenAny(_disconnectedTcs.Task, Task.Delay(Timeout.Infinite, stoppingToken));

                if (stoppingToken.IsCancellationRequested) break;

                _logger.LogWarning("MQTT disconnected, retrying in {N}s", _opts.ReconnectDelaySeconds);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MQTT disconnected, retrying in {N}s", _opts.ReconnectDelaySeconds);
                if (_mqttClient.IsConnected)
                    await _mqttClient.DisconnectAsync();
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_opts.ReconnectDelaySeconds), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        if (_mqttClient.IsConnected)
            await _mqttClient.DisconnectAsync();
    }

    public async Task PublishAsync(
        string topic,
        string jsonPayload,
        int qos = 1,
        bool retain = false,
        CancellationToken ct = default)
    {
        if (!_mqttClient.IsConnected)
            throw new InvalidOperationException("MQTT client is not connected");

        var message = new MqttApplicationMessageBuilder()
            .WithTopic(topic)
            .WithPayload(Encoding.UTF8.GetBytes(jsonPayload))
            .WithQualityOfServiceLevel((MqttQualityOfServiceLevel)qos)
            .WithRetainFlag(retain)
            .Build();

        await _mqttClient.PublishAsync(message, ct);
    }
}
