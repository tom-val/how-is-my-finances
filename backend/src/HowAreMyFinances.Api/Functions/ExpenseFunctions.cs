using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;
using HowAreMyFinances.Api.Services;

namespace HowAreMyFinances.Api.Functions;

public static class ExpenseFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, Guid monthId, IExpenseService expenseService)
    {
        var userId = context.GetUserId();
        var expenses = await expenseService.GetAllByMonthAsync(userId, monthId);
        return Results.Ok(expenses);
    }

    public static async Task<IResult> Create(
        HttpContext context,
        Guid monthId,
        CreateExpenseRequest request,
        IExpenseService expenseService,
        IMonthService monthService)
    {
        if (string.IsNullOrWhiteSpace(request.ItemName))
        {
            return Results.BadRequest(new { error = "Item name is required" });
        }

        if (request.Amount <= 0)
        {
            return Results.BadRequest(new { error = "Amount must be greater than zero" });
        }

        var userId = context.GetUserId();

        // Verify month exists and belongs to user
        var month = await monthService.GetByIdAsync(userId, monthId);
        if (month is null)
        {
            return Results.NotFound(new { error = "Month not found" });
        }

        try
        {
            var expense = await expenseService.CreateAsync(userId, monthId, request);
            return Results.Created($"/v1/expenses/{expense.Id}", expense);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23503")
        {
            return Results.BadRequest(new { error = "Category not found" });
        }
    }

    public static async Task<IResult> Update(HttpContext context, Guid id, UpdateExpenseRequest request, IExpenseService expenseService)
    {
        if (request.ItemName is not null && string.IsNullOrWhiteSpace(request.ItemName))
        {
            return Results.BadRequest(new { error = "Item name cannot be empty" });
        }

        if (request.Amount.HasValue && request.Amount.Value <= 0)
        {
            return Results.BadRequest(new { error = "Amount must be greater than zero" });
        }

        var userId = context.GetUserId();

        try
        {
            var expense = await expenseService.UpdateAsync(userId, id, request);

            return expense is null
                ? Results.NotFound(new { error = "Expense not found" })
                : Results.Ok(expense);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23503")
        {
            return Results.BadRequest(new { error = "Category not found" });
        }
    }

    public static async Task<IResult> GetVendors(HttpContext context, IExpenseService expenseService)
    {
        var userId = context.GetUserId();
        var vendors = await expenseService.GetVendorsAsync(userId);
        return Results.Ok(vendors);
    }

    public static async Task<IResult> Delete(HttpContext context, Guid id, IExpenseService expenseService)
    {
        var userId = context.GetUserId();
        var deleted = await expenseService.DeleteAsync(userId, id);

        return deleted
            ? Results.NoContent()
            : Results.NotFound(new { error = "Expense not found" });
    }
}
