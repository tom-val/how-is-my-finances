using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IMonthService
{
    /// <summary>
    /// Creates a month and generates expenses from active recurring templates.
    /// Throws a unique-violation <c>PostgresException</c> (23505) when the month already exists.
    /// </summary>
    Task<Month> CreateAsync(Guid userId, CreateMonthRequest request);

    /// <summary>Returns the month, creating it (with recurring expenses) when it doesn't exist yet.</summary>
    Task<Month> GetOrCreateAsync(Guid userId, int year, int month);
}
