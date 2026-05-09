namespace HighwayServer.Mqtt.Handlers;

/// <summary>
/// Handles inbound MQTT messages for a specific topic pattern.
/// Implementations are registered in DI and discovered by MqttTopicRouter.
/// </summary>
public interface IMqttMessageHandler
{
    /// <summary>
    /// MQTT topic filter this handler owns.
    /// Use '+' for single-level wildcard. Example: "highway/telemetry/+/detections"
    /// </summary>
    string TopicPattern { get; }

    Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken ct);
}
