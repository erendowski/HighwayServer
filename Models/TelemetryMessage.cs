namespace HighwayServer.Models;

public class TelemetryMessage
{
    public string VehicleId { get; set; } = string.Empty;
    public string Class     { get; set; } = string.Empty;
    public double Speed     { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public int TrackId  { get; set; }
}
