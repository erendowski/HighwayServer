namespace HighwayServer.Options;

public sealed class AnomalyThresholds
{
    public const string Section = "AnomalyThresholds";

    public float StoppedSpeedKmh           { get; set; } = 5f;
    public int   StoppedDurationSec        { get; set; } = 4;
    public float SlowSpeedKmh             { get; set; } = 40f;
    public float FastSpeedKmh             { get; set; } = 130f;
    public float ExtremeFastSpeedKmh      { get; set; } = 160f;
    public float SuddenBrakeDeltaKmhPerSec { get; set; } = -25f;
    public float SuddenAccelDeltaKmhPerSec { get; set; } = 20f;
    public int   DebounceSec              { get; set; } = 10;
}
