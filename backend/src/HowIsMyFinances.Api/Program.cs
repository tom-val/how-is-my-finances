using HowIsMyFinances.Api.Configuration;
using HowIsMyFinances.Api.Functions;
using HowIsMyFinances.Api.Middleware;
using HowIsMyFinances.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// AWS Lambda hosting
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Configuration
builder.Services
    .AddOptions<SupabaseSettings>()
    .BindConfiguration(SupabaseSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Services
builder.Services.AddScoped<IMonthService, MonthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();

var app = builder.Build();

// Middleware
app.UseMiddleware<AuthMiddleware>();

// Health check (public)
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Month endpoints
app.MapGet("/v1/months", MonthFunctions.GetAll);
app.MapGet("/v1/months/{id:guid}", MonthFunctions.GetById);
app.MapPost("/v1/months", MonthFunctions.Create);
app.MapPut("/v1/months/{id:guid}", MonthFunctions.Update);
app.MapDelete("/v1/months/{id:guid}", MonthFunctions.Delete);

// Profile endpoints
app.MapGet("/v1/profile", ProfileFunctions.Get);
app.MapPut("/v1/profile", ProfileFunctions.Update);

app.Run();
