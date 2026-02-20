using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IRecurringExpenseRepository
{
    Task<IReadOnlyList<RecurringExpenseWithCategory>> GetAllAsync(Guid userId);
    Task<RecurringExpenseWithCategory> CreateAsync(Guid userId, CreateRecurringExpenseRequest request);
    Task<RecurringExpenseWithCategory?> UpdateAsync(Guid userId, Guid id, UpdateRecurringExpenseRequest request);
    Task<bool> DeleteAsync(Guid userId, Guid id);
    Task<IReadOnlyList<RecurringExpense>> GetActiveAsync(Guid userId);
}
