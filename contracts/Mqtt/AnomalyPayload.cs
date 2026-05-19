using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record AnomalyObject
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = string.Empty;

    [JsonPropertyName("severity")]
    public string Severity { get; init; } = string.Empty;

    [JsonPropertyName("track_id")]
    public int? TrackId { get; init; }

    [JsonPropertyName("involved_track_ids")]
    public int[]? InvolvedTrackIds { get; init; }

    [JsonPropertyName("class_name")]
    public string ClassName { get; init; } = string.Empty;

    [JsonPropertyName("speed_kmh")]
    public float SpeedKmh { get; init; }

    [JsonPropertyName("duration_sec")]
    public float DurationSec { get; init; }

    [JsonPropertyName("world_x")]
    public float WorldX { get; init; }

    [JsonPropertyName("world_y")]
    public float WorldY { get; init; }

    [JsonPropertyName("bbox")]
    public int[] Bbox { get; init; } = [];

    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;

    [JsonPropertyName("anomaly_id")]
    public string AnomalyId { get; init; } = string.Empty;

    [JsonPropertyName("proximity_m")]
    public float? ProximityM { get; init; }

    [JsonPropertyName("decel_kmh")]
    public float? DecelKmh { get; init; }
}

public sealed record AnomalyPayload : BasePayload
{
    [JsonPropertyName("frame_id")]
    public int FrameId { get; init; }

    [JsonPropertyName("anomalies")]
    public AnomalyObject[] Anomalies { get; init; } = [];
}
