namespace HighwayServer.Services;

/// <summary>Turkish labels + impact text for anomaly reporting (CSV export).</summary>
public static class AnomalyReport
{
    public readonly record struct ImpactInfo(string Impact, string Recommendation);

    private static readonly Dictionary<string, ImpactInfo> Impacts = new()
    {
        ["STOPPED_VEHICLE"] = new(
            "Yüksek arkadan çarpma riski. Takip eden trafikte ani şerit değişikliklerine yol açar.",
            "Yol devriyesi yönlendirin; üst akıştaki sürücüleri VMS ile uyarın."),
        ["WRONG_WAY"] = new(
            "Aşırı kafa kafaya çarpışma riski. En ölümcül otoyol olaylarından biri.",
            "Acil müdahale ekibi yönlendirin; mümkünse üst akış girişini kapatın."),
        ["LANE_VIOLATION"] = new(
            "Araç şerit sınırları dışında; yandan çarpışma riski.",
            "İzleyin; ısrarcıysa uyarı verin."),
        ["POSSIBLE_ACCIDENT"] = new(
            "Yakın mesafede birden fazla duran araç — çarpışma veya arıza kümesi.",
            "Acil müdahale ekibi yönlendirin; kamera kaydını inceleyin."),
        ["SUDDEN_BRAKE"] = new(
            "Olası engel veya kıl payı kaza işareti. Takip eden araçlar güvenli durma mesafesine sahip olmayabilir.",
            "Üst akışta olay olup olmadığını kontrol edin; kamera kaydını inceleyin."),
        ["OVERSPEED"] = new(
            "Tepki süresini kısaltır, fren mesafesini uzatır; çarpışma şiddetini artırır.",
            "Denetim için kaydedin; ALPR varsa plakayı işaretleyin."),
        ["UNDERSPEED"] = new(
            "Ortalama trafikle hız farkı sollama manevralarını ve şerit değişikliği riskini artırır.",
            "İzleyin; ısrarcıysa sürücüye sağ şeridi kullanmasını önerin."),
    };

    private static readonly Dictionary<string, string> TypeLabels = new()
    {
        ["STOPPED_VEHICLE"]   = "Duran Araç",
        ["WRONG_WAY"]         = "Ters Yön",
        ["LANE_VIOLATION"]    = "Şerit İhlali",
        ["POSSIBLE_ACCIDENT"] = "Olası Kaza",
        ["SUDDEN_BRAKE"]      = "Ani Fren",
        ["OVERSPEED"]         = "Hız Aşımı",
        ["UNDERSPEED"]        = "Düşük Hız",
    };

    private static readonly Dictionary<string, string> SeverityLabels = new()
    {
        ["critical"] = "Kritik",
        ["high"]     = "Yüksek",
        ["medium"]   = "Orta",
        ["low"]      = "Düşük",
    };

    public static ImpactInfo Impact(string anomalyType) =>
        Impacts.TryGetValue(anomalyType, out var info)
            ? info
            : new ImpactInfo("Anomali tespit edildi.", "İzleyin.");

    public static string TypeLabel(string anomalyType) =>
        TypeLabels.TryGetValue(anomalyType, out var label) ? label : anomalyType;

    public static string SeverityLabel(string severity) =>
        SeverityLabels.TryGetValue(severity, out var label) ? label : severity;
}
