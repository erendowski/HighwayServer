using System.Globalization;
using System.Text;
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

    /// <summary>GET /api/sensors/{sensorId}/history/anomalies</summary>
    [HttpGet("anomalies")]
    public async Task<IActionResult> GetAnomalies(
        string sensorId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to)
    {
        var start = from ?? DateTimeOffset.UtcNow.AddHours(-1);
        var end   = to   ?? DateTimeOffset.UtcNow;
        try
        {
            var data = await _influx.QueryAnomaliesAsync(sensorId, start, end);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Anomaly query failed for sensor {SensorId}", sensorId);
            return StatusCode(500, new { error = "Query failed" });
        }
    }

    /// <summary>GET /api/sensors/{sensorId}/history/anomalies/export — CSV (Excel) report</summary>
    [HttpGet("anomalies/export")]
    public async Task<IActionResult> ExportAnomalies(
        string sensorId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to)
    {
        var start = from ?? DateTimeOffset.UtcNow.AddHours(-24);
        var end   = to   ?? DateTimeOffset.UtcNow;

        List<AnomalyRecord> data;
        try
        {
            data = await _influx.QueryAnomaliesAsync(sensorId, start, end);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Anomaly export failed for sensor {SensorId}", sensorId);
            return StatusCode(500, new { error = "Export failed" });
        }

        var sb = new StringBuilder();
        // sep hint makes Excel use ';' as the delimiter regardless of locale.
        sb.Append("sep=;\r\n");
        sb.Append("Time (UTC);Time (Local);Sensor;Track ID;Vehicle Class;Anomaly Type;Severity;Speed (km/h);Delta (km/h/s);Impact;Recommended Action\r\n");

        foreach (var a in data)
        {
            var local = a.Ts.ToLocalTime();
            var impact = AnomalyReport.Impact(a.AnomalyType);
            sb.Append(Csv(a.Ts.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture))); sb.Append(';');
            sb.Append(Csv(local.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)));  sb.Append(';');
            sb.Append(Csv(a.SensorId));                                                            sb.Append(';');
            sb.Append(Csv(a.TrackId.ToString(CultureInfo.InvariantCulture)));                      sb.Append(';');
            sb.Append(Csv(a.VehicleClass));                                                        sb.Append(';');
            sb.Append(Csv(AnomalyReport.TypeLabel(a.AnomalyType)));                                sb.Append(';');
            sb.Append(Csv(AnomalyReport.SeverityLabel(a.Severity)));                               sb.Append(';');
            sb.Append(Csv(a.SpeedKmh.ToString("0.#", CultureInfo.InvariantCulture)));              sb.Append(';');
            sb.Append(Csv(a.Delta.HasValue ? a.Delta.Value.ToString("0.#", CultureInfo.InvariantCulture) : "")); sb.Append(';');
            sb.Append(Csv(impact.Impact));                                                         sb.Append(';');
            sb.Append(Csv(impact.Recommendation));                                                 sb.Append("\r\n");
        }

        // UTF-8 BOM keeps Excel happy across locales (content is ASCII-only).
        var bom   = new byte[] { 0xEF, 0xBB, 0xBF };
        var body  = Encoding.UTF8.GetBytes(sb.ToString());
        var bytes = new byte[bom.Length + body.Length];
        Buffer.BlockCopy(bom, 0, bytes, 0, bom.Length);
        Buffer.BlockCopy(body, 0, bytes, bom.Length, body.Length);

        var fileName = $"anomaly-report_{sensorId}_{DateTimeOffset.Now:yyyyMMdd-HHmm}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private static string Csv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        var needsQuote = value.Contains(';') || value.Contains('"') || value.Contains('\n') || value.Contains('\r');
        var escaped = value.Replace("\"", "\"\"");
        return needsQuote ? $"\"{escaped}\"" : escaped;
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
