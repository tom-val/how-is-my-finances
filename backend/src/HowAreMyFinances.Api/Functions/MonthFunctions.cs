using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Functions;

public static class MonthFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, IMonthRepository monthRepository)
    {
        var userId = context.GetUserId();
        var months = await monthRepository.GetAllAsync(userId);
        return Results.Ok(months);
    }

    public static async Task<IResult> GetById(HttpContext context, Guid id, IMonthRepository monthRepository)
    {
        var userId = context.GetUserId();
        var month = await monthRepository.GetByIdAsync(userId, id);

        return month is null
            ? Results.NotFound(new { error = "Month not found" })
            : Results.Ok(month);
    }

    public static async Task<IResult> Create(
        HttpContext context,
        CreateMonthRequest request,
        IMonthRepository monthRepository,
        IRecurringExpenseRepository recurringExpenseRepository,
        IExpenseRepository expenseRepository)
    {
        var validation = MonthEntity.Create(request.Year, request.Month, request.Salary);
        if (!validation.IsSuccess)
        {
            return Results.BadRequest(new { error = validation.Error });
        }

        var userId = context.GetUserId();

        try
        {
            var month = await monthRepository.CreateAsync(userId, request);

            // Auto-generate expenses from active recurring templates
            var templates = await recurringExpenseRepository.GetActiveAsync(userId);
            foreach (var template in templates)
            {
                var expenseDate = new DateOnly(request.Year, request.Month, template.DayOfMonth);
                await expenseRepository.CreateFromRecurringAsync(userId, month.Id, template, expenseDate);
            }

            return Results.Created($"/v1/months/{month.Id}", month);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
        {
            return Results.Conflict(new { error = "A month with this year and month already exists" });
        }
    }

    public static async Task<IResult> Update(HttpContext context, Guid id, UpdateMonthRequest request, IMonthRepository monthRepository)
    {
        if (request.Salary.HasValue)
        {
            var validation = MonthEntity.ValidateSalary(request.Salary.Value);
            if (!validation.IsSuccess)
            {
                return Results.BadRequest(new { error = validation.Error });
            }
        }

        var userId = context.GetUserId();
        var month = await monthRepository.UpdateAsync(userId, id, request);

        return month is null
            ? Results.NotFound(new { error = "Month not found" })
            : Results.Ok(month);
    }

    public static async Task<IResult> Delete(HttpContext context, Guid id, IMonthRepository monthRepository)
    {
        var userId = context.GetUserId();
        var deleted = await monthRepository.DeleteAsync(userId, id);

        return deleted
            ? Results.NoContent()
            : Results.NotFound(new { error = "Month not found" });
    }
}
