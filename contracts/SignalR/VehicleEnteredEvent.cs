namespace HighwayServer.Contracts.SignalR;

public sealed record VehicleEnteredEvent(string SensorId, int TrackId, string VehicleClass, DateTimeOffset TsUtc);
