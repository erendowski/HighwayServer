namespace HighwayServer.Contracts.Http;

public sealed record CommandAck(
    string CorrelationId,
    string SensorId,
    string Command,
    string Status,
    DateTimeOffset TsUtc);
