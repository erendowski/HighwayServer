using HighwayServer.Hubs;
using HighwayServer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSingleton<InfluxService>();
builder.Services.AddHostedService<MqttBackgroundService>();

var origins = builder.Configuration
    .GetSection("Cors:Origins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(o =>
    o.AddDefaultPolicy(p => p
        .WithOrigins(origins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

app.UseCors();
app.MapControllers();
app.MapHub<TelemetryHub>("/telemetryHub");

app.Run();
