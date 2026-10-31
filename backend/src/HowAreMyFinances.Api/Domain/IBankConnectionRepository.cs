using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IBankConnectionRepository
{
    Task<Guid> CreatePendingAsync(Guid userId, string aspspName, string aspspCountry, string client, string state);
    Task<BankConnectionRecord?> GetByStateAsync(Guid userId, string state);
    Task<BankConnectionRecord?> GetByIdAsync(Guid userId, Guid connectionId);

    /// <summary>Connections shown in the app (everything except abandoned pending and revoked ones).</summary>
    Task<IReadOnlyList<BankConnection>> GetAllAsync(Guid userId);

    /// <summary>
    /// Activates a pending connection and stores its accounts. Returns null when the connection is no
    /// longer pending (the state can be used once).
    /// </summary>
    Task<BankConnection?> CompleteAsync(Guid userId, Guid connectionId, string sessionId,
        DateTime? consentExpiresAt, IReadOnlyList<NewBankAccount> accounts);

    Task SetStatusAsync(Guid userId, Guid connectionId, string status, string? error = null);
    Task<IReadOnlyList<BankConnectionRecord>> GetActiveAsync(Guid userId, Guid? connectionId);
    Task<IReadOnlyList<BankAccountRecord>> GetEnabledAccountsAsync(Guid userId, Guid connectionId);

    /// <summary>IBAN hashes of all the user's linked accounts, to skip transfers between them.</summary>
    Task<IReadOnlySet<string>> GetOwnIbanHashesAsync(Guid userId);

    Task UpdateSyncStateAsync(Guid userId, Guid connectionId, DateTime lastSyncedAt, string? lastSyncError);
    Task UpdateAccountSyncedUntilAsync(Guid userId, Guid accountId, DateOnly syncedUntil);
    Task<BankAccount?> SetAccountEnabledAsync(Guid userId, Guid accountId, bool isEnabled);
}
