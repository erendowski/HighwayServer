using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record DeviceInfo
{
    [JsonPropertyName("hostname")]
    public string Hostname { get; init; } = string.Empty;

    [JsonPropertyName("platform")]
    public string Platform { get; init; } = string.Empty;
}

public sealed record SensorCapabilities
{
    [JsonPropertyName("detections")]
    public bool Detections { get; init; }

    [JsonPropertyName("events_enter_exit")]
    public bool EventsEnterExit { get; init; }

    [JsonPropertyName("commands")]
    public bool Commands { get; init; }

    [JsonPropertyName("stats")]
    public bool Stats { get; init; }

    [JsonPropertyName("heartbeat")]
    public bool Heartbeat { get; init; }
}

public sealed record SensorMetaPayload : BasePayload
{
    [JsonPropertyName("device")]
    public DeviceInfo Device { get; init; } = new();

    [JsonPropertyName("capabilities")]
    public SensorCapabilities Capabilities { get; init; } = new();
}
