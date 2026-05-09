namespace HighwayServer.Contracts.SignalR;

public sealed record VehicleExitedEvent(string SensorId, int TrackId, string VehicleClass, DateTimeOffset TsUtc);
