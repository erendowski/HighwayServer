namespace HighwayServer.Contracts.SignalR;

public sealed record AnomalyDetectedEvent(
    string SensorId,
    int TrackId,
    string VehicleClass,
    string AnomalyType,
    string Severity,
    float SpeedKmh,
    float? Delta,
    float Confidence,
    DateTimeOffset TsUtc);
