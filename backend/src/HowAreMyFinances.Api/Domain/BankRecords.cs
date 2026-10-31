namespace HowAreMyFinances.Api.Domain;

public static class BankDirection
{
    public const string Debit = "debit";
    public const string Credit = "credit";
}

public static class BankBookingStatus
{
    public const string Booked = "booked";
    public const string Pending = "pending";
}

public static class BankConnectionStatuses
{
    public const string Pending = "pending";
    public const string Active = "active";
    public const string Expired = "expired";
    public const string Revoked = "revoked";
    public const string Failed = "failed";
}

public static class AiJobTypes
{
    public const string CategoriseBankTransactions = "categorise_bank_transactions";
    public const string ParseBankNotifications = "parse_bank_notifications";
}

/// <summary>Error codes returned by the bank review repository operations.</summary>
public static class BankReviewErrors
{
    public const string NotFound = "NotFound";
    public const string NotPending = "NotPending";
    public const string CategoryNotFound = "CategoryNotFound";
    public const string ExpenseNotFound = "ExpenseNotFound";
}

/// <summary>A transaction mapped from Enable Banking, ready to insert.</summary>
public sealed record NewBankTransaction(
    string ExternalId,
    string BookingStatus,
    string Direction,
    decimal Amount,
    string Currency,
    DateOnly BookingDate,
    string? CounterpartyName,
    string? CounterpartyKey,
    string? CounterpartyIbanHash,
    string? Description,
    string? MerchantCategoryCode,
    string RawJson
);

/// <summary>A row returned by an insert: <see cref="IsNew"/> is false when an existing pending row was upgraded to booked.</summary>
public sealed record InsertedBankTransaction(Guid Id, string ExternalId, bool IsNew);

/// <summary>Internal view of a bank_connections row.</summary>
public sealed record BankConnectionRecord(
    Guid Id,
    Guid UserId,
    string AspspName,
    string AspspCountry,
    string Client,
    string Status,
    string? SessionId,
    DateTime? ConsentExpiresAt,
    DateTime? LastSyncedAt,
    DateTime CreatedAt
);

/// <summary>Internal view of a bank_accounts row used by sync.</summary>
public sealed record BankAccountRecord(
    Guid Id,
    Guid ConnectionId,
    string ExternalUid,
    string? IbanHash,
    DateOnly? SyncedUntil
);

/// <summary>An account returned by POST /sessions, ready to store.</summary>
public sealed record NewBankAccount(
    string ExternalUid,
    string? IbanMasked,
    string? IbanHash,
    string? Name,
    string Currency
);

/// <summary>Internal view of a bank_transactions row used for review actions.</summary>
public sealed record BankTransactionRecord(
    Guid Id,
    string Source,
    string ParseStatus,
    string ReviewStatus,
    string? Direction,
    decimal? Amount,
    DateOnly? BookingDate,
    string? CounterpartyName,
    string? CounterpartyKey,
    string? Description,
    Guid? SuggestedCategoryId,
    string? SuggestedVendor,
    string? SuggestionSource
);

/// <summary>What the user (or bulk accept) chose when accepting a transaction.</summary>
public sealed record AcceptBankTransactionCommand(
    string ItemName,
    Guid? CategoryId,
    string? Vendor,
    string? Comment,
    DateOnly Date,
    string? Source
);

/// <summary>An uncategorised pending debit sent to the AI.</summary>
public sealed record UncategorisedBankTransaction(
    Guid Id,
    string? CounterpartyKey,
    string Direction,
    string? Counterparty,
    string? Description,
    string? Mcc,
    decimal Amount
);

/// <summary>A notification captured on the device, ready to insert.</summary>
public sealed record NewBankNotification(
    string ExternalId,
    DateTimeOffset PostedAt,
    string? Title,
    string Text
);

public sealed record InsertedBankNotification(Guid Id, string ExternalId);

/// <summary>A notification row still waiting to be read by the AI.</summary>
public sealed record PendingBankNotification(Guid Id, DateTimeOffset PostedAt, string? Title, string Text);
