using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class VendorRepository : IVendorRepository
{
    private readonly string _connectionString;

    public VendorRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<IReadOnlyList<UserVendor>> GetAllAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, name, is_hidden
            FROM public.user_vendors
            WHERE user_id = @userId
            ORDER BY name
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        return await ReadVendorsAsync(command);
    }

    public async Task<IReadOnlyList<UserVendor>> GetVisibleAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, name, is_hidden
            FROM public.user_vendors
            WHERE user_id = @userId AND is_hidden = false
            ORDER BY name
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        return await ReadVendorsAsync(command);
    }

    public async Task EnsureExistsAsync(Guid userId, string? vendor)
    {
        if (string.IsNullOrWhiteSpace(vendor))
            return;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.user_vendors (user_id, name)
            VALUES (@userId, @name)
            ON CONFLICT (user_id, name) DO NOTHING
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("name", vendor.Trim());

        await command.ExecuteNonQueryAsync();
    }

    public async Task EnsureManyExistAsync(Guid userId, IEnumerable<string> vendors)
    {
        var vendorList = vendors.Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v.Trim()).Distinct().ToList();
        if (vendorList.Count == 0)
            return;

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        foreach (var vendor in vendorList)
        {
            await using var command = new NpgsqlCommand(
                """
                INSERT INTO public.user_vendors (user_id, name)
                VALUES (@userId, @name)
                ON CONFLICT (user_id, name) DO NOTHING
                """,
                connection);

            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("name", vendor);

            await command.ExecuteNonQueryAsync();
        }
    }

    public async Task<UserVendor?> SetHiddenAsync(Guid userId, Guid vendorId, bool isHidden)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            UPDATE public.user_vendors
            SET is_hidden = @isHidden
            WHERE id = @vendorId AND user_id = @userId
            RETURNING id, name, is_hidden
            """,
            connection);

        command.Parameters.AddWithValue("isHidden", isHidden);
        command.Parameters.AddWithValue("vendorId", vendorId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return null;

        return ReadVendor(reader);
    }

    private static async Task<IReadOnlyList<UserVendor>> ReadVendorsAsync(NpgsqlCommand command)
    {
        await using var reader = await command.ExecuteReaderAsync();
        var vendors = new List<UserVendor>();

        while (await reader.ReadAsync())
        {
            vendors.Add(ReadVendor(reader));
        }

        return vendors;
    }

    private static UserVendor ReadVendor(NpgsqlDataReader reader)
    {
        return new UserVendor(
            Id: reader.GetGuid(0),
            Name: reader.GetString(1),
            IsHidden: reader.GetBoolean(2));
    }
}
