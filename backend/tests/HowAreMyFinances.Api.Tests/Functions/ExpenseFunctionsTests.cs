using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class ExpenseFunctionsTests
{
    private readonly IExpenseRepository _expenseRepository = Substitute.For<IExpenseRepository>();
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

    private static ExpenseWithCategory CreateTestExpense(Guid userId, Guid monthId, Guid? id = null)
    {
        return new ExpenseWithCategory(
            Id: id ?? Guid.NewGuid(),
            UserId: userId,
            MonthId: monthId,
            CategoryId: Guid.NewGuid(),
            ItemName: "Test item",
            Amount: 12.50m,
            Vendor: "Test shop",
            ExpenseDate: new DateOnly(2026, 2, 19),
            Comment: null,
            IsRecurringInstance: false,
            CategoryName: "Food",
            CategoryIcon: null,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow
        );
    }

    [Fact]
    public async Task GetAll_ReturnsExpensesList()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var expenses = new List<ExpenseWithCategory>
        {
            CreateTestExpense(_userId, monthId),
            CreateTestExpense(_userId, monthId)
        };
        _expenseRepository.GetAllByMonthAsync(_userId, monthId).Returns(expenses);

        // Act
        var result = await ExpenseFunctions.GetAll(CreateContext(), monthId, _expenseRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<ExpenseWithCategory>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreated()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateExpenseRequest("Coffee", 4.50m, Guid.NewGuid(), "Caffeine", new DateOnly(2026, 2, 19), null);
        var month = new MonthDetail(monthId, _userId, 2026, 2, 4000m, null, 100m, 0m, 0m, 3900m, [], 0, DateTime.UtcNow, DateTime.UtcNow);
        var created = CreateTestExpense(_userId, monthId);

        _monthRepository.GetByIdAsync(_userId, monthId).Returns(month);
        _expenseRepository.CreateAsync(_userId, monthId, request).Returns(created);

        // Act
        var result = await ExpenseFunctions.Create(CreateContext(), monthId, request, _expenseRepository, _monthRepository);

        // Assert
        var createdResult = Assert.IsType<Created<ExpenseWithCategory>>(result);
        Assert.Equal(created.Id, createdResult.Value!.Id);
    }

    [Fact]
    public async Task Create_WithZeroAmount_ReturnsBadRequest()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateExpenseRequest("Coffee", 0m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Act
        var result = await ExpenseFunctions.Create(CreateContext(), monthId, request, _expenseRepository, _monthRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithNegativeAmount_ReturnsBadRequest()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateExpenseRequest("Coffee", -5m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Act
        var result = await ExpenseFunctions.Create(CreateContext(), monthId, request, _expenseRepository, _monthRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithEmptyItemName_ReturnsBadRequest()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateExpenseRequest("  ", 10m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Act
        var result = await ExpenseFunctions.Create(CreateContext(), monthId, request, _expenseRepository, _monthRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WhenMonthNotFound_ReturnsNotFound()
    {
        // Arrange
        var monthId = Guid.NewGuid();
        var request = new CreateExpenseRequest("Coffee", 4.50m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);
        _monthRepository.GetByIdAsync(_userId, monthId).Returns((MonthDetail?)null);

        // Act
        var result = await ExpenseFunctions.Create(CreateContext(), monthId, request, _expenseRepository, _monthRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WhenExists_ReturnsUpdated()
    {
        // Arrange
        var expenseId = Guid.NewGuid();
        var request = new UpdateExpenseRequest(Amount: 25m, ItemName: null, CategoryId: null, Vendor: null, ExpenseDate: null, Comment: null);
        var updated = CreateTestExpense(_userId, Guid.NewGuid(), expenseId);
        _expenseRepository.UpdateAsync(_userId, expenseId, request).Returns(updated);

        // Act
        var result = await ExpenseFunctions.Update(CreateContext(), expenseId, request, _expenseRepository);

        // Assert
        var okResult = Assert.IsType<Ok<ExpenseWithCategory>>(result);
        Assert.Equal(expenseId, okResult.Value!.Id);
    }

    [Fact]
    public async Task Update_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var expenseId = Guid.NewGuid();
        var request = new UpdateExpenseRequest(Amount: 25m, ItemName: null, CategoryId: null, Vendor: null, ExpenseDate: null, Comment: null);
        _expenseRepository.UpdateAsync(_userId, expenseId, request).Returns((ExpenseWithCategory?)null);

        // Act
        var result = await ExpenseFunctions.Update(CreateContext(), expenseId, request, _expenseRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WithNegativeAmount_ReturnsBadRequest()
    {
        // Arrange
        var expenseId = Guid.NewGuid();
        var request = new UpdateExpenseRequest(Amount: -5m, ItemName: null, CategoryId: null, Vendor: null, ExpenseDate: null, Comment: null);

        // Act
        var result = await ExpenseFunctions.Update(CreateContext(), expenseId, request, _expenseRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Delete_WhenExists_ReturnsNoContent()
    {
        // Arrange
        var expenseId = Guid.NewGuid();
        _expenseRepository.DeleteAsync(_userId, expenseId).Returns(true);

        // Act
        var result = await ExpenseFunctions.Delete(CreateContext(), expenseId, _expenseRepository);

        // Assert
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var expenseId = Guid.NewGuid();
        _expenseRepository.DeleteAsync(_userId, expenseId).Returns(false);

        // Act
        var result = await ExpenseFunctions.Delete(CreateContext(), expenseId, _expenseRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task GetVendors_ReturnsVendorList()
    {
        // Arrange
        var vendors = new List<string> { "Lidl", "Maxima" };
        _expenseRepository.GetVendorsAsync(_userId).Returns(vendors);

        // Act
        var result = await ExpenseFunctions.GetVendors(CreateContext(), _expenseRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<string>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task GetHiddenVendors_ReturnsHiddenVendorList()
    {
        // Arrange
        var hiddenVendors = new List<string> { "OldShop", "ClosedStore" };
        _expenseRepository.GetHiddenVendorsAsync(_userId).Returns(hiddenVendors);

        // Act
        var result = await ExpenseFunctions.GetHiddenVendors(CreateContext(), _expenseRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<string>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
        Assert.Contains("OldShop", okResult.Value!);
        Assert.Contains("ClosedStore", okResult.Value!);
    }

    [Fact]
    public async Task SetHiddenVendors_WithValidRequest_ReturnsOk()
    {
        // Arrange
        var request = new HiddenVendorsRequest(["OldShop", "ClosedStore"]);

        // Act
        var result = await ExpenseFunctions.SetHiddenVendors(CreateContext(), request, _expenseRepository);

        // Assert
        var okResult = Assert.IsType<Ok<List<string>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
        await _expenseRepository.Received(1).SetHiddenVendorsAsync(_userId, request.Vendors);
    }

    [Fact]
    public async Task SetHiddenVendors_WithEmptyList_ReturnsOk()
    {
        // Arrange
        var request = new HiddenVendorsRequest([]);

        // Act
        var result = await ExpenseFunctions.SetHiddenVendors(CreateContext(), request, _expenseRepository);

        // Assert
        var okResult = Assert.IsType<Ok<List<string>>>(result);
        Assert.Empty(okResult.Value!);
        await _expenseRepository.Received(1).SetHiddenVendorsAsync(_userId, request.Vendors);
    }
}
