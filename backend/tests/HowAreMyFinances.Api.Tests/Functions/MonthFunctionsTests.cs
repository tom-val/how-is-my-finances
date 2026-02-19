using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using HowAreMyFinances.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class MonthFunctionsTests
{
    private readonly IMonthService _monthService = Substitute.For<IMonthService>();
    private readonly Guid _userId = Guid.NewGuid();

    private HttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Items["UserId"] = _userId;
        return context;
    }

    private static int GetStatusCode(IResult result)
    {
        var statusCodeResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        return statusCodeResult.StatusCode!.Value;
    }

    [Fact]
    public async Task GetAll_ReturnsMonthsList()
    {
        // Arrange
        var months = new List<Month>
        {
            new(Guid.NewGuid(), _userId, 2026, 2, 4000m, null, DateTime.UtcNow, DateTime.UtcNow),
            new(Guid.NewGuid(), _userId, 2026, 1, 3500m, null, DateTime.UtcNow, DateTime.UtcNow)
        };
        _monthService.GetAllAsync(_userId).Returns(months);

        // Act
        var result = await MonthFunctions.GetAll(CreateContext(), _monthService);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<Month>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task GetById_WhenExists_ReturnsMonth()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var month = new MonthDetail(monthId, _userId, 2026, 2, 4000m, null, 1500m, 0m, 2500m, DateTime.UtcNow, DateTime.UtcNow);
        _monthService.GetByIdAsync(_userId, monthId).Returns(month);

        // Act
        var result = await MonthFunctions.GetById(CreateContext(), monthId, _monthService);

        // Assert
        var okResult = Assert.IsType<Ok<MonthDetail>>(result);
        Assert.Equal(4000m, okResult.Value!.Salary);
        Assert.Equal(2500m, okResult.Value.Remaining);
    }

    [Fact]
    public async Task GetById_WhenNotFound_Returns404()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        _monthService.GetByIdAsync(_userId, monthId).Returns((MonthDetail?)null);

        // Act
        var result = await MonthFunctions.GetById(CreateContext(), monthId, _monthService);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreated()
    {
        // Arrange
        var request = new CreateMonthRequest(2026, 3, 4500m);
        var created = new Month(Guid.NewGuid(), _userId, 2026, 3, 4500m, null, DateTime.UtcNow, DateTime.UtcNow);
        _monthService.CreateAsync(_userId, request).Returns(created);

        // Act
        var result = await MonthFunctions.Create(CreateContext(), request, _monthService);

        // Assert
        var createdResult = Assert.IsType<Created<Month>>(result);
        Assert.Equal(4500m, createdResult.Value!.Salary);
    }

    [Fact]
    public async Task Create_WithInvalidMonth_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateMonthRequest(2026, 13, 4500m);

        // Act
        var result = await MonthFunctions.Create(CreateContext(), request, _monthService);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithNegativeSalary_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateMonthRequest(2026, 3, -100m);

        // Act
        var result = await MonthFunctions.Create(CreateContext(), request, _monthService);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WhenExists_ReturnsUpdated()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new UpdateMonthRequest(5000m, null);
        var updated = new Month(monthId, _userId, 2026, 2, 5000m, null, DateTime.UtcNow, DateTime.UtcNow);
        _monthService.UpdateAsync(_userId, monthId, request).Returns(updated);

        // Act
        var result = await MonthFunctions.Update(CreateContext(), monthId, request, _monthService);

        // Assert
        var okResult = Assert.IsType<Ok<Month>>(result);
        Assert.Equal(5000m, okResult.Value!.Salary);
    }

    [Fact]
    public async Task Update_WhenNotFound_Returns404()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new UpdateMonthRequest(5000m, null);
        _monthService.UpdateAsync(_userId, monthId, request).Returns((Month?)null);

        // Act
        var result = await MonthFunctions.Update(CreateContext(), monthId, request, _monthService);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Delete_WhenExists_ReturnsNoContent()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        _monthService.DeleteAsync(_userId, monthId).Returns(true);

        // Act
        var result = await MonthFunctions.Delete(CreateContext(), monthId, _monthService);

        // Assert
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_Returns404()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        _monthService.DeleteAsync(_userId, monthId).Returns(false);

        // Act
        var result = await MonthFunctions.Delete(CreateContext(), monthId, _monthService);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }
}
