namespace HighwayServer.Models;

public sealed record DetectionRecord(
    DateTimeOffset Ts,
    string SensorId,
    int TrackId,
    string VehicleClass,
    string TrackState,
    float Confidence,
    int BboxX,
    int BboxY,
    int BboxW,
    int BboxH,
    int FrameId);
