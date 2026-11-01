namespace HowAreMyFinances.Api.Domain;

/// <summary>Supabase Auth admin API (service role): manages sign-in users.</summary>
public interface IAuthAdminClient
{
    /// <summary>Deletes the sign-in user. A user that no longer exists counts as success.</summary>
    Task<Result<bool>> DeleteUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
