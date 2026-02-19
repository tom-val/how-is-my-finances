using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class ExpenseRepository : IExpenseRepository
{
    private readonly string _connectionString;

    public ExpenseRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<IReadOnlyList<ExpenseWithCategory>> GetAllByMonthAsync(Guid userId, Guid monthId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT
                e.id, e.user_id, e.month_id, e.category_id,
                e.item_name, e.amount, e.vendor, e.expense_date,
                e.comment, e.is_recurring_instance,
                c.name AS category_name, c.icon AS category_icon,
                e.created_at, e.updated_at
            FROM public.expenses e
            INNER JOIN public.categories c ON c.id = e.category_id
            WHERE e.user_id = @userId AND e.month_id = @monthId
            ORDER BY e.expense_date DESC, e.created_at DESC
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("monthId", monthId);

        await using var reader = await command.ExecuteReaderAsync();
        var expenses = new List<ExpenseWithCategory>();

        while (await reader.ReadAsync())
        {
            expenses.Add(ReadExpenseWithCategory(reader));
        }

        return expenses;
    }

    public async Task<ExpenseWithCategory> CreateAsync(Guid userId, Guid monthId, CreateExpenseRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            WITH inserted AS (
                INSERT INTO public.expenses (user_id, month_id, category_id, item_name, amount, vendor, expense_date, comment)
                VALUES (@userId, @monthId, @categoryId, @itemName, @amount, @vendor, @expenseDate, @comment)
                RETURNING *
            )
            SELECT
                i.id, i.user_id, i.month_id, i.category_id,
                i.item_name, i.amount, i.vendor, i.expense_date,
                i.comment, i.is_recurring_instance,
                c.name AS category_name, c.icon AS category_icon,
                i.created_at, i.updated_at
            FROM inserted i
            INNER JOIN public.categories c ON c.id = i.category_id
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("monthId", monthId);
        command.Parameters.AddWithValue("categoryId", request.CategoryId);
        command.Parameters.AddWithValue("itemName", request.ItemName);
        command.Parameters.AddWithValue("amount", request.Amount);
        command.Parameters.AddWithValue("vendor", (object?)request.Vendor ?? DBNull.Value);
        command.Parameters.AddWithValue("expenseDate", request.ExpenseDate);
        command.Parameters.AddWithValue("comment", (object?)request.Comment ?? DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();

        return ReadExpenseWithCategory(reader);
    }

    public async Task<ExpenseWithCategory?> UpdateAsync(Guid userId, Guid expenseId, UpdateExpenseRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var setClauses = new List<string>();
        var parameters = new List<NpgsqlParameter>
        {
            new("userId", userId),
            new("expenseId", expenseId)
        };

        if (request.ItemName is not null)
        {
            setClauses.Add("item_name = @itemName");
            parameters.Add(new NpgsqlParameter("itemName", request.ItemName));
        }

        if (request.Amount.HasValue)
        {
            setClauses.Add("amount = @amount");
            parameters.Add(new NpgsqlParameter("amount", request.Amount.Value));
        }

        if (request.CategoryId.HasValue)
        {
            setClauses.Add("category_id = @categoryId");
            parameters.Add(new NpgsqlParameter("categoryId", request.CategoryId.Value));
        }

        if (request.Vendor is not null)
        {
            setClauses.Add("vendor = @vendor");
            parameters.Add(new NpgsqlParameter("vendor", request.Vendor));
        }

        if (request.ExpenseDate.HasValue)
        {
            setClauses.Add("expense_date = @expenseDate");
            parameters.Add(new NpgsqlParameter("expenseDate", request.ExpenseDate.Value));
        }

        if (request.Comment is not null)
        {
            setClauses.Add("comment = @comment");
            parameters.Add(new NpgsqlParameter("comment", request.Comment));
        }

        if (setClauses.Count == 0)
        {
            return await GetByIdAsync(connection, userId, expenseId);
        }

        var sql = $"""
            WITH updated AS (
                UPDATE public.expenses
                SET {string.Join(", ", setClauses)}
                WHERE id = @expenseId AND user_id = @userId
                RETURNING *
            )
            SELECT
                u.id, u.user_id, u.month_id, u.category_id,
                u.item_name, u.amount, u.vendor, u.expense_date,
                u.comment, u.is_recurring_instance,
                c.name AS category_name, c.icon AS category_icon,
                u.created_at, u.updated_at
            FROM updated u
            INNER JOIN public.categories c ON c.id = u.category_id
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddRange(parameters.ToArray());

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return ReadExpenseWithCategory(reader);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid expenseId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            DELETE FROM public.expenses
            WHERE id = @expenseId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("expenseId", expenseId);
        command.Parameters.AddWithValue("userId", userId);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<IReadOnlyList<string>> GetVendorsAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT DISTINCT vendor
            FROM public.expenses
            WHERE user_id = @userId AND vendor IS NOT NULL
            ORDER BY vendor
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var vendors = new List<string>();

        while (await reader.ReadAsync())
        {
            vendors.Add(reader.GetString(0));
        }

        return vendors;
    }

    private static async Task<ExpenseWithCategory?> GetByIdAsync(NpgsqlConnection connection, Guid userId, Guid expenseId)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT
                e.id, e.user_id, e.month_id, e.category_id,
                e.item_name, e.amount, e.vendor, e.expense_date,
                e.comment, e.is_recurring_instance,
                c.name AS category_name, c.icon AS category_icon,
                e.created_at, e.updated_at
            FROM public.expenses e
            INNER JOIN public.categories c ON c.id = e.category_id
            WHERE e.id = @expenseId AND e.user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("expenseId", expenseId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return ReadExpenseWithCategory(reader);
    }

    private static ExpenseWithCategory ReadExpenseWithCategory(NpgsqlDataReader reader)
    {
        return new ExpenseWithCategory(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            MonthId: reader.GetGuid(2),
            CategoryId: reader.GetGuid(3),
            ItemName: reader.GetString(4),
            Amount: reader.GetDecimal(5),
            Vendor: reader.IsDBNull(6) ? null : reader.GetString(6),
            ExpenseDate: reader.GetFieldValue<DateOnly>(7),
            Comment: reader.IsDBNull(8) ? null : reader.GetString(8),
            IsRecurringInstance: reader.GetBoolean(9),
            CategoryName: reader.GetString(10),
            CategoryIcon: reader.IsDBNull(11) ? null : reader.GetString(11),
            CreatedAt: reader.GetDateTime(12),
            UpdatedAt: reader.GetDateTime(13)
        );
    }
}
