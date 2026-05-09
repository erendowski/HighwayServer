using System.Text.Json;
using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Http;

public sealed record CommandRequest
{
    [JsonPropertyName("command")]
    public string Command { get; init; } = string.Empty;

    [JsonPropertyName("parameters")]
    public JsonElement? Parameters { get; init; }
}
