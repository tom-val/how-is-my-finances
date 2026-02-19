using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class MonthRepository : IMonthRepository
{
    private readonly string _connectionString;

    public MonthRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<IReadOnlyList<MonthSummary>> GetAllAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT
                m.id, m.user_id, m.year, m.month, m.salary, m.notes, m.created_at, m.updated_at,
                COALESCE(SUM(e.amount), 0) AS total_spent,
                COALESCE(income_totals.total_income, 0) AS total_income
            FROM public.months m
            LEFT JOIN public.expenses e ON e.month_id = m.id
            LEFT JOIN (
                SELECT month_id, SUM(amount) AS total_income
                FROM public.incomes
                WHERE user_id = @userId
                GROUP BY month_id
            ) income_totals ON income_totals.month_id = m.id
            WHERE m.user_id = @userId
            GROUP BY m.id, income_totals.total_income
            ORDER BY m.year DESC, m.month DESC
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var months = new List<MonthSummary>();

        while (await reader.ReadAsync())
        {
            var salary = reader.GetDecimal(4);
            var totalSpent = reader.GetDecimal(8);
            var totalIncome = reader.GetDecimal(9);

            months.Add(new MonthSummary(
                Id: reader.GetGuid(0),
                UserId: reader.GetGuid(1),
                Year: reader.GetInt32(2),
                MonthNumber: reader.GetInt32(3),
                Salary: salary,
                Notes: reader.IsDBNull(5) ? null : reader.GetString(5),
                TotalSpent: totalSpent,
                TotalIncome: totalIncome,
                Remaining: salary + totalIncome - totalSpent,
                CreatedAt: reader.GetDateTime(6),
                UpdatedAt: reader.GetDateTime(7)
            ));
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
                COALESCE(SUM(CASE WHEN e.expense_date <= CURRENT_DATE THEN e.amount ELSE 0 END), 0) AS total_spent,
                COALESCE(SUM(CASE WHEN e.expense_date > CURRENT_DATE THEN e.amount ELSE 0 END), 0) AS planned_spent,
                COALESCE(income_totals.total_income, 0) AS total_income
            FROM public.months m
            LEFT JOIN public.expenses e ON e.month_id = m.id
            LEFT JOIN (
                SELECT month_id, SUM(amount) AS total_income
                FROM public.incomes
                WHERE user_id = @userId
                GROUP BY month_id
            ) income_totals ON income_totals.month_id = m.id
            WHERE m.id = @monthId AND m.user_id = @userId
            GROUP BY m.id, income_totals.total_income
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
        var plannedSpent = reader.GetDecimal(9);
        var totalIncome = reader.GetDecimal(10);

        return new MonthDetail(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            Year: reader.GetInt32(2),
            MonthNumber: reader.GetInt32(3),
            Salary: salary,
            Notes: reader.IsDBNull(5) ? null : reader.GetString(5),
            TotalSpent: totalSpent,
            PlannedSpent: plannedSpent,
            TotalIncome: totalIncome,
            Remaining: salary + totalIncome - totalSpent - plannedSpent,
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
