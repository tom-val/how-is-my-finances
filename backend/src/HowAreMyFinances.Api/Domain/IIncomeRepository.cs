using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IIncomeRepository
{
    Task<IReadOnlyList<Income>> GetAllByMonthAsync(Guid userId, Guid monthId);
    Task<Income> CreateAsync(Guid userId, Guid monthId, CreateIncomeRequest request);
    Task<Income?> UpdateAsync(Guid userId, Guid incomeId, UpdateIncomeRequest request);
    Task<bool> DeleteAsync(Guid userId, Guid incomeId);
}
