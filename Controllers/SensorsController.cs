using HighwayServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace HighwayServer.Controllers;

[ApiController]
[Route("api/sensors")]
public sealed class SensorsController : ControllerBase
{
    private readonly SensorStateStore _sensorStore;
    private readonly TrackStateStore _trackStore;
    private readonly ILogger<SensorsController> _logger;

    public SensorsController(
        SensorStateStore sensorStore,
        TrackStateStore trackStore,
        ILogger<SensorsController> logger)
    {
        _sensorStore = sensorStore;
        _trackStore  = trackStore;
        _logger      = logger;
    }

    /// <summary>GET /api/sensors — live state of every known sensor.</summary>
    [HttpGet]
    public IActionResult GetAll() => Ok(_sensorStore.GetAll());

    /// <summary>GET /api/sensors/{id} — single sensor state, 404 if unknown.</summary>
    [HttpGet("{id}")]
    public IActionResult GetById(string id)
    {
        var sensor = _sensorStore.GetById(id);
        if (sensor is null)
            return NotFound(new { error = $"Sensor '{id}' not found" });
        return Ok(sensor);
    }

    /// <summary>GET /api/sensors/{id}/tracks/active — active tracks for a sensor.</summary>
    [HttpGet("{id}/tracks/active")]
    public IActionResult GetActiveTracks(string id) => Ok(_trackStore.GetActive(id));
}
