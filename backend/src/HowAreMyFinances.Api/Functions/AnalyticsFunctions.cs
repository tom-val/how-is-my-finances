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
}
