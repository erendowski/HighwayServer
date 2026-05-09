using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public abstract record BasePayload
{
    [JsonPropertyName("schema_version")]
    public int SchemaVersion { get; init; }

    [JsonPropertyName("sensor_id")]
    public string SensorId { get; init; } = string.Empty;

    [JsonPropertyName("ts_utc")]
    public DateTimeOffset TsUtc { get; init; }
}
