using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IMonthRepository
{
    Task<IReadOnlyList<MonthSummary>> GetAllAsync(Guid userId);
    Task<MonthDetail?> GetByIdAsync(Guid userId, Guid monthId);
    Task<Month> CreateAsync(Guid userId, CreateMonthRequest request);
    Task<Month?> UpdateAsync(Guid userId, Guid monthId, UpdateMonthRequest request);
    Task<bool> DeleteAsync(Guid userId, Guid monthId);
}
