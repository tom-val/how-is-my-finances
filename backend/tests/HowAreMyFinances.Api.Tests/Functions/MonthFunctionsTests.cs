using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class MonthFunctionsTests
{
    private readonly IMonthRepository _monthRepository = Substitute.For<IMonthRepository>();
    private readonly IRecurringExpenseRepository _recurringExpenseRepository = Substitute.For<IRecurringExpenseRepository>();
    private readonly IExpenseRepository _expenseRepository = Substitute.For<IExpenseRepository>();
    private readonly Guid _userId = Guid.NewGuid();

    public MonthFunctionsTests()
    {
        // Default: no active recurring templates
        _recurringExpenseRepository.GetActiveAsync(Arg.Any<Guid>())
            .Returns(new List<RecurringExpense>());
    }

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
        var months = new List<MonthSummary>
        {
            new(Guid.NewGuid(), _userId, 2026, 2, 4000m, null, 500m, 200m, 3700m, DateTime.UtcNow, DateTime.UtcNow),
            new(Guid.NewGuid(), _userId, 2026, 1, 3500m, null, 1000m, 0m, 2500m, DateTime.UtcNow, DateTime.UtcNow)
        };
        _monthRepository.GetAllAsync(_userId).Returns(months);

        // Act
        var result = await MonthFunctions.GetAll(CreateContext(), _monthRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<MonthSummary>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task GetById_WhenExists_ReturnsMonth()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var month = new MonthDetail(monthId, _userId, 2026, 2, 4000m, null, 1500m, 0m, 0m, 2500m, DateTime.UtcNow, DateTime.UtcNow);
        _monthRepository.GetByIdAsync(_userId, monthId).Returns(month);

        // Act
        var result = await MonthFunctions.GetById(CreateContext(), monthId, _monthRepository);

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
        _monthRepository.GetByIdAsync(_userId, monthId).Returns((MonthDetail?)null);

        // Act
        var result = await MonthFunctions.GetById(CreateContext(), monthId, _monthRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreated()
    {
        // Arrange
        var request = new CreateMonthRequest(2026, 3, 4500m);
        var created = new Month(Guid.NewGuid(), _userId, 2026, 3, 4500m, null, DateTime.UtcNow, DateTime.UtcNow);
        _monthRepository.CreateAsync(_userId, request).Returns(created);

        // Act
        var result = await MonthFunctions.Create(CreateContext(), request, _monthRepository, _recurringExpenseRepository, _expenseRepository);

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
        var result = await MonthFunctions.Create(CreateContext(), request, _monthRepository, _recurringExpenseRepository, _expenseRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithNegativeSalary_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateMonthRequest(2026, 3, -100m);

        // Act
        var result = await MonthFunctions.Create(CreateContext(), request, _monthRepository, _recurringExpenseRepository, _expenseRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithActiveTemplates_GeneratesExpenses()
    {
        // Arrange
        var request = new CreateMonthRequest(2026, 3, 4500m);
        var created = new Month(Guid.NewGuid(), _userId, 2026, 3, 4500m, null, DateTime.UtcNow, DateTime.UtcNow);
        _monthRepository.CreateAsync(_userId, request).Returns(created);

        var templates = new List<RecurringExpense>
        {
            new(Guid.NewGuid(), _userId, Guid.NewGuid(), "Rent", 500m, null, null, 1, true, DateTime.UtcNow, DateTime.UtcNow),
            new(Guid.NewGuid(), _userId, Guid.NewGuid(), "Internet", 30m, "ISP", null, 15, true, DateTime.UtcNow, DateTime.UtcNow)
        };
        _recurringExpenseRepository.GetActiveAsync(_userId).Returns(templates);

        // Act
        var result = await MonthFunctions.Create(CreateContext(), request, _monthRepository, _recurringExpenseRepository, _expenseRepository);

        // Assert
        Assert.IsType<Created<Month>>(result);
        await _expenseRepository.Received(1).CreateFromRecurringAsync(
            _userId, created.Id, templates[0], new DateOnly(2026, 3, 1));
        await _expenseRepository.Received(1).CreateFromRecurringAsync(
            _userId, created.Id, templates[1], new DateOnly(2026, 3, 15));
    }

    [Fact]
    public async Task Create_WithNoActiveTemplates_DoesNotGenerateExpenses()
    {
        // Arrange
        var request = new CreateMonthRequest(2026, 3, 4500m);
        var created = new Month(Guid.NewGuid(), _userId, 2026, 3, 4500m, null, DateTime.UtcNow, DateTime.UtcNow);
        _monthRepository.CreateAsync(_userId, request).Returns(created);

        // Act
        var result = await MonthFunctions.Create(CreateContext(), request, _monthRepository, _recurringExpenseRepository, _expenseRepository);

        // Assert
        Assert.IsType<Created<Month>>(result);
        await _expenseRepository.DidNotReceive().CreateFromRecurringAsync(
            Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<RecurringExpense>(), Arg.Any<DateOnly>());
    }

    [Fact]
    public async Task Update_WhenExists_ReturnsUpdated()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new UpdateMonthRequest(5000m, null);
        var updated = new Month(monthId, _userId, 2026, 2, 5000m, null, DateTime.UtcNow, DateTime.UtcNow);
        _monthRepository.UpdateAsync(_userId, monthId, request).Returns(updated);

        // Act
        var result = await MonthFunctions.Update(CreateContext(), monthId, request, _monthRepository);

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
        _monthRepository.UpdateAsync(_userId, monthId, request).Returns((Month?)null);

        // Act
        var result = await MonthFunctions.Update(CreateContext(), monthId, request, _monthRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Delete_WhenExists_ReturnsNoContent()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        _monthRepository.DeleteAsync(_userId, monthId).Returns(true);

        // Act
        var result = await MonthFunctions.Delete(CreateContext(), monthId, _monthRepository);

        // Assert
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_Returns404()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        _monthRepository.DeleteAsync(_userId, monthId).Returns(false);

        // Act
        var result = await MonthFunctions.Delete(CreateContext(), monthId, _monthRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }
}
