namespace HowAreMyFinances.Api.Models;

public sealed record ImportRequest(
    IReadOnlyList<string> Categories,
    IReadOnlyList<ImportMonthEntry> Months
);

public sealed record ImportMonthEntry(
    int Year,
    int Month,
    decimal Salary,
    IReadOnlyList<ImportExpenseEntry> Expenses,
    IReadOnlyList<ImportIncomeEntry> Incomes
);

public sealed record ImportExpenseEntry(
    string ItemName,
    decimal Amount,
    string CategoryName,
    string? Vendor,
    string ExpenseDate,
    string? Comment
);

public sealed record ImportIncomeEntry(
    string Source,
    decimal Amount,
    string IncomeDate,
    string? Comment
);

public sealed record ImportResult(
    int CategoriesCreated,
    int MonthsCreated,
    int ExpensesCreated,
    int IncomesCreated
);
