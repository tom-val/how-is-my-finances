using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure;

/// <summary>
/// Month creation shared by POST /v1/months and bank-transaction accept: a new month always gets
/// its expenses generated from the user's active recurring templates.
/// </summary>
public sealed class MonthService : IMonthService
{
    private readonly IMonthRepository _monthRepository;
    private readonly IRecurringExpenseRepository _recurringExpenseRepository;
    private readonly IExpenseRepository _expenseRepository;

    public MonthService(
        IMonthRepository monthRepository,
        IRecurringExpenseRepository recurringExpenseRepository,
        IExpenseRepository expenseRepository)
    {
        _monthRepository = monthRepository;
        _recurringExpenseRepository = recurringExpenseRepository;
        _expenseRepository = expenseRepository;
    }

    public async Task<Month> CreateAsync(Guid userId, CreateMonthRequest request)
    {
        var month = await _monthRepository.CreateAsync(userId, request);
        await GenerateRecurringExpensesAsync(userId, month);
        return month;
    }

    public async Task<Month> GetOrCreateAsync(Guid userId, int year, int month)
    {
        var existing = await _monthRepository.GetByYearMonthAsync(userId, year, month);
        if (existing is not null)
            return existing;

        var created = await _monthRepository.CreateIfNotExistsAsync(userId, new CreateMonthRequest(year, month, 0m));
        if (created is not null)
        {
            await GenerateRecurringExpensesAsync(userId, created);
            return created;
        }

        // Lost a race with a concurrent create: the other request generated the recurring expenses.
        return await _monthRepository.GetByYearMonthAsync(userId, year, month)
            ?? throw new InvalidOperationException($"Month {year}-{month} vanished during get-or-create");
    }

    private async Task GenerateRecurringExpensesAsync(Guid userId, Month month)
    {
        var templates = await _recurringExpenseRepository.GetActiveAsync(userId);
        foreach (var template in templates)
        {
            var expenseDate = new DateOnly(month.Year, month.MonthNumber, template.DayOfMonth);
            await _expenseRepository.CreateFromRecurringAsync(userId, month.Id, template, expenseDate);
        }
    }

    /// <summary>
    /// Transaction-aware get-or-create used inside the bank accept transaction. Mirrors
    /// <see cref="GetOrCreateAsync"/>: the month and its recurring expenses are created in the same
    /// statement, and a concurrent create is handled by <c>ON CONFLICT DO NOTHING</c> + select.
    /// </summary>
    public static async Task<Guid> GetOrCreateMonthIdAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, Guid userId, int year, int month)
    {
        await using (var select = new NpgsqlCommand(
            "SELECT id FROM public.months WHERE user_id = @userId AND year = @year AND month = @month",
            connection, transaction))
        {
            select.Parameters.AddWithValue("userId", userId);
            select.Parameters.AddWithValue("year", year);
            select.Parameters.AddWithValue("month", month);
            if (await select.ExecuteScalarAsync() is Guid existingId)
                return existingId;
        }

        await using (var insert = new NpgsqlCommand(
            """
            WITH new_month AS (
                INSERT INTO public.months (user_id, year, month, salary)
                VALUES (@userId, @year, @month, 0)
                ON CONFLICT (user_id, year, month) DO NOTHING
                RETURNING id
            ), recurring AS (
                INSERT INTO public.expenses (user_id, month_id, category_id, item_name, amount, vendor, expense_date,
                                             comment, is_recurring_instance, recurring_expense_id, is_completed)
                SELECT r.user_id, nm.id, r.category_id, r.item_name, r.amount, r.vendor,
                       make_date(@year, @month, r.day_of_month), r.comment, true, r.id, NOT r.is_manual
                FROM public.recurring_expenses r
                CROSS JOIN new_month nm
                WHERE r.user_id = @userId AND r.is_active = true
            )
            SELECT id FROM new_month
            """,
            connection, transaction))
        {
            insert.Parameters.AddWithValue("userId", userId);
            insert.Parameters.AddWithValue("year", year);
            insert.Parameters.AddWithValue("month", month);
            if (await insert.ExecuteScalarAsync() is Guid newId)
                return newId;
        }

        await using var reselect = new NpgsqlCommand(
            "SELECT id FROM public.months WHERE user_id = @userId AND year = @year AND month = @month",
            connection, transaction);
        reselect.Parameters.AddWithValue("userId", userId);
        reselect.Parameters.AddWithValue("year", year);
        reselect.Parameters.AddWithValue("month", month);
        return (Guid)(await reselect.ExecuteScalarAsync()
            ?? throw new InvalidOperationException($"Month {year}-{month} vanished during get-or-create"));
    }
}
