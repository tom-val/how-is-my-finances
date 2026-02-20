using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class RecurringExpenseRepository : IRecurringExpenseRepository
{
    private readonly string _connectionString;

    public RecurringExpenseRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<IReadOnlyList<RecurringExpenseWithCategory>> GetAllAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT
                r.id, r.user_id, r.category_id,
                r.item_name, r.amount, r.vendor, r.comment,
                r.day_of_month, r.is_active,
                c.name AS category_name, c.icon AS category_icon,
                r.created_at, r.updated_at
            FROM public.recurring_expenses r
            INNER JOIN public.categories c ON c.id = r.category_id
            WHERE r.user_id = @userId
            ORDER BY r.is_active DESC, r.item_name
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var items = new List<RecurringExpenseWithCategory>();

        while (await reader.ReadAsync())
        {
            items.Add(ReadRecurringExpenseWithCategory(reader));
        }

        return items;
    }

    public async Task<RecurringExpenseWithCategory> CreateAsync(Guid userId, CreateRecurringExpenseRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            WITH inserted AS (
                INSERT INTO public.recurring_expenses (user_id, category_id, item_name, amount, vendor, comment, day_of_month)
                VALUES (@userId, @categoryId, @itemName, @amount, @vendor, @comment, @dayOfMonth)
                RETURNING *
            )
            SELECT
                i.id, i.user_id, i.category_id,
                i.item_name, i.amount, i.vendor, i.comment,
                i.day_of_month, i.is_active,
                c.name AS category_name, c.icon AS category_icon,
                i.created_at, i.updated_at
            FROM inserted i
            INNER JOIN public.categories c ON c.id = i.category_id
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("categoryId", request.CategoryId);
        command.Parameters.AddWithValue("itemName", request.ItemName);
        command.Parameters.AddWithValue("amount", request.Amount);
        command.Parameters.AddWithValue("vendor", (object?)request.Vendor ?? DBNull.Value);
        command.Parameters.AddWithValue("comment", (object?)request.Comment ?? DBNull.Value);
        command.Parameters.AddWithValue("dayOfMonth", request.DayOfMonth);

        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();

        return ReadRecurringExpenseWithCategory(reader);
    }

    public async Task<RecurringExpenseWithCategory?> UpdateAsync(Guid userId, Guid id, UpdateRecurringExpenseRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var setClauses = new List<string>();
        var parameters = new List<NpgsqlParameter>
        {
            new("userId", userId),
            new("id", id)
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

        if (request.Comment is not null)
        {
            setClauses.Add("comment = @comment");
            parameters.Add(new NpgsqlParameter("comment", request.Comment));
        }

        if (request.DayOfMonth.HasValue)
        {
            setClauses.Add("day_of_month = @dayOfMonth");
            parameters.Add(new NpgsqlParameter("dayOfMonth", request.DayOfMonth.Value));
        }

        if (request.IsActive.HasValue)
        {
            setClauses.Add("is_active = @isActive");
            parameters.Add(new NpgsqlParameter("isActive", request.IsActive.Value));
        }

        if (setClauses.Count == 0)
        {
            return await GetByIdAsync(connection, userId, id);
        }

        var sql = $"""
            WITH updated AS (
                UPDATE public.recurring_expenses
                SET {string.Join(", ", setClauses)}
                WHERE id = @id AND user_id = @userId
                RETURNING *
            )
            SELECT
                u.id, u.user_id, u.category_id,
                u.item_name, u.amount, u.vendor, u.comment,
                u.day_of_month, u.is_active,
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

        return ReadRecurringExpenseWithCategory(reader);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            DELETE FROM public.recurring_expenses
            WHERE id = @id AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("userId", userId);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<IReadOnlyList<RecurringExpense>> GetActiveAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT
                id, user_id, category_id,
                item_name, amount, vendor, comment,
                day_of_month, is_active,
                created_at, updated_at
            FROM public.recurring_expenses
            WHERE user_id = @userId AND is_active = true
            ORDER BY item_name
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var items = new List<RecurringExpense>();

        while (await reader.ReadAsync())
        {
            items.Add(ReadRecurringExpense(reader));
        }

        return items;
    }

    private static async Task<RecurringExpenseWithCategory?> GetByIdAsync(NpgsqlConnection connection, Guid userId, Guid id)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT
                r.id, r.user_id, r.category_id,
                r.item_name, r.amount, r.vendor, r.comment,
                r.day_of_month, r.is_active,
                c.name AS category_name, c.icon AS category_icon,
                r.created_at, r.updated_at
            FROM public.recurring_expenses r
            INNER JOIN public.categories c ON c.id = r.category_id
            WHERE r.id = @id AND r.user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return ReadRecurringExpenseWithCategory(reader);
    }

    private static RecurringExpenseWithCategory ReadRecurringExpenseWithCategory(NpgsqlDataReader reader)
    {
        return new RecurringExpenseWithCategory(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            CategoryId: reader.GetGuid(2),
            ItemName: reader.GetString(3),
            Amount: reader.GetDecimal(4),
            Vendor: reader.IsDBNull(5) ? null : reader.GetString(5),
            Comment: reader.IsDBNull(6) ? null : reader.GetString(6),
            DayOfMonth: reader.GetInt32(7),
            IsActive: reader.GetBoolean(8),
            CategoryName: reader.GetString(9),
            CategoryIcon: reader.IsDBNull(10) ? null : reader.GetString(10),
            CreatedAt: reader.GetDateTime(11),
            UpdatedAt: reader.GetDateTime(12)
        );
    }

    private static RecurringExpense ReadRecurringExpense(NpgsqlDataReader reader)
    {
        return new RecurringExpense(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            CategoryId: reader.GetGuid(2),
            ItemName: reader.GetString(3),
            Amount: reader.GetDecimal(4),
            Vendor: reader.IsDBNull(5) ? null : reader.GetString(5),
            Comment: reader.IsDBNull(6) ? null : reader.GetString(6),
            DayOfMonth: reader.GetInt32(7),
            IsActive: reader.GetBoolean(8),
            CreatedAt: reader.GetDateTime(9),
            UpdatedAt: reader.GetDateTime(10)
        );
    }
}
