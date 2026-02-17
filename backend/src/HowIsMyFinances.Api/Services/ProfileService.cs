using HowIsMyFinances.Api.Configuration;
using HowIsMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowIsMyFinances.Api.Services;

public sealed class ProfileService : IProfileService
{
    private readonly string _connectionString;

    public ProfileService(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<Profile?> GetAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, display_name, preferred_language, preferred_currency, created_at, updated_at
            FROM public.profiles
            WHERE id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new Profile(
            Id: reader.GetGuid(0),
            DisplayName: reader.IsDBNull(1) ? null : reader.GetString(1),
            PreferredLanguage: reader.GetString(2),
            PreferredCurrency: reader.GetString(3),
            CreatedAt: reader.GetDateTime(4),
            UpdatedAt: reader.GetDateTime(5)
        );
    }

    public async Task<Profile?> UpdateAsync(Guid userId, UpdateProfileRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var setClauses = new List<string>();
        var parameters = new List<NpgsqlParameter>
        {
            new("userId", userId)
        };

        if (request.DisplayName is not null)
        {
            setClauses.Add("display_name = @displayName");
            parameters.Add(new NpgsqlParameter("displayName", request.DisplayName));
        }

        if (request.PreferredLanguage is not null)
        {
            setClauses.Add("preferred_language = @preferredLanguage");
            parameters.Add(new NpgsqlParameter("preferredLanguage", request.PreferredLanguage));
        }

        if (request.PreferredCurrency is not null)
        {
            setClauses.Add("preferred_currency = @preferredCurrency");
            parameters.Add(new NpgsqlParameter("preferredCurrency", request.PreferredCurrency));
        }

        if (setClauses.Count == 0)
        {
            return await GetAsync(userId);
        }

        var sql = $"""
            UPDATE public.profiles
            SET {string.Join(", ", setClauses)}
            WHERE id = @userId
            RETURNING id, display_name, preferred_language, preferred_currency, created_at, updated_at
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddRange(parameters.ToArray());

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new Profile(
            Id: reader.GetGuid(0),
            DisplayName: reader.IsDBNull(1) ? null : reader.GetString(1),
            PreferredLanguage: reader.GetString(2),
            PreferredCurrency: reader.GetString(3),
            CreatedAt: reader.GetDateTime(4),
            UpdatedAt: reader.GetDateTime(5)
        );
    }
}
