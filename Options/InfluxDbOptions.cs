namespace HighwayServer.Options;

public sealed class InfluxDbOptions
{
    public const string Section = "InfluxDb";

    public string Url    { get; set; } = "http://localhost:8086";
    public string Token  { get; set; } = string.Empty;
    public string Org    { get; set; } = "highway";
    public string Bucket { get; set; } = "highway";
}
