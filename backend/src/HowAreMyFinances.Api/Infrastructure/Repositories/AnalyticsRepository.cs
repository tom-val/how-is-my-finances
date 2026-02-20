using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class AnalyticsRepository : IAnalyticsRepository
{
    private readonly string _connectionString;

    public AnalyticsRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<AnalyticsResponse> GetAnalyticsAsync(
        Guid userId, int startYear, int startMonth, int endYear, int endMonth)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var categoryTotals = await GetCategoryTotalsAsync(connection, userId, startYear, startMonth, endYear, endMonth);
        var vendorTotals = await GetVendorTotalsAsync(connection, userId, startYear, startMonth, endYear, endMonth);

        return new AnalyticsResponse(categoryTotals, vendorTotals);
    }

    private static async Task<IReadOnlyList<CategoryTotal>> GetCategoryTotalsAsync(
        NpgsqlConnection connection, Guid userId, int startYear, int startMonth, int endYear, int endMonth)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT c.id, c.name, COALESCE(SUM(e.amount), 0) AS total
            FROM public.expenses e
            INNER JOIN public.categories c ON c.id = e.category_id
            INNER JOIN public.months m ON m.id = e.month_id
            WHERE e.user_id = @userId
              AND (m.year > @startYear OR (m.year = @startYear AND m.month >= @startMonth))
              AND (m.year < @endYear OR (m.year = @endYear AND m.month <= @endMonth))
            GROUP BY c.id, c.name
            ORDER BY total DESC
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("startYear", startYear);
        command.Parameters.AddWithValue("startMonth", startMonth);
        command.Parameters.AddWithValue("endYear", endYear);
        command.Parameters.AddWithValue("endMonth", endMonth);

        await using var reader = await command.ExecuteReaderAsync();
        var results = new List<CategoryTotal>();

        while (await reader.ReadAsync())
        {
            results.Add(new CategoryTotal(
                CategoryId: reader.GetGuid(0),
                CategoryName: reader.GetString(1),
                Total: reader.GetDecimal(2)));
        }

        return results;
    }

    private static async Task<IReadOnlyList<VendorTotal>> GetVendorTotalsAsync(
        NpgsqlConnection connection, Guid userId, int startYear, int startMonth, int endYear, int endMonth)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT e.vendor, COALESCE(SUM(e.amount), 0) AS total, COUNT(*) AS count
            FROM public.expenses e
            INNER JOIN public.months m ON m.id = e.month_id
            WHERE e.user_id = @userId
              AND e.vendor IS NOT NULL AND e.vendor != ''
              AND (m.year > @startYear OR (m.year = @startYear AND m.month >= @startMonth))
              AND (m.year < @endYear OR (m.year = @endYear AND m.month <= @endMonth))
            GROUP BY e.vendor
            ORDER BY total DESC
            LIMIT 20
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("startYear", startYear);
        command.Parameters.AddWithValue("startMonth", startMonth);
        command.Parameters.AddWithValue("endYear", endYear);
        command.Parameters.AddWithValue("endMonth", endMonth);

        await using var reader = await command.ExecuteReaderAsync();
        var results = new List<VendorTotal>();

        while (await reader.ReadAsync())
        {
            results.Add(new VendorTotal(
                Vendor: reader.GetString(0),
                Total: reader.GetDecimal(1),
                Count: reader.GetInt32(2)));
        }

        return results;
    }
}
