namespace HowAreMyFinances.Api.Models;

public sealed record Expense(
    Guid Id,
    Guid UserId,
    Guid MonthId,
    Guid CategoryId,
    string ItemName,
    decimal Amount,
    string? Vendor,
    DateOnly ExpenseDate,
    string? Comment,
    bool IsRecurringInstance,
    bool IsCompleted,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record ExpenseWithCategory(
    Guid Id,
    Guid UserId,
    Guid MonthId,
    Guid CategoryId,
    string ItemName,
    decimal Amount,
    string? Vendor,
    DateOnly ExpenseDate,
    string? Comment,
    bool IsRecurringInstance,
    bool IsCompleted,
    string CategoryName,
    string? CategoryIcon,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record CreateExpenseRequest(
    string ItemName,
    decimal Amount,
    Guid CategoryId,
    string? Vendor,
    DateOnly ExpenseDate,
    string? Comment,
    bool IsCompleted = true
);

public sealed record UpdateExpenseRequest(
    string? ItemName,
    decimal? Amount,
    Guid? CategoryId,
    string? Vendor,
    DateOnly? ExpenseDate,
    string? Comment
);
