using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class AnalyticsFunctionsTests
{
    private readonly IAnalyticsRepository _analyticsRepository = Substitute.For<IAnalyticsRepository>();
    private readonly Guid _userId = Guid.NewGuid();

    private HttpContext CreateContext(string queryString = "?startYear=2026&startMonth=1&endYear=2026&endMonth=3")
    {
        var context = new DefaultHttpContext();
        context.Items["UserId"] = _userId;
        context.Request.QueryString = new QueryString(queryString);
        return context;
    }

    private static int GetStatusCode(IResult result)
    {
        var statusCodeResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        return statusCodeResult.StatusCode!.Value;
    }

    [Fact]
    public async Task Get_WithValidParams_ReturnsAnalytics()
    {
        // Arrange
        var response = new AnalyticsResponse(
            CategoryTotals: [new CategoryTotal(Guid.NewGuid(), "Food", 500m)],
            VendorTotals: [new VendorTotal("Lidl", 300m, 5)]);

        _analyticsRepository.GetAnalyticsAsync(_userId, 2026, 1, 2026, 3).Returns(response);

        // Act
        var result = await AnalyticsFunctions.Get(CreateContext(), _analyticsRepository);

        // Assert
        var okResult = Assert.IsType<Ok<AnalyticsResponse>>(result);
        Assert.Single(okResult.Value!.CategoryTotals);
        Assert.Single(okResult.Value.VendorTotals);
        Assert.Equal("Food", okResult.Value.CategoryTotals[0].CategoryName);
        Assert.Equal(500m, okResult.Value.CategoryTotals[0].Total);
    }

    [Fact]
    public async Task Get_WithEmptyData_ReturnsEmptyLists()
    {
        // Arrange
        var response = new AnalyticsResponse(
            CategoryTotals: [],
            VendorTotals: []);

        _analyticsRepository.GetAnalyticsAsync(_userId, 2026, 1, 2026, 3).Returns(response);

        // Act
        var result = await AnalyticsFunctions.Get(CreateContext(), _analyticsRepository);

        // Assert
        var okResult = Assert.IsType<Ok<AnalyticsResponse>>(result);
        Assert.Empty(okResult.Value!.CategoryTotals);
        Assert.Empty(okResult.Value.VendorTotals);
    }

    [Fact]
    public async Task Get_MissingParams_Returns400()
    {
        // Act
        var result = await AnalyticsFunctions.Get(CreateContext("?startYear=2026"), _analyticsRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Get_InvalidMonth_Returns400()
    {
        // Act
        var result = await AnalyticsFunctions.Get(
            CreateContext("?startYear=2026&startMonth=0&endYear=2026&endMonth=13"), _analyticsRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Get_StartAfterEnd_Returns400()
    {
        // Act
        var result = await AnalyticsFunctions.Get(
            CreateContext("?startYear=2026&startMonth=6&endYear=2026&endMonth=3"), _analyticsRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Get_InvalidYear_Returns400()
    {
        // Act
        var result = await AnalyticsFunctions.Get(
            CreateContext("?startYear=1999&startMonth=1&endYear=2101&endMonth=12"), _analyticsRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }
}
