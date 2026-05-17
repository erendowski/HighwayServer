namespace HighwayServer.Contracts.SignalR;

public sealed record DetectionsUpdatedEvent(
    string SensorId,
    int FrameId,
    float Fps,
    IReadOnlyList<DetectedObjectDto> Objects,
    DateTimeOffset TsUtc);

public sealed record DetectedObjectDto(
    int TrackId,
    string VehicleClass,
    float Confidence,
    int[] Bbox,
    string TrackState,
    float? SpeedKmh);
