using System.Net;
using System.Net.Http.Headers;
using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using Microsoft.Extensions.Options;

namespace HowAreMyFinances.Api.Infrastructure;

/// <summary>Calls the Supabase Auth admin API with the service role key.</summary>
public sealed class SupabaseAuthAdminClient : IAuthAdminClient
{
    private readonly HttpClient _httpClient;
    private readonly string _serviceKey;
    private readonly ILogger<SupabaseAuthAdminClient> _logger;

    public SupabaseAuthAdminClient(
        HttpClient httpClient,
        IOptions<SupabaseSettings> settings,
        ILogger<SupabaseAuthAdminClient> logger)
    {
        _httpClient = httpClient;
        _serviceKey = settings.Value.ServiceKey;
        _logger = logger;
    }

    public async Task<Result<bool>> DeleteUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"auth/v1/admin/users/{userId}");
        request.Headers.Add("apikey", _serviceKey);
        // Legacy service_role keys are JWTs and also go in Authorization; the newer sb_secret_ keys
        // must only be sent as apikey.
        if (_serviceKey.StartsWith("eyJ", StringComparison.Ordinal))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _serviceKey);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.NotFound)
            return Result<bool>.Success(true);

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogError("Deleting auth user {UserId} failed: {Status} {Body}", userId, (int)response.StatusCode, body);
        return Result<bool>.Failure($"Auth admin API returned {(int)response.StatusCode}");
    }
}
