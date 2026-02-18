using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// AWS Lambda hosting
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Configuration
builder.Services
    .AddOptions<SupabaseSettings>()
    .BindConfiguration(SupabaseSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// CORS — in production API Gateway handles CORS; locally the backend must allow the frontend origin.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? [];

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Services
builder.Services.AddScoped<IMonthService, MonthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();

var app = builder.Build();

// Middleware — order matters: exception handling outermost, then logging, then auth
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors();

// In production, API Gateway's Lambda authorizer validates JWTs and passes the user ID
// via the authorizer context. Locally, the app validates JWTs directly.
if (app.Environment.IsDevelopment())
    app.UseMiddleware<AuthMiddleware>();
else
    app.UseMiddleware<AuthorizerContextMiddleware>();

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
