using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record HeartbeatPayload : BasePayload
{
    [JsonPropertyName("alive")]
    public bool Alive { get; init; }
}
