using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class AccountRepository : IAccountRepository
{
    // Children before parents. Every table is filtered by user_id; the auth user itself is removed
    // afterwards through the Supabase admin API (see AccountFunctions.Delete).
    private static readonly string[] TablesInDeleteOrder =
    [
        "bank_transactions",
        "bank_counterparty_rules",
        "ai_jobs",
        "bank_accounts",
        "bank_connections",
        "receipts",
        "notification_preferences",
        "expenses",
        "incomes",
        "recurring_expenses",
        "months",
        "user_vendors",
        "categories",
    ];

    private readonly string _connectionString;

    public AccountRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task DeleteAllDataAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        foreach (var table in TablesInDeleteOrder)
        {
            await using var command = new NpgsqlCommand(
                $"DELETE FROM public.{table} WHERE user_id = @userId", connection, transaction);
            command.Parameters.AddWithValue("userId", userId);
            await command.ExecuteNonQueryAsync();
        }

        // profiles is keyed by the user id itself.
        await using (var profile = new NpgsqlCommand(
            "DELETE FROM public.profiles WHERE id = @userId", connection, transaction))
        {
            profile.Parameters.AddWithValue("userId", userId);
            await profile.ExecuteNonQueryAsync();
        }

        await transaction.CommitAsync();
    }
}
