using System.Collections.Concurrent;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using HighwayServer.Options;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace HighwayServer.Services;

public sealed class AnomalyDetector
{
    private sealed class TrackWindow
    {
        public float    LastSpeedKmh  { get; set; } = float.NaN;
        public DateTime LastSampleAt  { get; set; } = DateTime.MinValue;
        public DateTime? StoppedSince { get; set; }
        // anomalyType → last fired UTC
        public Dictionary<string, DateTime> Debounce { get; } = new(StringComparer.Ordinal);
    }

    // sensorId → trackId → window
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<int, TrackWindow>> _windows = new();

    private readonly IHubContext<TelemetryHub> _hub;
    private readonly InfluxService             _influx;
    private readonly IOptionsMonitor<AnomalyThresholds> _options;
    private readonly ILogger<AnomalyDetector>  _logger;

    public AnomalyDetector(
        IHubContext<TelemetryHub>            hub,
        InfluxService                        influx,
        IOptionsMonitor<AnomalyThresholds>   options,
        ILogger<AnomalyDetector>             logger)
    {
        _hub     = hub;
        _influx  = influx;
        _options = options;
        _logger  = logger;
    }

    public async Task EvaluateAsync(
        string sensorId, int trackId, string vehicleClass,
        float speedKmh, DateTimeOffset ts, CancellationToken ct)
    {
        var t = _options.CurrentValue;
        var sensorWindows = _windows.GetOrAdd(sensorId, _ => new());
        var window = sensorWindows.GetOrAdd(trackId, _ => new TrackWindow());

        var now = ts.UtcDateTime;
        var toFire = new List<(string type, string severity, float? delta)>();

        lock (window)
        {
            // Delta speed per second (only meaningful if recent)
            float? deltaPerSec = null;
            if (!float.IsNaN(window.LastSpeedKmh) && window.LastSampleAt != DateTime.MinValue)
            {
                var dt = (now - window.LastSampleAt).TotalSeconds;
                if (dt > 0 && dt < 5.0)
                    deltaPerSec = (speedKmh - window.LastSpeedKmh) / (float)dt;
            }

            // STOPPED — vehicle below threshold long enough
            if (speedKmh < t.StoppedSpeedKmh)
            {
                window.StoppedSince ??= now;
                if ((now - window.StoppedSince.Value).TotalSeconds >= t.StoppedDurationSec)
                    Enqueue("STOPPED", "critical", null);
            }
            else
            {
                window.StoppedSince = null;
            }

            // EXTREME_FAST / FAST (mutually exclusive)
            if (speedKmh > t.ExtremeFastSpeedKmh)
                Enqueue("EXTREME_FAST", "critical", null);
            else if (speedKmh > t.FastSpeedKmh)
                Enqueue("FAST", "high", null);

            // SLOW — only when not stopped
            if (speedKmh >= t.StoppedSpeedKmh && speedKmh < t.SlowSpeedKmh)
                Enqueue("SLOW", "medium", null);

            // Sudden brake / accel
            if (deltaPerSec.HasValue)
            {
                if (deltaPerSec.Value < t.SuddenBrakeDeltaKmhPerSec)
                    Enqueue("SUDDEN_BRAKE", "high", deltaPerSec);
                else if (deltaPerSec.Value > t.SuddenAccelDeltaKmhPerSec)
                    Enqueue("SUDDEN_ACCEL", "medium", deltaPerSec);
            }

            window.LastSpeedKmh = speedKmh;
            window.LastSampleAt = now;

            void Enqueue(string type, string severity, float? delta)
            {
                var debounceSpan = TimeSpan.FromSeconds(t.DebounceSec);
                if (!window.Debounce.TryGetValue(type, out var lastFired) ||
                    (now - lastFired) >= debounceSpan)
                {
                    window.Debounce[type] = now;
                    toFire.Add((type, severity, delta));
                }
            }
        }

        foreach (var (type, severity, delta) in toFire)
        {
            var evt = new AnomalyDetectedEvent(
                sensorId, trackId, vehicleClass, type, severity,
                speedKmh, delta, 1.0f, ts);

            await _hub.Clients.All.SendAsync("anomalydetected", evt, ct);
            await _influx.WriteAnomalyAsync(sensorId, trackId, vehicleClass, type, severity, speedKmh, delta, ts);

            _logger.LogInformation(
                "[Anomaly] {Type} sensor={SensorId} track={TrackId} class={Class} speed={Speed}",
                type, sensorId, trackId, vehicleClass, speedKmh);
        }
    }

    public void RemoveTrack(string sensorId, int trackId)
    {
        if (_windows.TryGetValue(sensorId, out var sw))
            sw.TryRemove(trackId, out _);
    }

    public void RemoveSensor(string sensorId) =>
        _windows.TryRemove(sensorId, out _);
}
