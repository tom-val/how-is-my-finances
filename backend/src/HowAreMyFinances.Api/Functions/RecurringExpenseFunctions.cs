using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;
using Npgsql;

namespace HowAreMyFinances.Api.Functions;

public static class RecurringExpenseFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, IRecurringExpenseRepository recurringExpenseRepository)
    {
        var userId = context.GetUserId();
        var items = await recurringExpenseRepository.GetAllAsync(userId);
        return Results.Ok(items);
    }

    public static async Task<IResult> Create(
        HttpContext context,
        CreateRecurringExpenseRequest request,
        IRecurringExpenseRepository recurringExpenseRepository,
        IVendorRepository vendorRepository)
    {
        var validation = RecurringExpenseEntity.Create(
            request.ItemName, request.Amount, request.CategoryId,
            request.Vendor, request.Comment, request.DayOfMonth);

        if (!validation.IsSuccess)
            return Results.BadRequest(new { error = validation.Error });

        var userId = context.GetUserId();

        try
        {
            var entity = validation.Value!;
            var created = await recurringExpenseRepository.CreateAsync(userId,
                new CreateRecurringExpenseRequest(
                    entity.ItemName, request.Amount, request.CategoryId,
                    request.Vendor, request.Comment, request.DayOfMonth));
            await vendorRepository.EnsureExistsAsync(userId, request.Vendor);
            return Results.Created($"/v1/recurring-expenses/{created.Id}", created);
        }
        catch (PostgresException ex) when (ex.SqlState == "23503")
        {
            return Results.BadRequest(new { error = "Invalid category" });
        }
    }

    public static async Task<IResult> Update(
        HttpContext context,
        Guid id,
        UpdateRecurringExpenseRequest request,
        IRecurringExpenseRepository recurringExpenseRepository,
        IVendorRepository vendorRepository)
    {
        var validation = RecurringExpenseEntity.ValidateUpdate(
            request.ItemName, request.Amount, request.DayOfMonth);

        if (!validation.IsSuccess)
            return Results.BadRequest(new { error = validation.Error });

        var userId = context.GetUserId();

        try
        {
            var trimmedRequest = request.ItemName is not null
                ? request with { ItemName = request.ItemName.Trim() }
                : request;

            var updated = await recurringExpenseRepository.UpdateAsync(userId, id, trimmedRequest);

            if (updated is null)
                return Results.NotFound(new { error = "Recurring expense not found" });

            await vendorRepository.EnsureExistsAsync(userId, request.Vendor);
            return Results.Ok(updated);
        }
        catch (PostgresException ex) when (ex.SqlState == "23503")
        {
            return Results.BadRequest(new { error = "Invalid category" });
        }
    }

    public static async Task<IResult> Delete(
        HttpContext context,
        Guid id,
        IRecurringExpenseRepository recurringExpenseRepository)
    {
        var userId = context.GetUserId();
        var deleted = await recurringExpenseRepository.DeleteAsync(userId, id);

        return deleted
            ? Results.NoContent()
            : Results.NotFound(new { error = "Recurring expense not found" });
    }
}
