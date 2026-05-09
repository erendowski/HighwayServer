namespace HighwayServer.Contracts.SignalR;

public sealed record HeartbeatReceivedEvent(string SensorId, bool Alive, DateTimeOffset TsUtc);
