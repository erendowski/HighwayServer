using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record SensorStatusPayload : BasePayload
{
    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;
}
