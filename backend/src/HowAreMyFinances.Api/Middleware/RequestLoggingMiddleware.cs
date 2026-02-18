using System.Diagnostics;

namespace HowAreMyFinances.Api.Middleware;

/// <summary>
/// Logs every HTTP request with method, path, status code, and duration.
/// </summary>
public sealed class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        await _next(context);

        stopwatch.Stop();

        var statusCode = context.Response.StatusCode;
        var method = context.Request.Method;
        var path = context.Request.Path;

        if (statusCode >= 500)
        {
            _logger.LogError("[RequestLogging] {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                method, path, statusCode, stopwatch.ElapsedMilliseconds);
        }
        else if (statusCode >= 400)
        {
            _logger.LogWarning("[RequestLogging] {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                method, path, statusCode, stopwatch.ElapsedMilliseconds);
        }
        else
        {
            _logger.LogInformation("[RequestLogging] {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                method, path, statusCode, stopwatch.ElapsedMilliseconds);
        }
    }
}
