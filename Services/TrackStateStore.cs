using System.Collections.Concurrent;
using HighwayServer.Contracts.Mqtt;

namespace HighwayServer.Services;

public sealed class TrackState
{
    public string SensorId { get; set; } = string.Empty;
    public int TrackId { get; set; }
    public string VehicleClass { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public int[] Bbox { get; set; } = Array.Empty<int>();
    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
}

public sealed class TrackStateStore
{
    // Outer key = sensorId, inner key = trackId.
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<int, TrackState>> _tracks = new();

    public void Upsert(string sensorId, DetectedObject obj, DateTimeOffset ts)
    {
        var sensorTracks = _tracks.GetOrAdd(sensorId, _ => new ConcurrentDictionary<int, TrackState>());
        var track = sensorTracks.GetOrAdd(obj.TrackId, _ => new TrackState
        {
            SensorId    = sensorId,
            TrackId     = obj.TrackId,
            FirstSeenAt = ts,
        });
        track.VehicleClass = obj.Class;
        track.Confidence   = obj.Confidence;
        track.Bbox         = obj.Bbox;
        track.LastSeenAt   = ts;
    }

    public void Remove(string sensorId, int trackId)
    {
        if (_tracks.TryGetValue(sensorId, out var sensorTracks))
            sensorTracks.TryRemove(trackId, out _);
    }

    public IReadOnlyList<TrackState> GetActive(string sensorId)
    {
        if (!_tracks.TryGetValue(sensorId, out var sensorTracks))
            return Array.Empty<TrackState>();
        return sensorTracks.Values.ToList();
    }

    public IReadOnlyList<TrackState> GetAllActive() =>
        _tracks.Values.SelectMany(d => d.Values).ToList();

    public void PruneSensor(string sensorId) =>
        _tracks.TryRemove(sensorId, out _);
}
