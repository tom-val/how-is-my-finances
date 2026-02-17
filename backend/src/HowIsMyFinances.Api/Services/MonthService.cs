using HowIsMyFinances.Api.Configuration;
using HowIsMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowIsMyFinances.Api.Services;

public sealed class MonthService : IMonthService
{
    private readonly string _connectionString;

    public MonthService(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<IReadOnlyList<Month>> GetAllAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, user_id, year, month, salary, notes, created_at, updated_at
            FROM public.months
            WHERE user_id = @userId
            ORDER BY year DESC, month DESC
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var months = new List<Month>();

        while (await reader.ReadAsync())
        {
            months.Add(ReadMonth(reader));
        }

        return months;
    }

    public async Task<MonthDetail?> GetByIdAsync(Guid userId, Guid monthId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT
                m.id, m.user_id, m.year, m.month, m.salary, m.notes, m.created_at, m.updated_at,
                COALESCE(SUM(e.amount), 0) AS total_spent
            FROM public.months m
            LEFT JOIN public.expenses e ON e.month_id = m.id
            WHERE m.id = @monthId AND m.user_id = @userId
            GROUP BY m.id
            """,
            connection);

        command.Parameters.AddWithValue("monthId", monthId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        var salary = reader.GetDecimal(4);
        var totalSpent = reader.GetDecimal(8);

        return new MonthDetail(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            Year: reader.GetInt32(2),
            MonthNumber: reader.GetInt32(3),
            Salary: salary,
            Notes: reader.IsDBNull(5) ? null : reader.GetString(5),
            TotalSpent: totalSpent,
            Remaining: salary - totalSpent,
            CreatedAt: reader.GetDateTime(6),
            UpdatedAt: reader.GetDateTime(7)
        );
    }

    public async Task<Month> CreateAsync(Guid userId, CreateMonthRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.months (user_id, year, month, salary)
            VALUES (@userId, @year, @month, @salary)
            RETURNING id, user_id, year, month, salary, notes, created_at, updated_at
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("year", request.Year);
        command.Parameters.AddWithValue("month", request.Month);
        command.Parameters.AddWithValue("salary", request.Salary);

        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();

        return ReadMonth(reader);
    }

    public async Task<Month?> UpdateAsync(Guid userId, Guid monthId, UpdateMonthRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var setClauses = new List<string>();
        var parameters = new List<NpgsqlParameter>
        {
            new("userId", userId),
            new("monthId", monthId)
        };

        if (request.Salary.HasValue)
        {
            setClauses.Add("salary = @salary");
            parameters.Add(new NpgsqlParameter("salary", request.Salary.Value));
        }

        if (request.Notes is not null)
        {
            setClauses.Add("notes = @notes");
            parameters.Add(new NpgsqlParameter("notes", request.Notes));
        }

        if (setClauses.Count == 0)
        {
            return await GetMonthAsync(connection, userId, monthId);
        }

        var sql = $"""
            UPDATE public.months
            SET {string.Join(", ", setClauses)}
            WHERE id = @monthId AND user_id = @userId
            RETURNING id, user_id, year, month, salary, notes, created_at, updated_at
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddRange(parameters.ToArray());

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return ReadMonth(reader);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid monthId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            DELETE FROM public.months
            WHERE id = @monthId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("monthId", monthId);
        command.Parameters.AddWithValue("userId", userId);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    private static async Task<Month?> GetMonthAsync(NpgsqlConnection connection, Guid userId, Guid monthId)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT id, user_id, year, month, salary, notes, created_at, updated_at
            FROM public.months
            WHERE id = @monthId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("monthId", monthId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return ReadMonth(reader);
    }

    private static Month ReadMonth(NpgsqlDataReader reader)
    {
        return new Month(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            Year: reader.GetInt32(2),
            MonthNumber: reader.GetInt32(3),
            Salary: reader.GetDecimal(4),
            Notes: reader.IsDBNull(5) ? null : reader.GetString(5),
            CreatedAt: reader.GetDateTime(6),
            UpdatedAt: reader.GetDateTime(7)
        );
    }
}
