using HighwayServer.Contracts.SignalR;
using HighwayServer.Services;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Hubs;

public sealed class TelemetryHub : Hub
{
    private readonly SensorStateStore    _sensorStore;
    private readonly StreamStatusService _streamStatus;
    private readonly ILogger<TelemetryHub> _logger;

    public TelemetryHub(
        SensorStateStore    sensorStore,
        StreamStatusService streamStatus,
        ILogger<TelemetryHub> logger)
    {
        _sensorStore  = sensorStore;
        _streamStatus = streamStatus;
        _logger       = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var sensorId = Context.GetHttpContext()?.Request.Query["sensorId"].ToString();

        if (!string.IsNullOrEmpty(sensorId))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"sensor:{sensorId}");

        await Groups.AddToGroupAsync(Context.ConnectionId, "all");

        await Clients.Caller.SendAsync("InitialState", new { sensors = _sensorStore.GetAll() });

        // Yeni bağlanan client mevcut stream durumunu hemen alsın.
        // StreamStatusService sadece durum değişiminde broadcast eder;
        // stream zaten hazırken bağlanan client'lar bu event'i kaçırır.
        var (ready, since) = _streamStatus.CurrentStatus;
        await Clients.Caller.SendAsync(
            "streamstatuschanged",
            new StreamStatusChangedEvent(ready, "highway", since));

        _logger.LogInformation("Client connected: {ConnectionId}, sensorId={SensorId}",
            Context.ConnectionId, sensorId ?? "all");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var sensorId = Context.GetHttpContext()?.Request.Query["sensorId"].ToString();

        if (!string.IsNullOrEmpty(sensorId))
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"sensor:{sensorId}");

        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>Client calls this to subscribe to a specific sensor's events at runtime.</summary>
    public Task SubscribeToSensor(string sensorId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"sensor:{sensorId}");

    /// <summary>Client calls this to stop receiving a specific sensor's events.</summary>
    public Task UnsubscribeFromSensor(string sensorId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, $"sensor:{sensorId}");
}
