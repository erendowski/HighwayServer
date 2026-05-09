using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record EventObject
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
}

public sealed record VehicleEventPayload : BasePayload
{
    [JsonPropertyName("frame_id")]
    public int FrameId { get; init; }

    [JsonPropertyName("object")]
    public EventObject Object { get; init; } = new();
}
