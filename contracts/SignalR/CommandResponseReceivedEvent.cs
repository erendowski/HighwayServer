namespace HighwayServer.Contracts.SignalR;

public sealed record CommandResponseReceivedEvent(
    string SensorId,
    string CorrelationId,
    string Command,
    bool Ok,
    string Message,
    DateTimeOffset TsUtc);
