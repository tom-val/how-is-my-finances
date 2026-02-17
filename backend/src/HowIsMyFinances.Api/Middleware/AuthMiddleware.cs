using System.IdentityModel.Tokens.Jwt;
using HowIsMyFinances.Api.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace HowIsMyFinances.Api.Middleware;

public sealed class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SupabaseSettings _settings;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;

    private static readonly HashSet<string> PublicPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health"
    };

    public AuthMiddleware(RequestDelegate next, IOptions<SupabaseSettings> settings)
    {
        _next = next;
        _settings = settings.Value;

        // Fetch signing keys from Supabase JWKS endpoint.
        // ConfigurationManager caches and auto-refreshes keys.
        var issuer = $"{_settings.Url}/auth/v1";
        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            $"{issuer}/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever { RequireHttps = false });
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (PublicPaths.Contains(context.Request.Path.Value ?? ""))
        {
            await _next(context);
            return;
        }

        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Missing or invalid Authorization header" });
            return;
        }

        var token = authHeader["Bearer ".Length..].Trim();

        try
        {
            var config = await _configManager.GetConfigurationAsync(context.RequestAborted);
            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = config.SigningKeys,
                ValidateIssuer = true,
                ValidIssuer = $"{_settings.Url}/auth/v1",
                ValidateAudience = true,
                ValidAudience = "authenticated",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            var userId = principal.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "Invalid token: missing user ID" });
                return;
            }

            context.Items["UserId"] = userGuid;
            await _next(context);
        }
        catch (SecurityTokenException)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid or expired token" });
        }
    }
}

public static class HttpContextExtensions
{
    public static Guid GetUserId(this HttpContext context)
    {
        if (context.Items.TryGetValue("UserId", out var userId) && userId is Guid guid)
        {
            return guid;
        }

        throw new InvalidOperationException("User ID not found in context. Ensure AuthMiddleware is registered.");
    }
}
