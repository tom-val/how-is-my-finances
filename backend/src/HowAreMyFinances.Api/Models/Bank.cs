namespace HowAreMyFinances.Api.Models;

// API contract for the bank integration. Serialises (camelCase) to exactly shared/types/bank.ts.

public sealed record Aspsp(
    string Name,
    string Country,
    string? Logo,
    int? MaximumConsentDays
);

public sealed record BankAccount(
    Guid Id,
    string? IbanMasked,
    string? Name,
    string Currency,
    bool IsEnabled,
    DateOnly? SyncedUntil
);

public sealed record BankConnection(
    Guid Id,
    string AspspName,
    string AspspCountry,
    string Status,
    DateTime? ConsentExpiresAt,
    DateTime? LastSyncedAt,
    string? LastSyncError,
    IReadOnlyList<BankAccount> Accounts
);

public sealed record StartBankConnectionRequest(string? AspspName, string? AspspCountry, string? Client);

public sealed record StartBankConnectionResponse(string RedirectUrl);

public sealed record CompleteBankConnectionRequest(string? Code, string? State);

public sealed record UpdateBankAccountRequest(bool IsEnabled);

public sealed record SyncRequest(Guid? ConnectionId);

public sealed record SyncResult(
    int Imported,
    int Skipped,
    int CategorisedByRule,
    Guid? JobId,
    bool Cooldown,
    int ExpiredConnections,
    bool RateLimited
);

public sealed record AiJobStatus(string Status, string? Error);

public sealed record PossibleDuplicate(
    Guid ExpenseId,
    string ItemName,
    decimal Amount,
    DateOnly ExpenseDate
);

public sealed record BankTransaction(
    Guid Id,
    string Source,
    Guid? BankAccountId,
    string Direction,
    decimal Amount,
    string Currency,
    DateOnly BookingDate,
    string BookingStatus,
    string? CounterpartyName,
    string? Description,
    string ReviewStatus,
    Guid? SuggestedCategoryId,
    string? SuggestedCategoryName,
    string? SuggestedVendor,
    string? SuggestionSource,
    Guid? PossibleDuplicateExpenseId,
    PossibleDuplicate? PossibleDuplicate
);

public sealed record PendingCount(int Count, int Parsing);

public sealed record AcceptBankTransactionRequest(
    string? ItemName,
    Guid? CategoryId,
    string? Vendor,
    string? Comment,
    DateOnly? Date,
    string? Source
);

public sealed record AcceptBankTransactionResponse(Guid? ExpenseId, Guid? IncomeId, Guid MonthId);

public sealed record LinkBankTransactionRequest(Guid ExpenseId);

public sealed record AcceptBulkRequest(IReadOnlyList<Guid>? Ids);

public sealed record AcceptBulkResponse(int Accepted, int Skipped);

public sealed record BankNotificationInput(
    string? ExternalId,
    DateTimeOffset? PostedAt,
    string? Title,
    string? Text
);

public sealed record UploadBankNotificationsRequest(IReadOnlyList<BankNotificationInput>? Notifications);

public sealed record UploadBankNotificationsResponse(int Received, Guid? JobId);

// AI job request bodies (stored in ai_jobs.request_body, read by backend/src/ai-processor)

public sealed record AiJobCategory(Guid Id, string Name);

public sealed record CategoriseJobTransaction(
    Guid Id,
    string? CounterpartyKey,
    string Direction,
    string? Counterparty,
    string? Description,
    string? Mcc,
    decimal Amount
);

public sealed record CategoriseJobRequest(
    IReadOnlyList<AiJobCategory> Categories,
    IReadOnlyList<CategoriseJobTransaction> Transactions
);

public sealed record ParseNotificationsJobNotification(
    Guid Id,
    DateTimeOffset PostedAt,
    string? Title,
    string Text
);

public sealed record ParseNotificationsJobRequest(
    IReadOnlyList<AiJobCategory> Categories,
    IReadOnlyList<ParseNotificationsJobNotification> Notifications
);
