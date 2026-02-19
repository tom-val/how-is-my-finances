using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class IncomeFunctionsTests
{
    private readonly IIncomeRepository _incomeRepository = Substitute.For<IIncomeRepository>();
    private readonly IMonthRepository _monthRepository = Substitute.For<IMonthRepository>();
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

    private static Income CreateTestIncome(Guid userId, Guid monthId, Guid? id = null)
    {
        return new Income(
            Id: id ?? Guid.NewGuid(),
            UserId: userId,
            MonthId: monthId,
            Source: "Freelance",
            Amount: 500m,
            IncomeDate: new DateOnly(2026, 2, 19),
            Comment: null,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow
        );
    }

    [Fact]
    public async Task GetAll_ReturnsIncomesList()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var incomes = new List<Income>
        {
            CreateTestIncome(_userId, monthId),
            CreateTestIncome(_userId, monthId)
        };
        _incomeRepository.GetAllByMonthAsync(_userId, monthId).Returns(incomes);

        // Act
        var result = await IncomeFunctions.GetAll(CreateContext(), monthId, _incomeRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<Income>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreated()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateIncomeRequest("Bonus", 1000m, new DateOnly(2026, 2, 15), null);
        var month = new MonthDetail(monthId, _userId, 2026, 2, 4000m, null, 100m, 0m, 0m, 3900m, DateTime.UtcNow, DateTime.UtcNow);
        var created = CreateTestIncome(_userId, monthId);

        _monthRepository.GetByIdAsync(_userId, monthId).Returns(month);
        _incomeRepository.CreateAsync(_userId, monthId, request).Returns(created);

        // Act
        var result = await IncomeFunctions.Create(CreateContext(), monthId, request, _incomeRepository, _monthRepository);

        // Assert
        var createdResult = Assert.IsType<Created<Income>>(result);
        Assert.Equal(created.Id, createdResult.Value!.Id);
    }

    [Fact]
    public async Task Create_WithEmptySource_ReturnsBadRequest()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateIncomeRequest("  ", 500m, new DateOnly(2026, 2, 15), null);

        // Act
        var result = await IncomeFunctions.Create(CreateContext(), monthId, request, _incomeRepository, _monthRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithZeroAmount_ReturnsBadRequest()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateIncomeRequest("Bonus", 0m, new DateOnly(2026, 2, 15), null);

        // Act
        var result = await IncomeFunctions.Create(CreateContext(), monthId, request, _incomeRepository, _monthRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithNegativeAmount_ReturnsBadRequest()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateIncomeRequest("Bonus", -100m, new DateOnly(2026, 2, 15), null);

        // Act
        var result = await IncomeFunctions.Create(CreateContext(), monthId, request, _incomeRepository, _monthRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WhenMonthNotFound_ReturnsNotFound()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateIncomeRequest("Bonus", 500m, new DateOnly(2026, 2, 15), null);
        _monthRepository.GetByIdAsync(_userId, monthId).Returns((MonthDetail?)null);

        // Act
        var result = await IncomeFunctions.Create(CreateContext(), monthId, request, _incomeRepository, _monthRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WhenExists_ReturnsUpdated()
    {
        // Arrange
        var incomeId = Guid.NewGuid();
        var request = new UpdateIncomeRequest(Source: "Updated", Amount: 750m, IncomeDate: null, Comment: null);
        var updated = CreateTestIncome(_userId, Guid.NewGuid(), incomeId);
        _incomeRepository.UpdateAsync(_userId, incomeId, request).Returns(updated);

        // Act
        var result = await IncomeFunctions.Update(CreateContext(), incomeId, request, _incomeRepository);

        // Assert
        var okResult = Assert.IsType<Ok<Income>>(result);
        Assert.Equal(incomeId, okResult.Value!.Id);
    }

    [Fact]
    public async Task Update_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var incomeId = Guid.NewGuid();
        var request = new UpdateIncomeRequest(Source: "Updated", Amount: null, IncomeDate: null, Comment: null);
        _incomeRepository.UpdateAsync(_userId, incomeId, request).Returns((Income?)null);

        // Act
        var result = await IncomeFunctions.Update(CreateContext(), incomeId, request, _incomeRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WithNegativeAmount_ReturnsBadRequest()
    {
        // Arrange
        var incomeId = Guid.NewGuid();
        var request = new UpdateIncomeRequest(Source: null, Amount: -5m, IncomeDate: null, Comment: null);

        // Act
        var result = await IncomeFunctions.Update(CreateContext(), incomeId, request, _incomeRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Delete_WhenExists_ReturnsNoContent()
    {
        // Arrange
        var incomeId = Guid.NewGuid();
        _incomeRepository.DeleteAsync(_userId, incomeId).Returns(true);

        // Act
        var result = await IncomeFunctions.Delete(CreateContext(), incomeId, _incomeRepository);

        // Assert
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var incomeId = Guid.NewGuid();
        _incomeRepository.DeleteAsync(_userId, incomeId).Returns(false);

        // Act
        var result = await IncomeFunctions.Delete(CreateContext(), incomeId, _incomeRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }
}
