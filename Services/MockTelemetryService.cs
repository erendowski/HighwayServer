using HighwayServer.Hubs;
using HighwayServer.Models;
using Microsoft.AspNetCore.SignalR;

namespace HighwayServer.Services;

public class MockTelemetryService : BackgroundService
{
    private readonly IHubContext<TelemetryHub> _hub;
    private readonly Random _rnd = new();
    private static readonly string[] Classes = ["car", "truck", "bus", "motorcycle"];

    public MockTelemetryService(IHubContext<TelemetryHub> hub) => _hub = hub;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var msg = new TelemetryMessage
            {
                VehicleId = $"V{_rnd.Next(100, 999)}",
                TrackId   = _rnd.Next(1, 5),
                Class     = Classes[_rnd.Next(Classes.Length)],
                Speed     = Math.Round(_rnd.NextDouble() * 120 + 20, 1),
                Timestamp = DateTime.UtcNow,
            };

            await _hub.Clients.All.SendAsync("telemetry", msg, stoppingToken);
            await Task.Delay(1000, stoppingToken);
        }
    }
}
