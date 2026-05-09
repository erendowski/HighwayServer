namespace HighwayServer.Services;

public sealed class SensorPruningService : BackgroundService
{
    private readonly SensorStateStore _store;
    private readonly ILogger<SensorPruningService> _logger;

    public SensorPruningService(SensorStateStore store, ILogger<SensorPruningService> logger)
    {
        _store  = store;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(30), ct);
            _store.PruneStale();
            _logger.LogDebug("Stale sensor prune completed");
        }
    }
}
