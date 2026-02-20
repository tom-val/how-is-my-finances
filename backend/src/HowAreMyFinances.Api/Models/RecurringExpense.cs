namespace HowAreMyFinances.Api.Models;

public sealed record RecurringExpense(
    Guid Id,
    Guid UserId,
    Guid CategoryId,
    string ItemName,
    decimal Amount,
    string? Vendor,
    string? Comment,
    int DayOfMonth,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record RecurringExpenseWithCategory(
    Guid Id,
    Guid UserId,
    Guid CategoryId,
    string ItemName,
    decimal Amount,
    string? Vendor,
    string? Comment,
    int DayOfMonth,
    bool IsActive,
    string CategoryName,
    string? CategoryIcon,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record CreateRecurringExpenseRequest(
    string ItemName,
    decimal Amount,
    Guid CategoryId,
    string? Vendor,
    string? Comment,
    int DayOfMonth
);

public sealed record UpdateRecurringExpenseRequest(
    string? ItemName,
    decimal? Amount,
    Guid? CategoryId,
    string? Vendor,
    string? Comment,
    int? DayOfMonth,
    bool? IsActive
);
