namespace HighwayServer.Models;

public sealed record VehicleEventRecord(
    DateTimeOffset Ts,
    string SensorId,
    int TrackId,
    string VehicleClass,
    string EventType);
