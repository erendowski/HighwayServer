namespace HighwayServer.Contracts.SignalR;

public sealed record SensorStatsUpdatedEvent(
    string SensorId,
    float Fps,
    int QueueSize,
    bool MqttConnected,
    int Published,
    int Dropped,
    int TracksActiveTotal,
    int TracksConfirmed,
    int TracksLost,
    int TracksTentative,
    DateTimeOffset TsUtc);
