namespace HighwayServer.Mqtt;

public sealed class MqttOptions
{
    public const string Section = "Mqtt";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 1883;
    public string ClientId { get; set; } = "HighwayServer";
    public string? Username { get; set; }
    public string? Password { get; set; }
    public int ReconnectDelaySeconds { get; set; } = 5;
}
