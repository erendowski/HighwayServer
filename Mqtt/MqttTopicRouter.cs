using System.Text.Json;
using HighwayServer.Mqtt.Handlers;

namespace HighwayServer.Mqtt;

public sealed class MqttTopicRouter
{
    private readonly (string[] patternParts, IMqttMessageHandler handler)[] _handlers;
    private readonly ILogger<MqttTopicRouter> _logger;

    public MqttTopicRouter(IEnumerable<IMqttMessageHandler> handlers, ILogger<MqttTopicRouter> logger)
    {
        _logger = logger;
        _handlers = handlers
            .Select(h => (h.TopicPattern.Split('/'), h))
            .ToArray();
    }

    public async Task RouteAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct)
    {
        if (!TryCheckSchemaVersion(payload))
        {
            _logger.LogWarning("Unsupported schema_version on topic {Topic}, skipping", topic);
            return;
        }

        var topicParts = topic.Split('/');
        var matched = _handlers
            .Where(h => TopicMatches(h.patternParts, topicParts))
            .Select(h => h.handler)
            .ToList();

        if (matched.Count == 0)
        {
            _logger.LogWarning("No handler matched topic {Topic}", topic);
            return;
        }

        await Task.WhenAll(matched.Select(async h =>
        {
            try
            {
                await h.HandleAsync(topic, payload, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Handler {Handler} threw on topic {Topic}", h.GetType().Name, topic);
            }
        }));
    }

    private static bool TopicMatches(string[] patternParts, string[] topicParts)
    {
        for (int i = 0; i < patternParts.Length; i++)
        {
            if (patternParts[i] == "#") return true;
            if (i >= topicParts.Length) return false;
            if (patternParts[i] != "+" && patternParts[i] != topicParts[i]) return false;
        }
        return patternParts.Length == topicParts.Length;
    }

    private static bool TryCheckSchemaVersion(ReadOnlyMemory<byte> payload)
    {
        try
        {
            using var doc = JsonDocument.Parse(payload);
            if (doc.RootElement.TryGetProperty("schema_version", out var v) && v.GetInt32() != 1)
                return false;
            return true;
        }
        catch { return true; }
    }
}
