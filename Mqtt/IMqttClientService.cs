namespace HighwayServer.Mqtt;

public interface IMqttClientService
{
    bool IsConnected { get; }
    Task PublishAsync(string topic, string jsonPayload, int qos = 1, bool retain = false, CancellationToken ct = default);
}
