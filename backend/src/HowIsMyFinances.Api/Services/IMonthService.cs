using HowIsMyFinances.Api.Models;

namespace HowIsMyFinances.Api.Services;

public interface IMonthService
{
    Task<IReadOnlyList<Month>> GetAllAsync(Guid userId);
    Task<MonthDetail?> GetByIdAsync(Guid userId, Guid monthId);
    Task<Month> CreateAsync(Guid userId, CreateMonthRequest request);
    Task<Month?> UpdateAsync(Guid userId, Guid monthId, UpdateMonthRequest request);
    Task<bool> DeleteAsync(Guid userId, Guid monthId);
}
