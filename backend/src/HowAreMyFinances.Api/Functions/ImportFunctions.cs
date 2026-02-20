using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Functions;

public static class ImportFunctions
{
    public static async Task<IResult> Import(HttpContext context, ImportRequest request, IImportRepository importRepository)
    {
        var validationError = Validate(request);
        if (validationError is not null)
        {
            return Results.BadRequest(new { error = validationError });
        }

        var userId = context.GetUserId();
        var result = await importRepository.ImportAsync(userId, request);

        return Results.Created("/v1/import", result);
    }

    private static string? Validate(ImportRequest request)
    {
        if (request.Categories.Count == 0)
        {
            return "At least one category is required";
        }

        if (request.Months.Count == 0)
        {
            return "At least one month is required";
        }

        foreach (var month in request.Months)
        {
            if (month.Month < 1 || month.Month > 12)
            {
                return $"Invalid month value: {month.Month}. Must be between 1 and 12";
            }

            if (month.Year < 2000 || month.Year > 2100)
            {
                return $"Invalid year value: {month.Year}. Must be between 2000 and 2100";
            }

            if (month.Salary < 0)
            {
                return $"Salary cannot be negative for {month.Year}-{month.Month:D2}";
            }

            foreach (var expense in month.Expenses)
            {
                if (string.IsNullOrWhiteSpace(expense.ItemName))
                {
                    return $"Expense item name is required in {month.Year}-{month.Month:D2}";
                }

                if (expense.Amount <= 0)
                {
                    return $"Expense amount must be positive in {month.Year}-{month.Month:D2}";
                }

                if (string.IsNullOrWhiteSpace(expense.CategoryName))
                {
                    return $"Expense category name is required in {month.Year}-{month.Month:D2}";
                }

                if (!DateOnly.TryParse(expense.ExpenseDate, out _))
                {
                    return $"Invalid expense date '{expense.ExpenseDate}' in {month.Year}-{month.Month:D2}";
                }
            }

            foreach (var income in month.Incomes)
            {
                if (string.IsNullOrWhiteSpace(income.Source))
                {
                    return $"Income source is required in {month.Year}-{month.Month:D2}";
                }

                if (income.Amount <= 0)
                {
                    return $"Income amount must be positive in {month.Year}-{month.Month:D2}";
                }

                if (!DateOnly.TryParse(income.IncomeDate, out _))
                {
                    return $"Invalid income date '{income.IncomeDate}' in {month.Year}-{month.Month:D2}";
                }
            }
        }

        return null;
    }
}
