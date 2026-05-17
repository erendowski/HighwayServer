namespace HighwayServer.Contracts.SignalR;

public sealed record StreamStatusChangedEvent(
    bool Ready,
    string Path,
    DateTimeOffset Since);
