using System.Text.Json;
using System.Text.Json.Serialization;

namespace HowAreMyFinances.Api.Infrastructure.EnableBanking;

// Enable Banking API DTOs, serialised with JsonNamingPolicy.SnakeCaseLower.
// Field names checked against https://enablebanking.com/docs/api/reference/ (October 2026).

public static class EnableBankingJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        // AmountType.amount is a string such as "1.23"
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };
}

// GET /aspsps
public sealed record EbAspspsResponse(List<EbAspsp>? Aspsps);

public sealed record EbAspsp(
    string Name,
    string Country,
    string? Logo,
    // Seconds (e.g. 15552000 = 180 days)
    long? MaximumConsentValidity,
    List<string>? PsuTypes
);

// POST /auth
public sealed record EbAccess(DateTimeOffset? ValidUntil);

public sealed record EbAspspRef(string Name, string Country);

public sealed record EbStartAuthRequest(
    EbAccess Access,
    EbAspspRef Aspsp,
    string State,
    string RedirectUrl,
    string PsuType
);

public sealed record EbStartAuthResponse(string Url, string? AuthorizationId);

// POST /sessions
public sealed record EbCreateSessionRequest(string Code);

public sealed record EbAccountId(string? Iban);

public sealed record EbSessionAccount(
    string? Uid,
    EbAccountId? AccountId,
    string? Name,
    string? Currency
);

public sealed record EbSessionResponse(
    string SessionId,
    List<EbSessionAccount>? Accounts,
    EbAccess? Access
);

// GET /sessions/{session_id}
public sealed record EbGetSessionResponse(
    // AUTHORIZED, CANCELLED, CLOSED, EXPIRED, INVALID, PENDING_AUTHORIZATION, RETURNED_FROM_BANK, REVOKED
    string? Status,
    EbAccess? Access
);

// GET /accounts/{account_id}/transactions
public sealed record EbAmount(decimal Amount, string? Currency);

public sealed record EbParty(string? Name);

public sealed record EbBankTransactionCode(string? Description, string? Code, string? SubCode);

public sealed record EbTransaction
{
    public string? EntryReference { get; init; }
    public string? TransactionId { get; init; }
    public EbAmount? TransactionAmount { get; init; }

    /// <summary>DBIT or CRDT</summary>
    public string? CreditDebitIndicator { get; init; }

    /// <summary>BOOK, PDNG, CNCL, HOLD, OTHR, RJCT, SCHD</summary>
    public string? Status { get; init; }

    public DateOnly? BookingDate { get; init; }
    public DateOnly? ValueDate { get; init; }
    public DateOnly? TransactionDate { get; init; }
    public EbParty? Creditor { get; init; }
    public EbParty? Debtor { get; init; }
    public EbAccountId? CreditorAccount { get; init; }
    public EbAccountId? DebtorAccount { get; init; }
    public List<string>? RemittanceInformation { get; init; }
    public string? MerchantCategoryCode { get; init; }
    public EbBankTransactionCode? BankTransactionCode { get; init; }

    /// <summary>The transaction exactly as Enable Banking returned it, stored in raw_data.</summary>
    [JsonIgnore]
    public string RawJson { get; init; } = "{}";
}

public sealed record EbTransactionsPage(IReadOnlyList<EbTransaction> Transactions, string? ContinuationKey);

// ErrorResponse
public sealed record EbError(string? Message, int? Code, string? Error, JsonElement? Detail);
