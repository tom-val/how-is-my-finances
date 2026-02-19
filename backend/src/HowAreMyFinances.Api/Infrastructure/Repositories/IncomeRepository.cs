using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class IncomeRepository : IIncomeRepository
{
    private readonly string _connectionString;

    public IncomeRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<IReadOnlyList<Income>> GetAllByMonthAsync(Guid userId, Guid monthId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, user_id, month_id, source, amount, income_date, comment, created_at, updated_at
            FROM public.incomes
            WHERE user_id = @userId AND month_id = @monthId
            ORDER BY income_date DESC, created_at DESC
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("monthId", monthId);

        await using var reader = await command.ExecuteReaderAsync();
        var incomes = new List<Income>();

        while (await reader.ReadAsync())
        {
            incomes.Add(ReadIncome(reader));
        }

        return incomes;
    }

    public async Task<Income> CreateAsync(Guid userId, Guid monthId, CreateIncomeRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.incomes (user_id, month_id, source, amount, income_date, comment)
            VALUES (@userId, @monthId, @source, @amount, @incomeDate, @comment)
            RETURNING id, user_id, month_id, source, amount, income_date, comment, created_at, updated_at
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("monthId", monthId);
        command.Parameters.AddWithValue("source", request.Source);
        command.Parameters.AddWithValue("amount", request.Amount);
        command.Parameters.AddWithValue("incomeDate", request.IncomeDate);
        command.Parameters.AddWithValue("comment", (object?)request.Comment ?? DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();

        return ReadIncome(reader);
    }

    public async Task<Income?> UpdateAsync(Guid userId, Guid incomeId, UpdateIncomeRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var setClauses = new List<string>();
        var parameters = new List<NpgsqlParameter>
        {
            new("userId", userId),
            new("incomeId", incomeId)
        };

        if (request.Source is not null)
        {
            setClauses.Add("source = @source");
            parameters.Add(new NpgsqlParameter("source", request.Source));
        }

        if (request.Amount.HasValue)
        {
            setClauses.Add("amount = @amount");
            parameters.Add(new NpgsqlParameter("amount", request.Amount.Value));
        }

        if (request.IncomeDate.HasValue)
        {
            setClauses.Add("income_date = @incomeDate");
            parameters.Add(new NpgsqlParameter("incomeDate", request.IncomeDate.Value));
        }

        if (request.Comment is not null)
        {
            setClauses.Add("comment = @comment");
            parameters.Add(new NpgsqlParameter("comment", request.Comment));
        }

        if (setClauses.Count == 0)
        {
            return await GetByIdAsync(connection, userId, incomeId);
        }

        var sql = $"""
            UPDATE public.incomes
            SET {string.Join(", ", setClauses)}
            WHERE id = @incomeId AND user_id = @userId
            RETURNING id, user_id, month_id, source, amount, income_date, comment, created_at, updated_at
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddRange(parameters.ToArray());

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return ReadIncome(reader);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid incomeId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            DELETE FROM public.incomes
            WHERE id = @incomeId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("incomeId", incomeId);
        command.Parameters.AddWithValue("userId", userId);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    private static async Task<Income?> GetByIdAsync(NpgsqlConnection connection, Guid userId, Guid incomeId)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT id, user_id, month_id, source, amount, income_date, comment, created_at, updated_at
            FROM public.incomes
            WHERE id = @incomeId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("incomeId", incomeId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return ReadIncome(reader);
    }

    private static Income ReadIncome(NpgsqlDataReader reader)
    {
        return new Income(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            MonthId: reader.GetGuid(2),
            Source: reader.GetString(3),
            Amount: reader.GetDecimal(4),
            IncomeDate: reader.GetFieldValue<DateOnly>(5),
            Comment: reader.IsDBNull(6) ? null : reader.GetString(6),
            CreatedAt: reader.GetDateTime(7),
            UpdatedAt: reader.GetDateTime(8)
        );
    }
}
