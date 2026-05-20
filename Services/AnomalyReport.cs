namespace HighwayServer.Services;

/// <summary>English labels + impact text for anomaly reporting (CSV export).</summary>
public static class AnomalyReport
{
    public readonly record struct ImpactInfo(string Impact, string Recommendation);

    private static readonly Dictionary<string, ImpactInfo> Impacts = new()
    {
        ["STOPPED_VEHICLE"] = new(
            "High rear-end collision risk. Forces sudden lane changes in following traffic.",
            "Dispatch highway patrol; warn upstream drivers via VMS."),
        ["WRONG_WAY"] = new(
            "Extreme head-on collision risk. One of the highest-fatality highway events.",
            "Immediate emergency dispatch; close upstream entry if possible."),
        ["LANE_VIOLATION"] = new(
            "Vehicle outside designated lane boundaries; risk of sideswipe collisions.",
            "Monitor; issue warning if persistent."),
        ["POSSIBLE_ACCIDENT"] = new(
            "Multiple stopped vehicles in close proximity - collision or breakdown cluster.",
            "Immediate emergency dispatch; review camera footage."),
        ["SUDDEN_BRAKE"] = new(
            "Possible obstacle or near-miss. Following vehicles may not have safe stopping distance.",
            "Check for upstream incident; review camera footage."),
        ["OVERSPEED"] = new(
            "Reduced reaction time and longer braking distance; raises collision severity.",
            "Log for enforcement; flag plate if ALPR available."),
        ["UNDERSPEED"] = new(
            "Speed differential with mean traffic increases overtaking and lane-change risk.",
            "Monitor; advise driver to use right lane if persistent."),
    };

    private static readonly Dictionary<string, string> TypeLabels = new()
    {
        ["STOPPED_VEHICLE"]   = "Stopped Vehicle",
        ["WRONG_WAY"]         = "Wrong Way",
        ["LANE_VIOLATION"]    = "Lane Violation",
        ["POSSIBLE_ACCIDENT"] = "Possible Accident",
        ["SUDDEN_BRAKE"]      = "Sudden Brake",
        ["OVERSPEED"]         = "Overspeed",
        ["UNDERSPEED"]        = "Underspeed",
    };

    private static readonly Dictionary<string, string> SeverityLabels = new()
    {
        ["critical"] = "Critical",
        ["high"]     = "High",
        ["medium"]   = "Medium",
        ["low"]      = "Low",
    };

    public static ImpactInfo Impact(string anomalyType) =>
        Impacts.TryGetValue(anomalyType, out var info)
            ? info
            : new ImpactInfo("Anomaly detected.", "Monitor.");

    public static string TypeLabel(string anomalyType) =>
        TypeLabels.TryGetValue(anomalyType, out var label) ? label : anomalyType;

    public static string SeverityLabel(string severity) =>
        SeverityLabels.TryGetValue(severity, out var label) ? label : severity;
}
