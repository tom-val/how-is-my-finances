using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IExpenseRepository
{
    Task<IReadOnlyList<ExpenseWithCategory>> GetAllByMonthAsync(Guid userId, Guid monthId);
    Task<ExpenseWithCategory> CreateAsync(Guid userId, Guid monthId, CreateExpenseRequest request);
    Task<ExpenseWithCategory?> UpdateAsync(Guid userId, Guid expenseId, UpdateExpenseRequest request);
    Task<bool> DeleteAsync(Guid userId, Guid expenseId);
    Task<IReadOnlyList<string>> GetVendorsAsync(Guid userId);
    Task<IReadOnlyList<string>> GetHiddenVendorsAsync(Guid userId);
    Task SetHiddenVendorsAsync(Guid userId, IReadOnlyList<string> vendors);
    Task CreateFromRecurringAsync(Guid userId, Guid monthId, RecurringExpense template, DateOnly expenseDate);
}
