namespace HowAreMyFinances.Api.Models;

public sealed record AnalyticsResponse(
    IReadOnlyList<CategoryTotal> CategoryTotals,
    IReadOnlyList<VendorTotal> VendorTotals
);

public sealed record CategoryTotal(
    Guid CategoryId,
    string CategoryName,
    decimal Total
);

public sealed record VendorTotal(
    string Vendor,
    decimal Total,
    int Count
);

public sealed record AnalyticsQuery(int StartYear, int StartMonth, int EndYear, int EndMonth)
{
    public static (AnalyticsQuery? Query, string? Error) TryParse(HttpContext context)
    {
        var query = context.Request.Query;

        if (!int.TryParse(query["startYear"], out var startYear) ||
            !int.TryParse(query["startMonth"], out var startMonth) ||
            !int.TryParse(query["endYear"], out var endYear) ||
            !int.TryParse(query["endMonth"], out var endMonth))
        {
            return (null, "startYear, startMonth, endYear, and endMonth query parameters are required");
        }

        if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12)
        {
            return (null, "Month values must be between 1 and 12");
        }

        if (startYear < 2000 || startYear > 2100 || endYear < 2000 || endYear > 2100)
        {
            return (null, "Year values must be between 2000 and 2100");
        }

        if (startYear > endYear || (startYear == endYear && startMonth > endMonth))
        {
            return (null, "Start date must not be after end date");
        }

        return (new AnalyticsQuery(startYear, startMonth, endYear, endMonth), null);
    }
}
