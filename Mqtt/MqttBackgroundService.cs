namespace HighwayServer.Mqtt;

/// <summary>
/// Thin IHostedService wrapper that starts/stops MqttClientService.
/// MqttClientService is itself a BackgroundService but is registered as a singleton
/// so other services can inject IMqttClientService for publishing.
/// </summary>
public sealed class MqttBackgroundService : IHostedService
{
    private readonly MqttClientService _client;

    public MqttBackgroundService(MqttClientService client) => _client = client;

    public Task StartAsync(CancellationToken ct) => _client.StartAsync(ct);
    public Task StopAsync(CancellationToken ct)  => _client.StopAsync(ct);
}
