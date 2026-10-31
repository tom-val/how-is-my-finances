using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Infrastructure.EnableBanking;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Infrastructure;

/// <summary>
/// User-initiated sync: fetch booked and pending transactions from Enable Banking, store new rows,
/// link/flag/categorise what it can, and queue an AI job for the rest.
/// See docs/phases/phase-9-bank-integration.md ("Sync + Categorisation Flow").
/// </summary>
public sealed class BankSyncService : IBankSyncService
{
    public static readonly TimeSpan Cooldown = TimeSpan.FromMinutes(5);
    public const int InitialLookbackDays = 90;
    public const int OverlapDays = 3;
    public const int MaxPagesPerStatus = 10;
    public const int MinCategoriesForAi = 3;
    public const int MaxAiTransactions = 200;
    public const int MaxAiDescriptionLength = 140;

    private readonly IBankConnectionRepository _connectionRepository;
    private readonly IBankTransactionRepository _transactionRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IEnableBankingClient _client;
    private readonly IAiJobDispatcher _aiJobDispatcher;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<BankSyncService> _logger;

    public BankSyncService(
        IBankConnectionRepository connectionRepository,
        IBankTransactionRepository transactionRepository,
        ICategoryRepository categoryRepository,
        IEnableBankingClient client,
        IAiJobDispatcher aiJobDispatcher,
        TimeProvider timeProvider,
        ILogger<BankSyncService> logger)
    {
        _connectionRepository = connectionRepository;
        _transactionRepository = transactionRepository;
        _categoryRepository = categoryRepository;
        _client = client;
        _aiJobDispatcher = aiJobDispatcher;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<SyncResult> SyncAsync(Guid userId, Guid? connectionId, PsuContext psu, CancellationToken cancellationToken = default)
    {
        var now = _timeProvider.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);

        var imported = 0;
        var skipped = 0;
        var expiredConnections = 0;
        var cooldown = false;
        var rateLimited = false;
        var anySynced = false;
        var newIds = new List<Guid>();

        var connections = await _connectionRepository.GetActiveAsync(userId, connectionId);
        var ownIbanHashes = connections.Count > 0
            ? await _connectionRepository.GetOwnIbanHashesAsync(userId)
            : new HashSet<string>();

        foreach (var connection in connections)
        {
            if (connection.ConsentExpiresAt is { } expiresAt && expiresAt < now.UtcDateTime)
            {
                await _connectionRepository.SetStatusAsync(userId, connection.Id, BankConnectionStatuses.Expired, "Consent expired");
                expiredConnections++;
                continue;
            }

            if (connection.LastSyncedAt is { } lastSynced && lastSynced > now.UtcDateTime - Cooldown)
            {
                cooldown = true;
                continue;
            }

            anySynced = true;
            string? error = null;
            var expired = false;

            var accounts = await _connectionRepository.GetEnabledAccountsAsync(userId, connection.Id);
            foreach (var account in accounts)
            {
                var outcome = await SyncAccountAsync(userId, account, ownIbanHashes, psu, today, cancellationToken);
                imported += outcome.Imported;
                skipped += outcome.Skipped;
                newIds.AddRange(outcome.NewBookedIds);
                newIds.AddRange(outcome.NewPendingIds);

                if (outcome.Error == EnableBankingErrors.Expired)
                {
                    expired = true;
                    break;
                }

                if (outcome.Error == EnableBankingErrors.RateLimited)
                {
                    rateLimited = true;
                    error = "The bank's rate limit was reached; try again in a few hours";
                    break; // the same bank will refuse the other accounts too
                }

                error ??= outcome.Error;
            }

            if (expired)
            {
                await _connectionRepository.SetStatusAsync(userId, connection.Id, BankConnectionStatuses.Expired, "Bank session expired");
                expiredConnections++;
            }
            else
            {
                await _connectionRepository.UpdateSyncStateAsync(userId, connection.Id, now.UtcDateTime, error);
            }
        }

        if (newIds.Count > 0)
        {
            await _transactionRepository.AutoLinkBookedAsync(userId, newIds);
            await _transactionRepository.FlagDuplicatesAsync(userId, newIds);
        }

        var categorisedByRule = 0;
        Guid? jobId = null;
        if (anySynced)
        {
            categorisedByRule = await _transactionRepository.ApplyRulesAsync(userId);
            jobId = await CreateCategoriseJobAsync(userId);
        }

        return new SyncResult(
            Imported: imported,
            Skipped: skipped,
            CategorisedByRule: categorisedByRule,
            JobId: jobId,
            Cooldown: cooldown,
            ExpiredConnections: expiredConnections,
            RateLimited: rateLimited);
    }

    private sealed record AccountOutcome(
        int Imported, int Skipped, List<Guid> NewBookedIds, List<Guid> NewPendingIds, string? Error);

    private sealed record FetchOutcome(List<EbTransaction> Transactions, bool Complete, string? Error);

