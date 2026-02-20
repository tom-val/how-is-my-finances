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
            SELECT id, user_id, name, icon, sort_order, is_archived, created_at
            FROM public.categories
            WHERE user_id = @userId
            ORDER BY is_archived, sort_order, name
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

    public async Task<Category> CreateAsync(Guid userId, CreateCategoryRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.categories (user_id, name)
            VALUES (@userId, @name)
            RETURNING id, user_id, name, icon, sort_order, is_archived, created_at
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("name", request.Name);

        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return ReadCategory(reader);
    }

    public async Task<Category?> UpdateAsync(Guid userId, Guid categoryId, UpdateCategoryRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var setClauses = new List<string>();
        var parameters = new List<NpgsqlParameter>
        {
            new("categoryId", categoryId),
            new("userId", userId)
        };

        if (request.Name is not null)
        {
            setClauses.Add("name = @name");
            parameters.Add(new NpgsqlParameter("name", request.Name));
        }

        if (request.IsArchived.HasValue)
        {
            setClauses.Add("is_archived = @isArchived");
            parameters.Add(new NpgsqlParameter("isArchived", request.IsArchived.Value));
        }

        if (setClauses.Count == 0)
        {
            return await GetByIdAsync(connection, userId, categoryId);
        }

        var sql = $"""
            UPDATE public.categories
            SET {string.Join(", ", setClauses)}
            WHERE id = @categoryId AND user_id = @userId
            RETURNING id, user_id, name, icon, sort_order, is_archived, created_at
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddRange(parameters.ToArray());

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadCategory(reader) : null;
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid categoryId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            DELETE FROM public.categories
            WHERE id = @categoryId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("categoryId", categoryId);
        command.Parameters.AddWithValue("userId", userId);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    private static async Task<Category?> GetByIdAsync(NpgsqlConnection connection, Guid userId, Guid categoryId)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT id, user_id, name, icon, sort_order, is_archived, created_at
            FROM public.categories
            WHERE id = @categoryId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("categoryId", categoryId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadCategory(reader) : null;
    }

    private static Category ReadCategory(NpgsqlDataReader reader)
    {
        return new Category(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            Name: reader.GetString(2),
            Icon: reader.IsDBNull(3) ? null : reader.GetString(3),
            SortOrder: reader.GetInt32(4),
            IsArchived: reader.GetBoolean(5),
            CreatedAt: reader.GetDateTime(6)
        );
    }
}
