using Serilog;
using Serilog.Events;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using HighwayServer.Hubs;
using HighwayServer.Mqtt;
using HighwayServer.Mqtt.Handlers;
using HighwayServer.Options;
using HighwayServer.Services;
using Microsoft.Extensions.Options;

// Bootstrap logger captures startup errors before full DI is wired.
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("System", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/highway-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, services, cfg) => cfg
        .ReadFrom.Configuration(ctx.Configuration)
        .ReadFrom.Services(services)
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .WriteTo.Console(outputTemplate:
            "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
        .WriteTo.File(
            path: "logs/highway-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 7,
            outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"));

    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
        {
            opts.JsonSerializerOptions.PropertyNamingPolicy   = JsonNamingPolicy.CamelCase;
            opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        });

    builder.Services.AddSignalR();

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new() { Title = "Highway API", Version = "v1" });
    });

    // Rate limiting — 5 commands per 10 s per client IP
    builder.Services.AddRateLimiter(opts =>
    {
        opts.AddFixedWindowLimiter("commands", limiter =>
        {
            limiter.Window                = TimeSpan.FromSeconds(10);
            limiter.PermitLimit           = 5;
            limiter.QueueProcessingOrder  = QueueProcessingOrder.OldestFirst;
            limiter.QueueLimit            = 0;
        });
        opts.RejectionStatusCode = 429;
    });

    // MQTT options
    builder.Services.Configure<MqttOptions>(builder.Configuration.GetSection(MqttOptions.Section));

    // MQTT handlers — each inbound topic family gets one handler
    builder.Services.AddSingleton<IMqttMessageHandler, DetectionsHandler>();
    builder.Services.AddSingleton<IMqttMessageHandler, StatsHandler>();
    builder.Services.AddSingleton<IMqttMessageHandler, SensorStatusHandler>();
    builder.Services.AddSingleton<IMqttMessageHandler, SensorMetaHandler>();
    builder.Services.AddSingleton<IMqttMessageHandler, HeartbeatHandler>();
    builder.Services.AddSingleton<IMqttMessageHandler, VehicleEnterHandler>();
    builder.Services.AddSingleton<IMqttMessageHandler, VehicleExitHandler>();
    builder.Services.AddSingleton<IMqttMessageHandler, CommandResponseHandler>();

    // Router — receives every message and dispatches to the correct handler
    builder.Services.AddSingleton<MqttTopicRouter>();

    // MQTT client service — singleton so other services can inject IMqttClientService for publishing
    builder.Services.AddSingleton<MqttClientService>();
    builder.Services.AddSingleton<IMqttClientService>(sp => sp.GetRequiredService<MqttClientService>());
    builder.Services.AddHostedService<MqttBackgroundService>();

    // InfluxDB options
    builder.Services.Configure<InfluxDbOptions>(
        builder.Configuration.GetSection(InfluxDbOptions.Section));

    // In-memory live state stores
    builder.Services.AddSingleton<SensorStateStore>();
    builder.Services.AddSingleton<TrackStateStore>();

    // Application services
    builder.Services.AddSingleton<InfluxService>();
    builder.Services.AddHostedService<SensorPruningService>();

    // CORS — wildcard in dev/no-origins; specific origins + credentials in production
    builder.Services.AddCors(opts => opts.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration
            .GetSection("Cors:Origins")
            .Get<string[]>() ?? Array.Empty<string>();

        if (builder.Environment.IsDevelopment() || origins.Length == 0)
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        else
            policy.WithOrigins(origins).AllowAnyMethod().AllowAnyHeader().AllowCredentials();
    }));

    var app = builder.Build();

    app.UseCors();
    app.UseRateLimiter();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.MapControllers();
    app.MapHub<TelemetryHub>("/telemetryHub");
    app.MapGet("/health", () => Results.Ok(new { status = "healthy", ts = DateTimeOffset.UtcNow }));
    app.MapFallbackToFile("index.html");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
