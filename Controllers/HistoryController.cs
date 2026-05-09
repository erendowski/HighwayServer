using HighwayServer.Models;
using HighwayServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace HighwayServer.Controllers;

[ApiController]
[Route("api/sensors/{sensorId}/history")]
public sealed class HistoryController : ControllerBase
{
    private readonly InfluxService _influx;
    private readonly ILogger<HistoryController> _logger;

    public HistoryController(InfluxService influx, ILogger<HistoryController> logger)
    {
        _influx = influx;
        _logger = logger;
    }

    /// <summary>GET /api/sensors/{sensorId}/history/detections</summary>
    [HttpGet("detections")]
    public async Task<IActionResult> GetDetections(
        string sensorId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery(Name = "class")] string? vehicleClass)
    {
        var start = from ?? DateTimeOffset.UtcNow.AddHours(-1);
        var end   = to   ?? DateTimeOffset.UtcNow;
        try
        {
            var data = await _influx.QueryDetectionsAsync(sensorId, start, end, vehicleClass);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Detection query failed for sensor {SensorId}", sensorId);
            return StatusCode(500, new { error = "Query failed" });
        }
    }

    /// <summary>GET /api/sensors/{sensorId}/history/stats</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(
        string sensorId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to)
    {
        var start = from ?? DateTimeOffset.UtcNow.AddHours(-1);
        var end   = to   ?? DateTimeOffset.UtcNow;
        try
        {
            var data = await _influx.QueryStatsAsync(sensorId, start, end);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Stats query failed for sensor {SensorId}", sensorId);
            return StatusCode(500, new { error = "Query failed" });
        }
    }

    /// <summary>GET /api/sensors/{sensorId}/events (absolute — not under /history/)</summary>
    [HttpGet("/api/sensors/{sensorId}/events")]
    public async Task<IActionResult> GetEvents(
        string sensorId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to)
    {
        var start = from ?? DateTimeOffset.UtcNow.AddHours(-1);
        var end   = to   ?? DateTimeOffset.UtcNow;
        try
        {
            var data = await _influx.QueryVehicleEventsAsync(sensorId, start, end);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Events query failed for sensor {SensorId}", sensorId);
            return StatusCode(500, new { error = "Query failed" });
        }
    }
}
