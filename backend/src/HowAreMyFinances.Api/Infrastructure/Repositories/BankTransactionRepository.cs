using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class BankTransactionRepository : IBankTransactionRepository
{
    private readonly string _connectionString;

    public BankTransactionRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    // -------------------------------------------------------------------------------------------
    // Sync
    // -------------------------------------------------------------------------------------------

    public async Task<IReadOnlyList<InsertedBankTransaction>> InsertAsync(
        Guid userId, Guid accountId, IReadOnlyList<NewBankTransaction> transactions)
    {
        var inserted = new List<InsertedBankTransaction>();
        if (transactions.Count == 0)
            return inserted;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        foreach (var row in transactions)
        {
            await using var command = new NpgsqlCommand(
                """
                INSERT INTO public.bank_transactions (
                    user_id, source, bank_account_id, external_id, parse_status, booking_status,
                    direction, amount, currency, booking_date, counterparty_name, counterparty_key,
                    description, merchant_category_code, raw_data)
                SELECT @userId, 'enable_banking', a.id, @externalId, 'parsed', @bookingStatus,
                       @direction, @amount, @currency, @bookingDate, @counterpartyName, @counterpartyKey,
                       @description, @mcc, @rawData
                FROM public.bank_accounts a
                WHERE a.id = @accountId AND a.user_id = @userId
                ON CONFLICT (bank_account_id, external_id) WHERE source = 'enable_banking'
                DO UPDATE SET booking_status = EXCLUDED.booking_status, booking_date = EXCLUDED.booking_date, raw_data = EXCLUDED.raw_data
                WHERE (public.bank_transactions.booking_status = 'pending' AND EXCLUDED.booking_status = 'booked')
                   -- Un-reviewed suggestions follow date fixes in the mapper (e.g. purchase date instead of booking date)
                   OR (public.bank_transactions.review_status = 'pending'
                       AND public.bank_transactions.booking_status = EXCLUDED.booking_status
                       AND public.bank_transactions.booking_date <> EXCLUDED.booking_date)
                RETURNING id, (xmax = 0) AS inserted
                """,
                connection, transaction);

            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("accountId", accountId);
            command.Parameters.AddWithValue("externalId", row.ExternalId);
            command.Parameters.AddWithValue("bookingStatus", row.BookingStatus);
            command.Parameters.AddWithValue("direction", row.Direction);
            command.Parameters.AddWithValue("amount", row.Amount);
            command.Parameters.AddWithValue("currency", row.Currency);
            command.Parameters.AddWithValue("bookingDate", row.BookingDate);
            AddNullableText(command, "counterpartyName", row.CounterpartyName);
            AddNullableText(command, "counterpartyKey", row.CounterpartyKey);
            AddNullableText(command, "description", row.Description);
            AddNullableText(command, "mcc", row.MerchantCategoryCode);
            command.Parameters.Add(new NpgsqlParameter("rawData", NpgsqlDbType.Jsonb) { Value = row.RawJson });

            await using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                inserted.Add(new InsertedBankTransaction(reader.GetGuid(0), row.ExternalId, reader.GetBoolean(1)));
            }
        }

        await transaction.CommitAsync();
        return inserted;
    }

    public async Task<int> DeleteStalePendingAsync(Guid userId, Guid accountId, IReadOnlyCollection<string> currentPendingExternalIds)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            DELETE FROM public.bank_transactions
            WHERE user_id = @userId AND bank_account_id = @accountId AND source = 'enable_banking'
              AND booking_status = 'pending' AND review_status = 'pending'
              AND NOT (external_id = ANY(@externalIds))
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("accountId", accountId);
        command.Parameters.AddWithValue("externalIds", currentPendingExternalIds.ToArray());

        return await command.ExecuteNonQueryAsync();
    }

    public async Task<int> AutoLinkBookedAsync(Guid userId, IReadOnlyCollection<Guid> transactionIds)
    {
        if (transactionIds.Count == 0)
            return 0;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        // Each accepted pending row links at most one booked row and vice versa (two DISTINCT ON passes),
        // and a pending row whose expense/income is already linked to a booked row is not reused.
        await using var command = new NpgsqlCommand(
            """
            WITH target AS (
                SELECT id, bank_account_id, direction, amount, booking_date, counterparty_key
                FROM public.bank_transactions
                WHERE user_id = @userId AND id = ANY(@ids)
                  AND source = 'enable_banking' AND booking_status = 'booked' AND review_status = 'pending'
            ), candidate AS (
                SELECT DISTINCT ON (p.id)
                       t.id AS target_id, p.expense_id, p.income_id,
                       abs(p.booking_date - t.booking_date) AS distance
                FROM target t
                JOIN public.bank_transactions p
                  ON p.user_id = @userId
                 AND p.bank_account_id = t.bank_account_id
                 AND p.source = 'enable_banking'
                 AND p.booking_status = 'pending'
                 AND p.review_status = 'accepted'
                 AND (p.expense_id IS NOT NULL OR p.income_id IS NOT NULL)
                 AND p.direction = t.direction
                 AND p.amount = t.amount
                 AND abs(p.booking_date - t.booking_date) <= 3
                 AND p.counterparty_key IS NOT DISTINCT FROM t.counterparty_key
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.bank_transactions l
                    WHERE l.user_id = @userId AND l.booking_status = 'booked'
                      AND l.review_status IN ('accepted', 'linked')
                      AND ((p.expense_id IS NOT NULL AND l.expense_id = p.expense_id)
                        OR (p.income_id IS NOT NULL AND l.income_id = p.income_id)))
                ORDER BY p.id, distance
            ), chosen AS (
                SELECT DISTINCT ON (target_id) target_id, expense_id, income_id
                FROM candidate
                ORDER BY target_id, distance
            )
            UPDATE public.bank_transactions b
            SET review_status = 'linked', expense_id = c.expense_id, income_id = c.income_id, reviewed_at = now()
            FROM chosen c
            WHERE b.id = c.target_id AND b.user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("ids", transactionIds.ToArray());

        return await command.ExecuteNonQueryAsync();
    }

    public async Task<int> FlagDuplicatesAsync(Guid userId, IReadOnlyCollection<Guid> transactionIds)
    {
        if (transactionIds.Count == 0)
            return 0;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var targets = new List<(Guid Id, decimal Amount, DateOnly BookingDate, string? Key)>();
        await using (var command = new NpgsqlCommand(
            """
            SELECT id, amount, booking_date, counterparty_key
            FROM public.bank_transactions
            WHERE user_id = @userId AND id = ANY(@ids)
              AND parse_status = 'parsed' AND review_status = 'pending' AND direction = 'debit'
              AND possible_duplicate_expense_id IS NULL
            ORDER BY booking_date
            """,
            connection))
        {
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("ids", transactionIds.ToArray());

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                targets.Add((reader.GetGuid(0), reader.GetDecimal(1), reader.GetFieldValue<DateOnly>(2),
                    reader.IsDBNull(3) ? null : reader.GetString(3)));
            }
        }

        if (targets.Count == 0)
            return 0;

        var from = targets.Min(t => t.BookingDate).AddDays(-DuplicateDetector.DayWindow);
        var to = targets.Max(t => t.BookingDate).AddDays(DuplicateDetector.DayWindow);

        // Expenses already created from / linked to a bank row are not duplicates of another one.
        var candidates = new List<DuplicateCandidate>();
        await using (var command = new NpgsqlCommand(
            """
            SELECT e.id, e.item_name, e.amount, e.vendor, e.expense_date, e.is_recurring_instance
            FROM public.expenses e
            WHERE e.user_id = @userId AND e.expense_date BETWEEN @from AND @to
              AND NOT EXISTS (
                  SELECT 1 FROM public.bank_transactions b
                  WHERE b.user_id = @userId AND b.expense_id = e.id)
            """,
            connection))
        {
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("from", from);
            command.Parameters.AddWithValue("to", to);

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                candidates.Add(new DuplicateCandidate(
                    ExpenseId: reader.GetGuid(0),
                    ItemName: reader.GetString(1),
                    Amount: reader.GetDecimal(2),
                    Vendor: reader.IsDBNull(3) ? null : reader.GetString(3),
                    ExpenseDate: reader.GetFieldValue<DateOnly>(4),
                    IsRecurringInstance: reader.GetBoolean(5)));
            }
        }

        if (candidates.Count == 0)
            return 0;

        // An expense already flagged on another pending row is not offered twice.
        var claimed = new HashSet<Guid>();
        await using (var command = new NpgsqlCommand(
            """
            SELECT possible_duplicate_expense_id
            FROM public.bank_transactions
            WHERE user_id = @userId AND review_status = 'pending' AND possible_duplicate_expense_id IS NOT NULL
            """,
            connection))
        {
            command.Parameters.AddWithValue("userId", userId);
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                claimed.Add(reader.GetGuid(0));
            }
        }

        var flagged = 0;
        foreach (var target in targets)
        {
            var match = DuplicateDetector.FindDuplicate(target.Amount, target.BookingDate, target.Key, candidates, claimed);
            if (match is null)
                continue;

            claimed.Add(match.Value);

            await using var update = new NpgsqlCommand(
                """
                UPDATE public.bank_transactions
                SET possible_duplicate_expense_id = @expenseId
                WHERE id = @id AND user_id = @userId
                """,
                connection);
            update.Parameters.AddWithValue("expenseId", match.Value);
            update.Parameters.AddWithValue("id", target.Id);
            update.Parameters.AddWithValue("userId", userId);
            flagged += await update.ExecuteNonQueryAsync();
        }

        return flagged;
    }

    public async Task<int> ApplyRulesAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        // One rule per (counterparty_key, direction): manual rules overwrite AI ones and the AI never
        // overwrites a manual rule, so "manual > ai" holds by construction.
        await using var command = new NpgsqlCommand(
            """
            UPDATE public.bank_transactions t
            SET suggested_category_id = r.category_id,
                suggested_vendor = COALESCE(r.vendor, t.suggested_vendor),
                suggestion_source = 'rule'
            FROM public.bank_counterparty_rules r
            LEFT JOIN public.categories c ON c.id = r.category_id
            WHERE t.user_id = @userId AND r.user_id = @userId
              AND t.parse_status = 'parsed' AND t.review_status = 'pending' AND t.suggestion_source IS NULL
              AND t.counterparty_key IS NOT NULL
              AND r.counterparty_key = t.counterparty_key AND r.direction = t.direction
              AND (
                  (t.direction = 'debit' AND r.category_id IS NOT NULL AND c.user_id = @userId AND c.is_archived = false)
                  OR (t.direction = 'credit' AND r.vendor IS NOT NULL)
              )
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        return await command.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<UncategorisedBankTransaction>> GetUncategorisedPendingDebitsAsync(Guid userId, int limit)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, counterparty_key, direction, counterparty_name, description, merchant_category_code, amount
            FROM public.bank_transactions
            WHERE user_id = @userId AND parse_status = 'parsed' AND review_status = 'pending'
              AND direction = 'debit' AND suggestion_source IS NULL
            ORDER BY booking_date DESC, created_at DESC
            LIMIT @limit
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("limit", limit);

        await using var reader = await command.ExecuteReaderAsync();
        var rows = new List<UncategorisedBankTransaction>();
        while (await reader.ReadAsync())
        {
            rows.Add(new UncategorisedBankTransaction(
                Id: reader.GetGuid(0),
                CounterpartyKey: reader.IsDBNull(1) ? null : reader.GetString(1),
                Direction: reader.GetString(2),
                Counterparty: reader.IsDBNull(3) ? null : reader.GetString(3),
                Description: reader.IsDBNull(4) ? null : reader.GetString(4),
                Mcc: reader.IsDBNull(5) ? null : reader.GetString(5),
                Amount: reader.GetDecimal(6)));
        }

        return rows;
    }

    // -------------------------------------------------------------------------------------------
    // Inbox
    // -------------------------------------------------------------------------------------------

    public async Task<IReadOnlyList<BankTransaction>> GetPendingAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT t.id, t.source, t.bank_account_id, t.direction, t.amount, t.currency, t.booking_date,
                   t.booking_status, t.counterparty_name, t.description, t.review_status,
                   c.id, c.name, t.suggested_vendor, t.suggestion_source,
                   e.id, e.item_name, e.amount, e.expense_date
            FROM public.bank_transactions t
            LEFT JOIN public.categories c
                   ON c.id = t.suggested_category_id AND c.user_id = @userId AND c.is_archived = false
            LEFT JOIN public.expenses e
                   ON e.id = t.possible_duplicate_expense_id AND e.user_id = @userId
            WHERE t.user_id = @userId AND t.parse_status = 'parsed' AND t.review_status = 'pending'
            ORDER BY t.booking_date DESC, t.created_at DESC
            LIMIT 500
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var rows = new List<BankTransaction>();
        while (await reader.ReadAsync())
        {
            PossibleDuplicate? duplicate = reader.IsDBNull(15)
                ? null
                : new PossibleDuplicate(
                    ExpenseId: reader.GetGuid(15),
                    ItemName: reader.GetString(16),
                    Amount: reader.GetDecimal(17),
                    ExpenseDate: reader.GetFieldValue<DateOnly>(18));

            rows.Add(new BankTransaction(
                Id: reader.GetGuid(0),
                Source: reader.GetString(1),
                BankAccountId: reader.IsDBNull(2) ? null : reader.GetGuid(2),
                Direction: reader.GetString(3),
                Amount: reader.GetDecimal(4),
                Currency: reader.GetString(5),
                BookingDate: reader.GetFieldValue<DateOnly>(6),
                BookingStatus: reader.GetString(7),
                CounterpartyName: reader.IsDBNull(8) ? null : reader.GetString(8),
                Description: reader.IsDBNull(9) ? null : reader.GetString(9),
                ReviewStatus: reader.GetString(10),
                SuggestedCategoryId: reader.IsDBNull(11) ? null : reader.GetGuid(11),
                SuggestedCategoryName: reader.IsDBNull(12) ? null : reader.GetString(12),
                SuggestedVendor: reader.IsDBNull(13) ? null : reader.GetString(13),
                SuggestionSource: reader.IsDBNull(14) ? null : reader.GetString(14),
                PossibleDuplicateExpenseId: duplicate?.ExpenseId,
                PossibleDuplicate: duplicate));
        }

        return rows;
    }

    public async Task<PendingCount> GetPendingCountAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT
                count(*) FILTER (WHERE parse_status = 'parsed' AND review_status = 'pending'),
                count(*) FILTER (WHERE source = 'notification' AND parse_status = 'pending')
            FROM public.bank_transactions
            WHERE user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return new PendingCount((int)reader.GetInt64(0), (int)reader.GetInt64(1));
    }

    public async Task<BankTransactionRecord?> GetForReviewAsync(Guid userId, Guid transactionId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        return await GetRecordAsync(connection, null, userId, transactionId, forUpdate: false);
    }

    public async Task<Result<AcceptBankTransactionResponse>> AcceptAsync(
        Guid userId, Guid transactionId, AcceptBankTransactionCommand command)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        var record = await GetRecordAsync(connection, transaction, userId, transactionId, forUpdate: true);
        if (record is null)
            return Result<AcceptBankTransactionResponse>.Failure(BankReviewErrors.NotFound);
        if (record.ReviewStatus != "pending" || record.ParseStatus != "parsed" || record.Amount is null || record.Direction is null)
            return Result<AcceptBankTransactionResponse>.Failure(BankReviewErrors.NotPending);

        var vendor = string.IsNullOrWhiteSpace(command.Vendor) ? null : command.Vendor.Trim();
        var comment = string.IsNullOrWhiteSpace(command.Comment) ? null : command.Comment.Trim();
        Guid? expenseId = null;
        Guid? incomeId = null;
        Guid monthId;

        if (record.Direction == BankDirection.Debit)
        {
            if (command.CategoryId is null || !await CategoryIsUsableAsync(connection, transaction, userId, command.CategoryId.Value))
                return Result<AcceptBankTransactionResponse>.Failure(BankReviewErrors.CategoryNotFound);

            monthId = await MonthService.GetOrCreateMonthIdAsync(connection, transaction, userId, command.Date.Year, command.Date.Month);

            await using (var insert = new NpgsqlCommand(
                """
                INSERT INTO public.expenses (user_id, month_id, category_id, item_name, amount, vendor, expense_date, comment, is_completed)
                VALUES (@userId, @monthId, @categoryId, @itemName, @amount, @vendor, @expenseDate, @comment, true)
                RETURNING id
                """,
                connection, transaction))
            {
                insert.Parameters.AddWithValue("userId", userId);
                insert.Parameters.AddWithValue("monthId", monthId);
                insert.Parameters.AddWithValue("categoryId", command.CategoryId.Value);
                insert.Parameters.AddWithValue("itemName", command.ItemName.Trim());
                insert.Parameters.AddWithValue("amount", record.Amount.Value);
                AddNullableText(insert, "vendor", vendor);
                insert.Parameters.AddWithValue("expenseDate", command.Date);
                AddNullableText(insert, "comment", comment);
                expenseId = (Guid)(await insert.ExecuteScalarAsync())!;
            }

            if (vendor is not null)
            {
                await using var ensureVendor = new NpgsqlCommand(
                    """
                    INSERT INTO public.user_vendors (user_id, name)
                    VALUES (@userId, @name)
                    ON CONFLICT (user_id, name) DO NOTHING
                    """,
                    connection, transaction);
                ensureVendor.Parameters.AddWithValue("userId", userId);
                ensureVendor.Parameters.AddWithValue("name", vendor);
                await ensureVendor.ExecuteNonQueryAsync();
            }

            var changed = record.SuggestionSource is null
                || record.SuggestedCategoryId != command.CategoryId
                || !string.Equals(record.SuggestedVendor?.Trim(), vendor, StringComparison.Ordinal);
            if (changed && record.CounterpartyKey is not null)
            {
                await UpsertManualRuleAsync(connection, transaction, userId, record.CounterpartyKey,
                    BankDirection.Debit, command.CategoryId, vendor);
            }
        }
        else
        {
            var source = command.Source!.Trim();
            monthId = await MonthService.GetOrCreateMonthIdAsync(connection, transaction, userId, command.Date.Year, command.Date.Month);

            await using (var insert = new NpgsqlCommand(
                """
                INSERT INTO public.incomes (user_id, month_id, source, amount, income_date, comment)
                VALUES (@userId, @monthId, @source, @amount, @incomeDate, @comment)
                RETURNING id
                """,
                connection, transaction))
            {
                insert.Parameters.AddWithValue("userId", userId);
                insert.Parameters.AddWithValue("monthId", monthId);
                insert.Parameters.AddWithValue("source", source);
                insert.Parameters.AddWithValue("amount", record.Amount.Value);
                insert.Parameters.AddWithValue("incomeDate", command.Date);
                AddNullableText(insert, "comment", comment);
                incomeId = (Guid)(await insert.ExecuteScalarAsync())!;
            }

            var changed = record.SuggestionSource is null
                || !string.Equals(record.SuggestedVendor?.Trim(), source, StringComparison.Ordinal);
            if (changed && record.CounterpartyKey is not null)
            {
                await UpsertManualRuleAsync(connection, transaction, userId, record.CounterpartyKey,
                    BankDirection.Credit, null, source);
            }
        }

        await using (var update = new NpgsqlCommand(
            """
            UPDATE public.bank_transactions
            SET review_status = 'accepted', expense_id = @expenseId, income_id = @incomeId, reviewed_at = now()
            WHERE id = @id AND user_id = @userId
            """,
            connection, transaction))
        {
            update.Parameters.Add(new NpgsqlParameter("expenseId", NpgsqlDbType.Uuid) { Value = (object?)expenseId ?? DBNull.Value });
            update.Parameters.Add(new NpgsqlParameter("incomeId", NpgsqlDbType.Uuid) { Value = (object?)incomeId ?? DBNull.Value });
            update.Parameters.AddWithValue("id", transactionId);
            update.Parameters.AddWithValue("userId", userId);
            await update.ExecuteNonQueryAsync();
        }

        await transaction.CommitAsync();
        return Result<AcceptBankTransactionResponse>.Success(new AcceptBankTransactionResponse(expenseId, incomeId, monthId));
    }

    public async Task<Result<bool>> DismissAsync(Guid userId, Guid transactionId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using (var command = new NpgsqlCommand(
            """
            UPDATE public.bank_transactions
            SET review_status = 'dismissed', reviewed_at = now()
            WHERE id = @id AND user_id = @userId AND review_status = 'pending' AND parse_status = 'parsed'
            """,
            connection))
        {
            command.Parameters.AddWithValue("id", transactionId);
            command.Parameters.AddWithValue("userId", userId);
            if (await command.ExecuteNonQueryAsync() > 0)
                return Result<bool>.Success(true);
        }

        var record = await GetRecordAsync(connection, null, userId, transactionId, forUpdate: false);
        return Result<bool>.Failure(record is null ? BankReviewErrors.NotFound : BankReviewErrors.NotPending);
    }

    public async Task<Result<bool>> LinkAsync(Guid userId, Guid transactionId, Guid expenseId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        var record = await GetRecordAsync(connection, transaction, userId, transactionId, forUpdate: true);
        if (record is null)
            return Result<bool>.Failure(BankReviewErrors.NotFound);
        if (record.ReviewStatus != "pending" || record.ParseStatus != "parsed")
            return Result<bool>.Failure(BankReviewErrors.NotPending);

        await using (var check = new NpgsqlCommand(
            "SELECT 1 FROM public.expenses WHERE id = @expenseId AND user_id = @userId",
            connection, transaction))
        {
            check.Parameters.AddWithValue("expenseId", expenseId);
            check.Parameters.AddWithValue("userId", userId);
            if (await check.ExecuteScalarAsync() is null)
                return Result<bool>.Failure(BankReviewErrors.ExpenseNotFound);
        }

        await using (var update = new NpgsqlCommand(
            """
            UPDATE public.bank_transactions
            SET review_status = 'linked', expense_id = @expenseId, reviewed_at = now()
            WHERE id = @id AND user_id = @userId
            """,
            connection, transaction))
        {
            update.Parameters.AddWithValue("expenseId", expenseId);
            update.Parameters.AddWithValue("id", transactionId);
            update.Parameters.AddWithValue("userId", userId);
            await update.ExecuteNonQueryAsync();
        }

        await transaction.CommitAsync();
        return Result<bool>.Success(true);
    }

    // -------------------------------------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------------------------------------

    public async Task<IReadOnlyList<InsertedBankNotification>> InsertNotificationsAsync(
        Guid userId, IReadOnlyList<NewBankNotification> notifications)
    {
        var inserted = new List<InsertedBankNotification>();
        if (notifications.Count == 0)
            return inserted;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        foreach (var notification in notifications)
        {
            await using var command = new NpgsqlCommand(
                """
                INSERT INTO public.bank_transactions (
                    user_id, source, external_id, parse_status,
                    notification_title, notification_text, notification_posted_at)
                VALUES (@userId, 'notification', @externalId, 'pending', @title, @text, @postedAt)
                ON CONFLICT (user_id, external_id) WHERE source = 'notification' DO NOTHING
                RETURNING id
                """,
                connection, transaction);

            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("externalId", notification.ExternalId);
            AddNullableText(command, "title", notification.Title);
            command.Parameters.AddWithValue("text", notification.Text);
            command.Parameters.AddWithValue("postedAt", notification.PostedAt.UtcDateTime);

            if (await command.ExecuteScalarAsync() is Guid id)
            {
                inserted.Add(new InsertedBankNotification(id, notification.ExternalId));
            }
        }

        await transaction.CommitAsync();
        return inserted;
    }

    public async Task<IReadOnlyList<PendingBankNotification>> GetStalePendingNotificationsAsync(
        Guid userId, IReadOnlyCollection<Guid> excludeIds, int limit)
    {
        if (limit <= 0)
            return [];

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT t.id, t.notification_posted_at, t.notification_title, t.notification_text
            FROM public.bank_transactions t
            WHERE t.user_id = @userId AND t.source = 'notification' AND t.parse_status = 'pending'
              AND t.notification_text IS NOT NULL
              AND t.created_at < now() - interval '5 minutes'
              AND NOT (t.id = ANY(@excludeIds))
              AND NOT EXISTS (
                  SELECT 1 FROM public.ai_jobs j
                  WHERE j.user_id = @userId AND j.job_type = 'parse_bank_notifications'
                    AND j.status = 'pending' AND j.created_at > now() - interval '5 minutes'
                    AND j.request_body -> 'notifications' @> jsonb_build_array(jsonb_build_object('id', t.id::text)))
            ORDER BY t.notification_posted_at DESC NULLS LAST
            LIMIT @limit
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("excludeIds", excludeIds.ToArray());
        command.Parameters.AddWithValue("limit", limit);

        await using var reader = await command.ExecuteReaderAsync();
        var rows = new List<PendingBankNotification>();
        while (await reader.ReadAsync())
        {
            var postedAt = reader.IsDBNull(1)
                ? DateTimeOffset.UtcNow
                : new DateTimeOffset(DateTime.SpecifyKind(reader.GetDateTime(1), DateTimeKind.Utc));
            rows.Add(new PendingBankNotification(
                Id: reader.GetGuid(0),
                PostedAt: postedAt,
                Title: reader.IsDBNull(2) ? null : reader.GetString(2),
                Text: reader.GetString(3)));
        }

        return rows;
    }

    // -------------------------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------------------------

    private static async Task<BankTransactionRecord?> GetRecordAsync(
        NpgsqlConnection connection, NpgsqlTransaction? transaction, Guid userId, Guid transactionId, bool forUpdate)
    {
        var sql = $"""
            SELECT id, source, parse_status, review_status, direction, amount, booking_date,
                   counterparty_name, counterparty_key, description,
                   suggested_category_id, suggested_vendor, suggestion_source
            FROM public.bank_transactions
            WHERE id = @id AND user_id = @userId
            {(forUpdate ? "FOR UPDATE" : "")}
            """;

        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("id", transactionId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        return new BankTransactionRecord(
            Id: reader.GetGuid(0),
            Source: reader.GetString(1),
            ParseStatus: reader.GetString(2),
            ReviewStatus: reader.GetString(3),
            Direction: reader.IsDBNull(4) ? null : reader.GetString(4),
            Amount: reader.IsDBNull(5) ? null : reader.GetDecimal(5),
            BookingDate: reader.IsDBNull(6) ? null : reader.GetFieldValue<DateOnly>(6),
            CounterpartyName: reader.IsDBNull(7) ? null : reader.GetString(7),
            CounterpartyKey: reader.IsDBNull(8) ? null : reader.GetString(8),
            Description: reader.IsDBNull(9) ? null : reader.GetString(9),
            SuggestedCategoryId: reader.IsDBNull(10) ? null : reader.GetGuid(10),
            SuggestedVendor: reader.IsDBNull(11) ? null : reader.GetString(11),
            SuggestionSource: reader.IsDBNull(12) ? null : reader.GetString(12));
    }

    private static async Task<bool> CategoryIsUsableAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, Guid userId, Guid categoryId)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT 1 FROM public.categories
            WHERE id = @categoryId AND user_id = @userId AND is_archived = false
            FOR KEY SHARE
            """,
            connection, transaction);
        command.Parameters.AddWithValue("categoryId", categoryId);
        command.Parameters.AddWithValue("userId", userId);
        return await command.ExecuteScalarAsync() is not null;
    }

    private static async Task UpsertManualRuleAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, Guid userId,
        string counterpartyKey, string direction, Guid? categoryId, string? vendor)
    {
        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.bank_counterparty_rules (user_id, counterparty_key, direction, category_id, vendor, source, updated_at)
            VALUES (@userId, @counterpartyKey, @direction, @categoryId, @vendor, 'manual', now())
            ON CONFLICT (user_id, counterparty_key, direction) DO UPDATE
            SET category_id = EXCLUDED.category_id, vendor = EXCLUDED.vendor, source = 'manual', updated_at = now()
            """,
            connection, transaction);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("counterpartyKey", counterpartyKey);
        command.Parameters.AddWithValue("direction", direction);
        command.Parameters.Add(new NpgsqlParameter("categoryId", NpgsqlDbType.Uuid) { Value = (object?)categoryId ?? DBNull.Value });
        AddNullableText(command, "vendor", vendor);
        await command.ExecuteNonQueryAsync();
    }

    private static void AddNullableText(NpgsqlCommand command, string name, string? value)
    {
        command.Parameters.Add(new NpgsqlParameter(name, NpgsqlDbType.Text) { Value = (object?)value ?? DBNull.Value });
    }
}
