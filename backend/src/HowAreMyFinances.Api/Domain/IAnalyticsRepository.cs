using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IAnalyticsRepository
{
    Task<AnalyticsResponse> GetAnalyticsAsync(
        Guid userId, int startYear, int startMonth, int endYear, int endMonth);
}
