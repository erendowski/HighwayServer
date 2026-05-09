namespace HighwayServer.Models;

public sealed record StatsRecord(
    DateTimeOffset Ts,
    string SensorId,
    float Fps,
    int TracksActiveTotal,
    int Published,
    int Dropped,
    int QueueSize);
