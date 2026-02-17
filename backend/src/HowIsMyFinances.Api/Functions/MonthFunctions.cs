using HowIsMyFinances.Api.Middleware;
using HowIsMyFinances.Api.Models;
using HowIsMyFinances.Api.Services;

namespace HowIsMyFinances.Api.Functions;

public static class MonthFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, IMonthService monthService)
    {
        var userId = context.GetUserId();
        var months = await monthService.GetAllAsync(userId);
        return Results.Ok(months);
    }

    public static async Task<IResult> GetById(HttpContext context, Guid id, IMonthService monthService)
    {
        var userId = context.GetUserId();
        var month = await monthService.GetByIdAsync(userId, id);

        return month is null
            ? Results.NotFound(new { error = "Month not found" })
            : Results.Ok(month);
    }

    public static async Task<IResult> Create(HttpContext context, CreateMonthRequest request, IMonthService monthService)
    {
        if (request.Year < 2000 || request.Year > 2100)
        {
            return Results.BadRequest(new { error = "Year must be between 2000 and 2100" });
        }

        if (request.Month < 1 || request.Month > 12)
        {
            return Results.BadRequest(new { error = "Month must be between 1 and 12" });
        }

        if (request.Salary < 0)
        {
            return Results.BadRequest(new { error = "Salary must be non-negative" });
        }

        var userId = context.GetUserId();

        try
        {
            var month = await monthService.CreateAsync(userId, request);
            return Results.Created($"/v1/months/{month.Id}", month);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
        {
            return Results.Conflict(new { error = "A month with this year and month already exists" });
        }
    }

    public static async Task<IResult> Update(HttpContext context, Guid id, UpdateMonthRequest request, IMonthService monthService)
    {
        if (request.Salary.HasValue && request.Salary.Value < 0)
        {
            return Results.BadRequest(new { error = "Salary must be non-negative" });
        }

        var userId = context.GetUserId();
        var month = await monthService.UpdateAsync(userId, id, request);

        return month is null
            ? Results.NotFound(new { error = "Month not found" })
            : Results.Ok(month);
    }

    public static async Task<IResult> Delete(HttpContext context, Guid id, IMonthService monthService)
    {
        var userId = context.GetUserId();
        var deleted = await monthService.DeleteAsync(userId, id);

        return deleted
            ? Results.NoContent()
            : Results.NotFound(new { error = "Month not found" });
    }
}
