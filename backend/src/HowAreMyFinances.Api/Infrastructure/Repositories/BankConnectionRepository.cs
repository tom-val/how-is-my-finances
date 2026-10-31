using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class BankConnectionRepository : IBankConnectionRepository
{
    private const string ConnectionColumns =
        "id, user_id, aspsp_name, aspsp_country, client, status, session_id, consent_expires_at, last_synced_at, created_at";

    private readonly string _connectionString;

    public BankConnectionRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<Guid> CreatePendingAsync(Guid userId, string aspspName, string aspspCountry, string client, string state)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.bank_connections (user_id, aspsp_name, aspsp_country, client, auth_state, status)
            VALUES (@userId, @aspspName, @aspspCountry, @client, @state, 'pending')
            RETURNING id
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("aspspName", aspspName);
        command.Parameters.AddWithValue("aspspCountry", aspspCountry);
        command.Parameters.AddWithValue("client", client);
        command.Parameters.AddWithValue("state", state);

        return (Guid)(await command.ExecuteScalarAsync())!;
    }

    public async Task<BankConnectionRecord?> GetByStateAsync(Guid userId, string state)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            $"""
            SELECT {ConnectionColumns}
            FROM public.bank_connections
            WHERE user_id = @userId AND auth_state = @state
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("state", state);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadConnectionRecord(reader) : null;
    }

    public async Task<BankConnectionRecord?> GetByIdAsync(Guid userId, Guid connectionId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            $"""
            SELECT {ConnectionColumns}
            FROM public.bank_connections
            WHERE user_id = @userId AND id = @connectionId
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("connectionId", connectionId);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadConnectionRecord(reader) : null;
    }

    public async Task<IReadOnlyList<BankConnection>> GetAllAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        return await GetConnectionsAsync(connection, null, userId, null);
    }

    public async Task<BankConnection?> CompleteAsync(Guid userId, Guid connectionId, string sessionId,
        DateTime? consentExpiresAt, IReadOnlyList<NewBankAccount> accounts)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        await using (var update = new NpgsqlCommand(
            """
            UPDATE public.bank_connections
            SET status = 'active', session_id = @sessionId, consent_expires_at = @consentExpiresAt,
                auth_state = NULL, last_sync_error = NULL
            WHERE id = @connectionId AND user_id = @userId AND status = 'pending'
            """,
            connection, transaction))
        {
            update.Parameters.AddWithValue("sessionId", sessionId);
            update.Parameters.AddWithValue("consentExpiresAt", (object?)consentExpiresAt ?? DBNull.Value);
            update.Parameters.AddWithValue("connectionId", connectionId);
            update.Parameters.AddWithValue("userId", userId);

            if (await update.ExecuteNonQueryAsync() == 0)
            {
                await transaction.RollbackAsync();
                return null;
            }
        }

        foreach (var account in accounts)
        {
            await using var insert = new NpgsqlCommand(
                """
                INSERT INTO public.bank_accounts (user_id, bank_connection_id, external_uid, iban_masked, iban_hash, name, currency)
                VALUES (@userId, @connectionId, @externalUid, @ibanMasked, @ibanHash, @name, @currency)
                ON CONFLICT (bank_connection_id, external_uid) DO UPDATE
                SET iban_masked = EXCLUDED.iban_masked, iban_hash = EXCLUDED.iban_hash,
                    name = EXCLUDED.name, currency = EXCLUDED.currency
                """,
                connection, transaction);

            insert.Parameters.AddWithValue("userId", userId);
            insert.Parameters.AddWithValue("connectionId", connectionId);
            insert.Parameters.AddWithValue("externalUid", account.ExternalUid);
            insert.Parameters.AddWithValue("ibanMasked", (object?)account.IbanMasked ?? DBNull.Value);
            insert.Parameters.AddWithValue("ibanHash", (object?)account.IbanHash ?? DBNull.Value);
            insert.Parameters.AddWithValue("name", (object?)account.Name ?? DBNull.Value);
            insert.Parameters.AddWithValue("currency", account.Currency);
            await insert.ExecuteNonQueryAsync();
        }

        var result = await GetConnectionsAsync(connection, transaction, userId, connectionId);
        await transaction.CommitAsync();
        return result.FirstOrDefault();
    }

    public async Task SetStatusAsync(Guid userId, Guid connectionId, string status, string? error = null)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            UPDATE public.bank_connections
            SET status = @status,
                last_sync_error = COALESCE(@error, last_sync_error),
                auth_state = CASE WHEN @status = 'pending' THEN auth_state ELSE NULL END
            WHERE id = @connectionId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("status", status);
        command.Parameters.Add(new NpgsqlParameter("error", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)error ?? DBNull.Value });
        command.Parameters.AddWithValue("connectionId", connectionId);
        command.Parameters.AddWithValue("userId", userId);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<BankConnectionRecord>> GetActiveAsync(Guid userId, Guid? connectionId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            $"""
            SELECT {ConnectionColumns}
            FROM public.bank_connections
            WHERE user_id = @userId AND status = 'active' AND session_id IS NOT NULL
              AND (@connectionId::uuid IS NULL OR id = @connectionId::uuid)
            ORDER BY created_at
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.Add(new NpgsqlParameter("connectionId", NpgsqlTypes.NpgsqlDbType.Uuid) { Value = (object?)connectionId ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync();
        var records = new List<BankConnectionRecord>();
        while (await reader.ReadAsync())
        {
            records.Add(ReadConnectionRecord(reader));
        }

        return records;
    }

    public async Task<IReadOnlyList<BankAccountRecord>> GetEnabledAccountsAsync(Guid userId, Guid connectionId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT id, bank_connection_id, external_uid, iban_hash, synced_until
            FROM public.bank_accounts
            WHERE user_id = @userId AND bank_connection_id = @connectionId AND is_enabled = true
            ORDER BY created_at
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("connectionId", connectionId);

        await using var reader = await command.ExecuteReaderAsync();
        var accounts = new List<BankAccountRecord>();
        while (await reader.ReadAsync())
        {
            accounts.Add(new BankAccountRecord(
                Id: reader.GetGuid(0),
                ConnectionId: reader.GetGuid(1),
                ExternalUid: reader.GetString(2),
                IbanHash: reader.IsDBNull(3) ? null : reader.GetString(3),
                SyncedUntil: reader.IsDBNull(4) ? null : reader.GetFieldValue<DateOnly>(4)));
        }

        return accounts;
    }

    public async Task<IReadOnlySet<string>> GetOwnIbanHashesAsync(Guid userId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT DISTINCT iban_hash
            FROM public.bank_accounts
            WHERE user_id = @userId AND iban_hash IS NOT NULL
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        var hashes = new HashSet<string>(StringComparer.Ordinal);
        while (await reader.ReadAsync())
        {
            hashes.Add(reader.GetString(0));
        }

        return hashes;
    }

    public async Task UpdateSyncStateAsync(Guid userId, Guid connectionId, DateTime lastSyncedAt, string? lastSyncError)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            UPDATE public.bank_connections
            SET last_synced_at = @lastSyncedAt, last_sync_error = @lastSyncError
            WHERE id = @connectionId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("lastSyncedAt", lastSyncedAt);
        command.Parameters.Add(new NpgsqlParameter("lastSyncError", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)lastSyncError ?? DBNull.Value });
        command.Parameters.AddWithValue("connectionId", connectionId);
        command.Parameters.AddWithValue("userId", userId);

        await command.ExecuteNonQueryAsync();
    }

    public async Task UpdateAccountSyncedUntilAsync(Guid userId, Guid accountId, DateOnly syncedUntil)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            UPDATE public.bank_accounts
            SET synced_until = GREATEST(COALESCE(synced_until, @syncedUntil), @syncedUntil)
            WHERE id = @accountId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("syncedUntil", syncedUntil);
        command.Parameters.AddWithValue("accountId", accountId);
        command.Parameters.AddWithValue("userId", userId);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<BankAccount?> SetAccountEnabledAsync(Guid userId, Guid accountId, bool isEnabled)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            UPDATE public.bank_accounts
            SET is_enabled = @isEnabled
            WHERE id = @accountId AND user_id = @userId
            RETURNING id, iban_masked, name, currency, is_enabled, synced_until
            """,
            connection);

        command.Parameters.AddWithValue("isEnabled", isEnabled);
        command.Parameters.AddWithValue("accountId", accountId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadAccount(reader, 0) : null;
    }

    private static async Task<IReadOnlyList<BankConnection>> GetConnectionsAsync(
        NpgsqlConnection connection, NpgsqlTransaction? transaction, Guid userId, Guid? connectionId)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT c.id, c.aspsp_name, c.aspsp_country, c.status, c.consent_expires_at, c.last_synced_at, c.last_sync_error,
                   a.id, a.iban_masked, a.name, a.currency, a.is_enabled, a.synced_until
            FROM public.bank_connections c
            LEFT JOIN public.bank_accounts a ON a.bank_connection_id = c.id AND a.user_id = @userId
            WHERE c.user_id = @userId
              AND c.status NOT IN ('pending', 'revoked')
              AND (@connectionId::uuid IS NULL OR c.id = @connectionId::uuid)
            ORDER BY c.created_at, a.created_at
            """,
            connection, transaction);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.Add(new NpgsqlParameter("connectionId", NpgsqlTypes.NpgsqlDbType.Uuid) { Value = (object?)connectionId ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync();
        var order = new List<Guid>();
        var headers = new Dictionary<Guid, (string AspspName, string AspspCountry, string Status, DateTime? ConsentExpiresAt, DateTime? LastSyncedAt, string? LastSyncError)>();
        var accounts = new Dictionary<Guid, List<BankAccount>>();

        while (await reader.ReadAsync())
        {
            var id = reader.GetGuid(0);
            if (!headers.ContainsKey(id))
            {
                order.Add(id);
                headers[id] = (
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetString(3),
                    reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                    reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    reader.IsDBNull(6) ? null : reader.GetString(6));
                accounts[id] = [];
            }

            if (!reader.IsDBNull(7))
            {
                accounts[id].Add(ReadAccount(reader, 7));
            }
        }

        return order.Select(id =>
        {
            var h = headers[id];
            return new BankConnection(id, h.AspspName, h.AspspCountry, h.Status, h.ConsentExpiresAt,
                h.LastSyncedAt, h.LastSyncError, accounts[id]);
        }).ToList();
    }

    private static BankAccount ReadAccount(NpgsqlDataReader reader, int offset)
    {
        return new BankAccount(
            Id: reader.GetGuid(offset),
            IbanMasked: reader.IsDBNull(offset + 1) ? null : reader.GetString(offset + 1),
            Name: reader.IsDBNull(offset + 2) ? null : reader.GetString(offset + 2),
            Currency: reader.GetString(offset + 3),
            IsEnabled: reader.GetBoolean(offset + 4),
            SyncedUntil: reader.IsDBNull(offset + 5) ? null : reader.GetFieldValue<DateOnly>(offset + 5));
    }

    private static BankConnectionRecord ReadConnectionRecord(NpgsqlDataReader reader)
    {
        return new BankConnectionRecord(
            Id: reader.GetGuid(0),
            UserId: reader.GetGuid(1),
            AspspName: reader.GetString(2),
            AspspCountry: reader.GetString(3),
            Client: reader.GetString(4),
            Status: reader.GetString(5),
            SessionId: reader.IsDBNull(6) ? null : reader.GetString(6),
            ConsentExpiresAt: reader.IsDBNull(7) ? null : reader.GetDateTime(7),
            LastSyncedAt: reader.IsDBNull(8) ? null : reader.GetDateTime(8),
            CreatedAt: reader.GetDateTime(9));
    }
}
