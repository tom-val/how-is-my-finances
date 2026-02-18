using Amazon.Lambda.APIGatewayEvents;

namespace HowIsMyFinances.Api.Middleware;

/// <summary>
/// Reads the authenticated user ID from the API Gateway Lambda authorizer context.
/// Used in production where a separate Lambda authorizer validates JWTs before
/// the request reaches this Lambda.
/// </summary>
public sealed class AuthorizerContextMiddleware
{
    private readonly RequestDelegate _next;

    private static readonly HashSet<string> PublicPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health"
    };

    public AuthorizerContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (PublicPaths.Contains(context.Request.Path.Value ?? ""))
        {
            await _next(context);
            return;
        }

        var userId = GetUserIdFromAuthorizerContext(context);

        if (userId is null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Missing user ID in authorizer context" });
            return;
        }

        context.Items["UserId"] = userId.Value;
        await _next(context);
    }

    private static Guid? GetUserIdFromAuthorizerContext(HttpContext context)
    {
        // Amazon.Lambda.AspNetCoreServer stores the original API Gateway event
        // in HttpContext.Items under the key "LambdaRequestObject".
        if (context.Items["LambdaRequestObject"] is not APIGatewayHttpApiV2ProxyRequest request)
        {
            return null;
        }

        if (request.RequestContext?.Authorizer?.Lambda is not { } authorizerContext)
        {
            return null;
        }

        if (!authorizerContext.TryGetValue("userId", out var userIdObj))
        {
            return null;
        }

        return Guid.TryParse(userIdObj?.ToString(), out var guid) ? guid : null;
    }
}
