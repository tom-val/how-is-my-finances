using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Functions;

public static class ExpenseFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, Guid monthId, IExpenseRepository expenseRepository)
    {
        var userId = context.GetUserId();
        var expenses = await expenseRepository.GetAllByMonthAsync(userId, monthId);
        return Results.Ok(expenses);
    }

    public static async Task<IResult> Create(
        HttpContext context,
        Guid monthId,
        CreateExpenseRequest request,
        IExpenseRepository expenseRepository,
        IMonthRepository monthRepository,
        IVendorRepository vendorRepository)
    {
        var validation = ExpenseEntity.Create(request.ItemName, request.Amount, request.CategoryId,
            request.Vendor, request.ExpenseDate, request.Comment);
        if (!validation.IsSuccess)
        {
            return Results.BadRequest(new { error = validation.Error });
        }

        var userId = context.GetUserId();

        // Verify month exists and belongs to user
        var month = await monthRepository.GetByIdAsync(userId, monthId);
        if (month is null)
        {
            return Results.NotFound(new { error = "Month not found" });
        }

        try
        {
            var expense = await expenseRepository.CreateAsync(userId, monthId, request);
            await vendorRepository.EnsureExistsAsync(userId, request.Vendor);
            return Results.Created($"/v1/expenses/{expense.Id}", expense);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23503")
        {
            return Results.BadRequest(new { error = "Category not found" });
        }
    }

    public static async Task<IResult> Update(
        HttpContext context,
        Guid id,
        UpdateExpenseRequest request,
        IExpenseRepository expenseRepository,
        IVendorRepository vendorRepository)
    {
        var validation = ExpenseEntity.ValidateUpdate(request.ItemName, request.Amount);
        if (!validation.IsSuccess)
        {
            return Results.BadRequest(new { error = validation.Error });
        }

        var userId = context.GetUserId();

        try
        {
            var expense = await expenseRepository.UpdateAsync(userId, id, request);

            if (expense is null)
                return Results.NotFound(new { error = "Expense not found" });

            await vendorRepository.EnsureExistsAsync(userId, request.Vendor);
            return Results.Ok(expense);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23503")
        {
            return Results.BadRequest(new { error = "Category not found" });
        }
    }

    public static async Task<IResult> Delete(HttpContext context, Guid id, IExpenseRepository expenseRepository)
    {
        var userId = context.GetUserId();
        var deleted = await expenseRepository.DeleteAsync(userId, id);

        return deleted
            ? Results.NoContent()
            : Results.NotFound(new { error = "Expense not found" });
    }

    public static async Task<IResult> ToggleComplete(HttpContext context, Guid id, IExpenseRepository expenseRepository)
    {
        var userId = context.GetUserId();
        var expense = await expenseRepository.ToggleCompleteAsync(userId, id);

        return expense is null
            ? Results.NotFound(new { error = "Expense not found" })
            : Results.Ok(expense);
    }
}
