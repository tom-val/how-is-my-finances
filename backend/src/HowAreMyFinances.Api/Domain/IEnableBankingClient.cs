using HowAreMyFinances.Api.Infrastructure.EnableBanking;

namespace HowAreMyFinances.Api.Domain;

/// <summary>PSU (end user) context forwarded to the bank so requests count as user-present.</summary>
public sealed record PsuContext(string? IpAddress, string? UserAgent)
{
    public static readonly PsuContext None = new(null, null);
}

/// <summary>Error codes in <see cref="Result{T}.Error"/> returned by <see cref="IEnableBankingClient"/>.</summary>
public static class EnableBankingErrors
{
    /// <summary>429 ASPSP_RATE_LIMIT_EXCEEDED: back off for a few hours.</summary>
    public const string RateLimited = "RateLimited";

    /// <summary>An expired, closed or revoked session: the connection needs to be renewed.</summary>
    public const string Expired = "Expired";

    public const string NotFound = "NotFound";
}

/// <summary>Transaction status filter for <see cref="IEnableBankingClient.GetTransactionsAsync"/>.</summary>
public static class EbTransactionStatus
{
    public const string Booked = "BOOK";
    public const string Pending = "PDNG";
}

public interface IEnableBankingClient
{
    Task<Result<IReadOnlyList<EbAspsp>>> GetAspspsAsync(string country, CancellationToken cancellationToken = default);

    Task<Result<EbStartAuthResponse>> StartAuthAsync(
        string aspspName, string country, string state, DateTimeOffset validUntil, string redirectUrl,
        CancellationToken cancellationToken = default);

    Task<Result<EbSessionResponse>> CreateSessionAsync(string code, CancellationToken cancellationToken = default);

    Task<Result<EbGetSessionResponse>> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default);

    /// <param name="transactionStatus">BOOK, PDNG, or null for both.</param>
    Task<Result<EbTransactionsPage>> GetTransactionsAsync(
        string accountUid, DateOnly dateFrom, DateOnly? dateTo, string? transactionStatus,
        string? continuationKey, PsuContext psu, CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteSessionAsync(string sessionId, CancellationToken cancellationToken = default);
}
