namespace HighwayServer.Models;

public sealed record AnomalyRecord(
    DateTimeOffset Ts,
    string SensorId,
    int TrackId,
    string VehicleClass,
    string AnomalyType,
    string Severity,
    float SpeedKmh,
    float? Delta);
