using System.Text.Json;
using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record CommandRequestPayload
{
    [JsonPropertyName("correlation_id")]
    public string CorrelationId { get; init; } = string.Empty;

    [JsonPropertyName("command")]
    public string Command { get; init; } = string.Empty;

    [JsonPropertyName("parameters")]
    public JsonElement? Parameters { get; init; }
}
