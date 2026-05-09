namespace HighwayServer.Contracts.SignalR;

public sealed record SensorStatusChangedEvent(string SensorId, string Status, DateTimeOffset TsUtc);
