namespace HowAreMyFinances.Api.Domain;

public interface IAccountRepository
{
    /// <summary>
    /// Deletes every row the user owns in the public schema, in one transaction. Child rows go first:
    /// expenses and recurring expenses RESTRICT category deletion, so a single cascade from
    /// auth.users is not safe to rely on.
    /// </summary>
    Task DeleteAllDataAsync(Guid userId);
}