    private async Task<AccountOutcome> SyncAccountAsync(
        Guid userId, BankAccountRecord account, IReadOnlySet<string> ownIbanHashes, PsuContext psu,
        DateOnly today, CancellationToken cancellationToken)
    {
        var dateFrom = (account.SyncedUntil ?? today.AddDays(-InitialLookbackDays)).AddDays(-OverlapDays);

        // Booked transactions. A failure here stops the account (nothing is stored half-way).
        var booked = await FetchAsync(account.ExternalUid, dateFrom, EbTransactionStatus.Booked, psu, cancellationToken);
        if (booked.Error is not null && booked.Transactions.Count == 0)
            return new AccountOutcome(0, 0, [], [], booked.Error);

        // Pending (reserved) card payments. Some banks don't support the filter: that is not fatal,
        // unless the bank says the session expired or the rate limit was hit.
        var pending = await FetchAsync(account.ExternalUid, dateFrom, EbTransactionStatus.Pending, psu, cancellationToken);
        if (pending.Error is EnableBankingErrors.Expired or EnableBankingErrors.RateLimited)
            return new AccountOutcome(0, 0, [], [], pending.Error);

        var skipped = 0;
        var rows = new Dictionary<string, NewBankTransaction>(StringComparer.Ordinal);
        var currentPendingIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var (transactions, requested) in new[]
                 {
                     (booked.Transactions, EbTransactionStatus.Booked),
                     (pending.Transactions, EbTransactionStatus.Pending)
                 })
        {
            foreach (var transaction in transactions)
            {
                var row = TransactionMapper.Map(transaction, requested, today);
                if (row is null)
                {
                    skipped++;
                    continue;
                }

                if (IsOwnTransfer(row, ownIbanHashes))
                {
                    skipped++;
                    continue;
                }

                if (row.BookingStatus == BankBookingStatus.Pending)
                    currentPendingIds.Add(row.ExternalId);

                // The same id can come back from both requests; booked wins.
                if (!rows.TryGetValue(row.ExternalId, out var existing)
                    || (existing.BookingStatus == BankBookingStatus.Pending && row.BookingStatus == BankBookingStatus.Booked))
                {
                    rows[row.ExternalId] = row;
                }
            }
        }

        // Booked rows first, so a pending row can't block its booked counterpart.
        var ordered = rows.Values
            .OrderBy(r => r.BookingStatus == BankBookingStatus.Booked ? 0 : 1)
            .ToList();

        var inserted = await _transactionRepository.InsertAsync(userId, account.Id, ordered);
        var statusById = ordered.ToDictionary(r => r.ExternalId, r => r.BookingStatus, StringComparer.Ordinal);
        var newRows = inserted.Where(i => i.IsNew).ToList();
        var newBooked = newRows.Where(i => statusById[i.ExternalId] == BankBookingStatus.Booked).Select(i => i.Id).ToList();
        var newPending = newRows.Where(i => statusById[i.ExternalId] == BankBookingStatus.Pending).Select(i => i.Id).ToList();
        skipped += ordered.Count - newRows.Count;

        // Pending rows the bank no longer lists were booked (under another id) or reversed.
        if (pending.Complete && pending.Error is null)
        {
            var removed = await _transactionRepository.DeleteStalePendingAsync(userId, account.Id, currentPendingIds);
            if (removed > 0)
                _logger.LogInformation("[BankSync] Removed {Count} stale pending rows for account {AccountId}", removed, account.Id);
        }

        // Only advance when every page of booked transactions was read.
        if (booked.Complete && booked.Error is null)
            await _connectionRepository.UpdateAccountSyncedUntilAsync(userId, account.Id, today);

        return new AccountOutcome(newRows.Count, skipped, newBooked, newPending, booked.Error);
    }

    private async Task<FetchOutcome> FetchAsync(
        string accountUid, DateOnly dateFrom, string status, PsuContext psu, CancellationToken cancellationToken)
    {
        var transactions = new List<EbTransaction>();
        string? continuationKey = null;

        for (var page = 0; page < MaxPagesPerStatus; page++)
        {
            var result = await _client.GetTransactionsAsync(accountUid, dateFrom, null, status, continuationKey, psu, cancellationToken);
            if (!result.IsSuccess)
            {
                _logger.LogWarning("[BankSync] Fetching {Status} transactions failed: {Error}", status, result.Error);
                return new FetchOutcome(transactions, false, result.Error);
            }

            transactions.AddRange(result.Value!.Transactions);
            continuationKey = result.Value.ContinuationKey;
            if (continuationKey is null)
                return new FetchOutcome(transactions, true, null);
        }

        _logger.LogWarning("[BankSync] Stopped after {Pages} pages of {Status} transactions", MaxPagesPerStatus, status);
        return new FetchOutcome(transactions, false, null);
    }

    /// <summary>A transfer to or from another of the user's linked accounts is not an expense or income.</summary>
    public static bool IsOwnTransfer(NewBankTransaction row, IReadOnlySet<string> ownIbanHashes) =>
        row.CounterpartyIbanHash is not null && ownIbanHashes.Contains(row.CounterpartyIbanHash);

    private async Task<Guid?> CreateCategoriseJobAsync(Guid userId)
    {
        var uncategorised = await _transactionRepository.GetUncategorisedPendingDebitsAsync(userId, MaxAiTransactions);
        if (uncategorised.Count == 0)
            return null;

        var categories = (await _categoryRepository.GetAllAsync(userId))
            .Where(c => !c.IsArchived)
            .Select(c => new AiJobCategory(c.Id, c.Name))
            .ToList();
        if (categories.Count < MinCategoriesForAi)
            return null;

        var request = new CategoriseJobRequest(
            categories,
            uncategorised.Select(t => new CategoriseJobTransaction(
                Id: t.Id,
                CounterpartyKey: t.CounterpartyKey,
                Direction: t.Direction,
                Counterparty: t.Counterparty,
                Description: t.Description is { Length: > MaxAiDescriptionLength } d ? d[..MaxAiDescriptionLength] : t.Description,
                Mcc: t.Mcc,
                Amount: t.Amount)).ToList());

        return await _aiJobDispatcher.DispatchAsync(userId, AiJobTypes.CategoriseBankTransactions, request);
    }
}
