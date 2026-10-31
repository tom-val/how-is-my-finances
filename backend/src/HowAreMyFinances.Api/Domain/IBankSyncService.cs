using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IBankSyncService
{
    /// <summary>Manual sync of all active connections (or one) for the user.</summary>
    Task<SyncResult> SyncAsync(Guid userId, Guid? connectionId, PsuContext psu, CancellationToken cancellationToken = default);
}
