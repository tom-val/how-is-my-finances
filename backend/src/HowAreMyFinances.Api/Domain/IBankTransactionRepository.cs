using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IBankTransactionRepository
{
    // --- Sync ---

    /// <summary>
    /// Inserts new Enable Banking rows (ON CONFLICT DO NOTHING). An existing pending-booking row whose
    /// id comes back booked is upgraded in place and returned with <c>IsNew = false</c>.
    /// </summary>
    Task<IReadOnlyList<InsertedBankTransaction>> InsertAsync(Guid userId, Guid accountId, IReadOnlyList<NewBankTransaction> transactions);

    /// <summary>Deletes un-reviewed pending-booking rows of the account that are no longer in the bank's pending list.</summary>
    Task<int> DeleteStalePendingAsync(Guid userId, Guid accountId, IReadOnlyCollection<string> currentPendingExternalIds);

    /// <summary>
    /// Links new booked rows to an accepted pending-booking row (same account, direction, amount and
    /// counterparty key, ±3 days) so the same payment is never suggested twice.
    /// </summary>
    Task<int> AutoLinkBookedAsync(Guid userId, IReadOnlyCollection<Guid> transactionIds);

    /// <summary>Sets possible_duplicate_expense_id on pending debits that match an existing expense.</summary>
    Task<int> FlagDuplicatesAsync(Guid userId, IReadOnlyCollection<Guid> transactionIds);

    /// <summary>Applies counterparty rules to pending rows without a suggestion (suggestion_source = 'rule').</summary>
    Task<int> ApplyRulesAsync(Guid userId);

    Task<IReadOnlyList<UncategorisedBankTransaction>> GetUncategorisedPendingDebitsAsync(Guid userId, int limit);

    // --- Inbox ---

    Task<IReadOnlyList<BankTransaction>> GetPendingAsync(Guid userId);
    Task<PendingCount> GetPendingCountAsync(Guid userId);
    Task<BankTransactionRecord?> GetForReviewAsync(Guid userId, Guid transactionId);

    /// <summary>
    /// In one database transaction: get-or-create the month, insert the expense (debit) or income
    /// (credit), ensure the vendor, mark the row accepted and store a manual counterparty rule when the
    /// user changed (or had no) suggestion. Errors: <see cref="BankReviewErrors"/>.
    /// </summary>
    Task<Result<AcceptBankTransactionResponse>> AcceptAsync(Guid userId, Guid transactionId, AcceptBankTransactionCommand command);

    Task<Result<bool>> DismissAsync(Guid userId, Guid transactionId);
    Task<Result<bool>> LinkAsync(Guid userId, Guid transactionId, Guid expenseId);

    // --- Notifications ---

    /// <summary>Inserts notification rows (parse_status 'pending'); already-uploaded ids are skipped.</summary>
    Task<IReadOnlyList<InsertedBankNotification>> InsertNotificationsAsync(Guid userId, IReadOnlyList<NewBankNotification> notifications);

    /// <summary>
    /// Older notification rows still waiting for the AI (a whole parse job failed or was never sent):
    /// parse_status 'pending', uploaded more than 5 minutes ago, and not part of a parse job that is
    /// itself still pending and younger than 5 minutes.
    /// </summary>
    Task<IReadOnlyList<PendingBankNotification>> GetStalePendingNotificationsAsync(Guid userId, IReadOnlyCollection<Guid> excludeIds, int limit);
}
