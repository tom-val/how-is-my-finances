using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class CategoryRepository : ICategoryRepository
{
    private readonly string _connectionString;

    public CategoryRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<IReadOnlyList<Category>> GetAllAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, user_id, name, icon, sort_order, created_at
            FROM public.categories
            WHERE user_id = @userId
            ORDER BY sort_order, name
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var categories = new List<Category>();

        while (await reader.ReadAsync())
        {
            categories.Add(ReadCategory(reader));
        }

        return categories;
    }

    private static Category ReadCategory(NpgsqlDataReader reader)
    {
        return new Category(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            Name: reader.GetString(2),
            Icon: reader.IsDBNull(3) ? null : reader.GetString(3),
            SortOrder: reader.GetInt32(4),
            CreatedAt: reader.GetDateTime(5)
        );
    }
}
