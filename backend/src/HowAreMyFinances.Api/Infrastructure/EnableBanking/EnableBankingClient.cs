using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HowAreMyFinances.Api.Domain;

namespace HowAreMyFinances.Api.Infrastructure.EnableBanking;

/// <summary>
/// Typed HttpClient for the Enable Banking API. The base address and the bearer JWT
/// (<see cref="EnableBankingAuthHandler"/>) are configured in Program.cs.
/// </summary>
public sealed class EnableBankingClient : IEnableBankingClient
{
    private static readonly HashSet<string> SessionExpiredErrors = new(StringComparer.Ordinal)
    {
        "EXPIRED_SESSION", "CLOSED_SESSION", "REVOKED_SESSION"
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<EnableBankingClient> _logger;

    public EnableBankingClient(HttpClient httpClient, ILogger<EnableBankingClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<Result<IReadOnlyList<EbAspsp>>> GetAspspsAsync(string country, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/aspsps?country={Uri.EscapeDataString(country)}");
        var result = await SendAsync<EbAspspsResponse>(request, cancellationToken);
        return result.IsSuccess
            ? Result<IReadOnlyList<EbAspsp>>.Success(result.Value!.Aspsps ?? [])
            : Result<IReadOnlyList<EbAspsp>>.Failure(result.Error!);
    }

    public async Task<Result<EbStartAuthResponse>> StartAuthAsync(
        string aspspName, string country, string state, DateTimeOffset validUntil, string redirectUrl,
        CancellationToken cancellationToken = default)
    {
        var body = new EbStartAuthRequest(
            Access: new EbAccess(validUntil),
            Aspsp: new EbAspspRef(aspspName, country),
            State: state,
            RedirectUrl: redirectUrl,
            PsuType: "personal");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/auth")
        {
            Content = JsonContent.Create(body, options: EnableBankingJson.Options)
        };
        return await SendAsync<EbStartAuthResponse>(request, cancellationToken);
    }

    public async Task<Result<EbSessionResponse>> CreateSessionAsync(string code, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/sessions")
        {
            Content = JsonContent.Create(new EbCreateSessionRequest(code), options: EnableBankingJson.Options)
        };
        return await SendAsync<EbSessionResponse>(request, cancellationToken);
    }

    public async Task<Result<EbGetSessionResponse>> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/sessions/{Uri.EscapeDataString(sessionId)}");
        return await SendAsync<EbGetSessionResponse>(request, cancellationToken);
    }

    public async Task<Result<EbTransactionsPage>> GetTransactionsAsync(
        string accountUid, DateOnly dateFrom, DateOnly? dateTo, string? transactionStatus,
        string? continuationKey, PsuContext psu, CancellationToken cancellationToken = default)
    {
        var query = new List<string> { $"date_from={dateFrom.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}" };
        if (dateTo.HasValue)
            query.Add($"date_to={dateTo.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}");
        if (!string.IsNullOrEmpty(transactionStatus))
            query.Add($"transaction_status={Uri.EscapeDataString(transactionStatus)}");
        if (!string.IsNullOrEmpty(continuationKey))
            query.Add($"continuation_key={Uri.EscapeDataString(continuationKey)}");

        using var request = new HttpRequestMessage(
            HttpMethod.Get, $"/accounts/{Uri.EscapeDataString(accountUid)}/transactions?{string.Join('&', query)}");

        // PSU headers mark the request as user-present, so it doesn't count against the bank's
        // background-fetch limit (header names from the Enable Banking API reference).
        if (!string.IsNullOrWhiteSpace(psu.IpAddress))
            request.Headers.TryAddWithoutValidation("Psu-Ip-Address", psu.IpAddress);
        if (!string.IsNullOrWhiteSpace(psu.UserAgent))
            request.Headers.TryAddWithoutValidation("Psu-User-Agent", psu.UserAgent);

        var result = await SendAsync<JsonElement>(request, cancellationToken);
        if (!result.IsSuccess)
            return Result<EbTransactionsPage>.Failure(result.Error!);

        return Result<EbTransactionsPage>.Success(ParseTransactionsPage(result.Value));
    }

    public async Task<Result<bool>> DeleteSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/sessions/{Uri.EscapeDataString(sessionId)}");
        var result = await SendAsync<JsonElement>(request, cancellationToken);
        return result.IsSuccess ? Result<bool>.Success(true) : Result<bool>.Failure(result.Error!);
    }

    /// <summary>Parses a transactions page, keeping each transaction's raw JSON for raw_data.</summary>
    public static EbTransactionsPage ParseTransactionsPage(JsonElement root)
    {
        var transactions = new List<EbTransaction>();

        if (root.ValueKind == JsonValueKind.Object
            && root.TryGetProperty("transactions", out var items)
            && items.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in items.EnumerateArray())
            {
                var raw = item.GetRawText();
                var transaction = item.Deserialize<EbTransaction>(EnableBankingJson.Options);
                if (transaction is not null)
                    transactions.Add(transaction with { RawJson = raw });
            }
        }

        string? continuationKey = null;
        if (root.ValueKind == JsonValueKind.Object
            && root.TryGetProperty("continuation_key", out var key)
            && key.ValueKind == JsonValueKind.String)
        {
            continuationKey = key.GetString();
        }

        return new EbTransactionsPage(transactions, string.IsNullOrEmpty(continuationKey) ? null : continuationKey);
    }

    /// <summary>Maps an Enable Banking error response to an error code.</summary>
    public static string MapError(HttpStatusCode statusCode, EbError? error)
    {
        var code = error?.Error;

        if (statusCode == HttpStatusCode.TooManyRequests || code == "ASPSP_RATE_LIMIT_EXCEEDED")
            return EnableBankingErrors.RateLimited;

        // Only the session error codes mean the user's consent is gone. A bare 401 is the app's own JWT
        // being rejected (wrong key or application id): report it, don't mark connections expired.
        if (code is not null && SessionExpiredErrors.Contains(code))
            return EnableBankingErrors.Expired;

        if (statusCode == HttpStatusCode.NotFound || code == "SESSION_DOES_NOT_EXIST")
            return EnableBankingErrors.NotFound;

        var message = error?.Message ?? statusCode.ToString();
        return $"Bank provider error ({(int)statusCode}): {message}";
    }

    private async Task<Result<T>> SendAsync<T>(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "[EnableBanking] {Method} {Path} failed", request.Method, request.RequestUri?.AbsolutePath);
            return Result<T>.Failure("Bank provider is unreachable");
        }

        using (response)
        {
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                if (string.IsNullOrWhiteSpace(body))
                    return Result<T>.Success(default!);

                var value = JsonSerializer.Deserialize<T>(body, EnableBankingJson.Options);
                return Result<T>.Success(value!);
            }

            EbError? error = null;
            try
            {
                error = await response.Content.ReadFromJsonAsync<EbError>(EnableBankingJson.Options, cancellationToken);
            }
            catch (JsonException)
            {
                // Non-JSON error body; the status code is enough.
            }

            _logger.LogWarning("[EnableBanking] {Method} {Path} returned {StatusCode} {Error}: {Message}",
                request.Method, request.RequestUri?.AbsolutePath, (int)response.StatusCode, error?.Error, error?.Message);

            return Result<T>.Failure(MapError(response.StatusCode, error));
        }
    }
}
