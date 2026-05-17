using HighwayServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace HighwayServer.Controllers;

[ApiController]
[Route("api/stream")]
public sealed class StreamController : ControllerBase
{
    private readonly StreamStatusService _streamStatus;

    public StreamController(StreamStatusService streamStatus)
        => _streamStatus = streamStatus;

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var (ready, since) = _streamStatus.CurrentStatus;
        return Ok(new { ready, path = "highway", since });
    }
}
