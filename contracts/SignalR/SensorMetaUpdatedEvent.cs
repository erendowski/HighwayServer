namespace HighwayServer.Contracts.SignalR;

public sealed record SensorMetaUpdatedEvent(
    string SensorId,
    object Device,
    object Capabilities,
    DateTimeOffset TsUtc);
