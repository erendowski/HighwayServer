using HighwayServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace HighwayServer.Controllers;

[ApiController]
[Route("api/history")]
public class HistoryController : ControllerBase
{
    private readonly InfluxService _influx;

    public HistoryController(InfluxService influx) => _influx = influx;

    /// <summary>
    /// GET /api/history?from=&amp;to=&amp;vehicleId=
    /// Returns detections within the given time window (default: last 1 hour).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string?   vehicleId)
    {
        var start = from ?? DateTime.UtcNow.AddHours(-1);
        var end   = to   ?? DateTime.UtcNow;

        var data = await _influx.QueryAsync(start, end, vehicleId);
        return Ok(data);
    }
}
