using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record DetectedObject
{
    [JsonPropertyName("track_id")]
    public int TrackId { get; init; }

    [JsonPropertyName("class")]
    public string Class { get; init; } = string.Empty;

    [JsonPropertyName("confidence")]
    public float Confidence { get; init; }

    [JsonPropertyName("bbox")]
    public int[] Bbox { get; init; } = [];

    [JsonPropertyName("track_state")]
    public string TrackState { get; init; } = string.Empty;

    [JsonPropertyName("speed_kmh")]
    public float? SpeedKmh { get; init; }
}

public sealed record DetectionPayload : BasePayload
{
    [JsonPropertyName("frame_id")]
    public int FrameId { get; init; }

    [JsonPropertyName("fps")]
    public float Fps { get; init; }

    [JsonPropertyName("objects")]
    public DetectedObject[] Objects { get; init; } = [];
}
