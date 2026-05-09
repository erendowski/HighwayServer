using System.Text.Json.Serialization;

namespace HighwayServer.Contracts.Mqtt;

public sealed record StatsPayload : BasePayload
{
    [JsonPropertyName("fps")]
    public float Fps { get; init; }

    [JsonPropertyName("queue_size")]
    public int QueueSize { get; init; }

    [JsonPropertyName("mqtt_connected")]
    public bool MqttConnected { get; init; }

    [JsonPropertyName("published")]
    public int Published { get; init; }

    [JsonPropertyName("dropped")]
    public int Dropped { get; init; }

    [JsonPropertyName("events_published")]
    public int EventsPublished { get; init; }

    [JsonPropertyName("tracks_confirmed")]
    public int TracksConfirmed { get; init; }

    [JsonPropertyName("tracks_lost")]
    public int TracksLost { get; init; }

    [JsonPropertyName("tracks_tentative")]
    public int TracksTentative { get; init; }

    [JsonPropertyName("tracks_active_total")]
    public int TracksActiveTotal { get; init; }
}
