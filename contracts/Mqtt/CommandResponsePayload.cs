using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record CommandResponsePayload : BasePayload
{
    [JsonPropertyName("correlation_id")]
    public string CorrelationId { get; init; } = string.Empty;

    [JsonPropertyName("command")]
    public string Command { get; init; } = string.Empty;

    [JsonPropertyName("ok")]
    public bool Ok { get; init; }

    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;
}
