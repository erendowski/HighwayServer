using System.Text.Json;
using HighwayServer.Contracts.SignalR;
using HighwayServer.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Services;

public sealed class StreamStatusService : BackgroundService
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private readonly IHubContext<TelemetryHub> _hub;
    private readonly IHttpClientFactory        _httpFactory;
    private readonly ILogger<StreamStatusService> _logger;

    private bool?           _lastReady;
    private DateTimeOffset  _since = DateTimeOffset.UtcNow;

    private const string MediaMtxApiUrl  = "http://mediamtx:9997/v3/paths/list";
    private const string WatchedPath     = "highway";
    private const int    PollIntervalMs  = 2000;

    public StreamStatusService(
        IHubContext<TelemetryHub>  hub,
        IHttpClientFactory         httpFactory,
        ILogger<StreamStatusService> logger)
    {
        _hub         = hub;
        _httpFactory = httpFactory;
        _logger      = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var client = _httpFactory.CreateClient("mediamtx");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var response = await client.GetAsync(MediaMtxApiUrl, stoppingToken);
                if (response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(stoppingToken);
                    var doc  = JsonDocument.Parse(body);

                    bool ready = false;
                    if (doc.RootElement.TryGetProperty("items", out var items))
                    {
                        foreach (var item in items.EnumerateArray())
                        {
                            if (item.TryGetProperty("name", out var nameEl) &&
                                nameEl.GetString() == WatchedPath &&
                                item.TryGetProperty("ready", out var readyEl) &&
                                readyEl.GetBoolean())
                            {
                                ready = true;
                                break;
                            }
                        }
                    }

                    if (_lastReady != ready)
                    {
                        _since     = DateTimeOffset.UtcNow;
                        _lastReady = ready;
                        await _hub.Clients.All.SendAsync(
                            "streamstatuschanged",
                            new StreamStatusChangedEvent(ready, WatchedPath, _since),
                            stoppingToken);
                        _logger.LogInformation("[Stream] highway path ready={Ready}", ready);
                    }
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // mediamtx might not be up yet — silently retry
                _logger.LogDebug("[Stream] mediamtx poll failed: {Msg}", ex.Message);
                if (_lastReady != false)
                {
                    _lastReady = false;
                    _since     = DateTimeOffset.UtcNow;
                    await _hub.Clients.All.SendAsync(
                        "streamstatuschanged",
                        new StreamStatusChangedEvent(false, WatchedPath, _since),
                        stoppingToken);
                }
            }

            await Task.Delay(PollIntervalMs, stoppingToken);
        }
    }

    // Used by StreamController for instant GET
    public (bool Ready, DateTimeOffset Since) CurrentStatus =>
        (_lastReady ?? false, _since);
}
