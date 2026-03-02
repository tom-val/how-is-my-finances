using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Functions;

public static class AnalyticsFunctions
{
    public static async Task<IResult> Get(HttpContext context, IAnalyticsRepository analyticsRepository)
    {
        var (query, error) = AnalyticsQuery.TryParse(context);
        if (query is null)
        {
            return Results.BadRequest(new { error });
        }

        var userId = context.GetUserId();
        var analytics = await analyticsRepository.GetAnalyticsAsync(
            userId, query.StartYear, query.StartMonth, query.EndYear, query.EndMonth);

        return Results.Ok(analytics);
    }

    public static async Task<IResult> GetExpenses(HttpContext context, IAnalyticsRepository analyticsRepository)
    {
        var (query, error) = AnalyticsQuery.TryParse(context);
        if (query is null)
        {
            return Results.BadRequest(new { error });
        }

        Guid? categoryId = Guid.TryParse(context.Request.Query["categoryId"], out var cid) ? cid : null;
        var vendor = context.Request.Query["vendor"].FirstOrDefault();

        var userId = context.GetUserId();
        var expenses = await analyticsRepository.GetFilteredExpensesAsync(
            userId, query.StartYear, query.StartMonth, query.EndYear, query.EndMonth,
            categoryId, vendor);

        return Results.Ok(expenses);
    }
}
