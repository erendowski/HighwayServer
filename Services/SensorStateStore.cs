using System.Collections.Concurrent;
using HighwayServer.Contracts.Mqtt;

namespace HighwayServer.Services;

public sealed class SensorState
{
    public string SensorId { get; set; } = string.Empty;
    public string Status { get; set; } = "unknown";
    public DateTimeOffset LastStatusAt { get; set; }
    public DateTimeOffset LastHeartbeatAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public SensorMetaPayload? Meta { get; set; }
    public StatsPayload? LastStats { get; set; }
}

public sealed class SensorStateStore
{
    private readonly ConcurrentDictionary<string, SensorState> _sensors = new();

    public void UpdateStatus(string sensorId, string status, DateTimeOffset ts)
    {
        var s = _sensors.GetOrAdd(sensorId, _ => new SensorState { SensorId = sensorId });
        s.Status       = status;
        s.LastStatusAt = ts;
        s.LastSeenAt   = ts;
    }

    public void UpdateMeta(string sensorId, SensorMetaPayload meta)
    {
        var s = _sensors.GetOrAdd(sensorId, _ => new SensorState { SensorId = sensorId });
        s.Meta       = meta;
        s.LastSeenAt = meta.TsUtc;
    }

    public void UpdateHeartbeat(string sensorId, DateTimeOffset ts)
    {
        var s = _sensors.GetOrAdd(sensorId, _ => new SensorState { SensorId = sensorId });
        s.LastHeartbeatAt = ts;
        s.LastSeenAt      = ts;
    }

    public void UpdateStats(string sensorId, StatsPayload stats)
    {
        var s = _sensors.GetOrAdd(sensorId, _ => new SensorState { SensorId = sensorId });
        s.LastStats  = stats;
        s.LastSeenAt = stats.TsUtc;
    }

    public void Touch(string sensorId, DateTimeOffset ts)
    {
        var s = _sensors.GetOrAdd(sensorId, _ => new SensorState { SensorId = sensorId });
        s.LastSeenAt = ts;
    }

    public IReadOnlyList<SensorState> GetAll() =>
        _sensors.Values.ToList();

    public SensorState? GetById(string sensorId) =>
        _sensors.TryGetValue(sensorId, out var s) ? s : null;

    public void PruneStale()
    {
        var cutoff = DateTimeOffset.UtcNow.AddSeconds(-60);
        foreach (var state in _sensors.Values)
        {
            if (state.LastSeenAt < cutoff)
                state.Status = "offline";
        }
    }
}
