using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Npgsql;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class RecurringExpenseFunctionsTests
{
    private readonly IRecurringExpenseRepository _recurringExpenseRepository = Substitute.For<IRecurringExpenseRepository>();
    private readonly IVendorRepository _vendorRepository = Substitute.For<IVendorRepository>();
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

    private static RecurringExpenseWithCategory CreateTestRecurringExpense(Guid userId, Guid? id = null)
    {
        return new RecurringExpenseWithCategory(
            Id: id ?? Guid.NewGuid(),
            UserId: userId,
            CategoryId: Guid.NewGuid(),
            ItemName: "Rent",
            Amount: 500m,
            Vendor: null,
            Comment: null,
            DayOfMonth: 1,
            IsActive: true,
            CategoryName: "Housing",
            CategoryIcon: null,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow
        );
    }

    [Fact]
    public async Task GetAll_ReturnsRecurringExpensesList()
    {
        // Arrange
        var items = new List<RecurringExpenseWithCategory>
        {
            CreateTestRecurringExpense(_userId),
            CreateTestRecurringExpense(_userId)
        };
        _recurringExpenseRepository.GetAllAsync(_userId).Returns(items);

        // Act
        var result = await RecurringExpenseFunctions.GetAll(CreateContext(), _recurringExpenseRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<RecurringExpenseWithCategory>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreated()
    {
        // Arrange
        var request = new CreateRecurringExpenseRequest("Rent", 500m, Guid.NewGuid(), null, null, 1);
        var created = CreateTestRecurringExpense(_userId);
        _recurringExpenseRepository.CreateAsync(_userId, Arg.Any<CreateRecurringExpenseRequest>()).Returns(created);

        // Act
        var result = await RecurringExpenseFunctions.Create(CreateContext(), request, _recurringExpenseRepository, _vendorRepository);

        // Assert
        var createdResult = Assert.IsType<Created<RecurringExpenseWithCategory>>(result);
        Assert.Equal(created.Id, createdResult.Value!.Id);
    }

    [Fact]
    public async Task Create_WithEmptyItemName_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateRecurringExpenseRequest("", 500m, Guid.NewGuid(), null, null, 1);

        // Act
        var result = await RecurringExpenseFunctions.Create(CreateContext(), request, _recurringExpenseRepository, _vendorRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
        await _recurringExpenseRepository.DidNotReceive().CreateAsync(Arg.Any<Guid>(), Arg.Any<CreateRecurringExpenseRequest>());
    }

    [Fact]
    public async Task Create_WithInvalidDayOfMonth_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateRecurringExpenseRequest("Rent", 500m, Guid.NewGuid(), null, null, 31);

        // Act
        var result = await RecurringExpenseFunctions.Create(CreateContext(), request, _recurringExpenseRepository, _vendorRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Create_WithInvalidCategory_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateRecurringExpenseRequest("Rent", 500m, Guid.NewGuid(), null, null, 1);
        var pgException = new PostgresException(
            messageText: "insert or update on table \"recurring_expenses\" violates foreign key constraint",
            severity: "ERROR",
            invariantSeverity: "ERROR",
            sqlState: "23503");
        _recurringExpenseRepository.CreateAsync(_userId, Arg.Any<CreateRecurringExpenseRequest>()).Throws(pgException);

        // Act
        var result = await RecurringExpenseFunctions.Create(CreateContext(), request, _recurringExpenseRepository, _vendorRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WhenExists_ReturnsUpdated()
    {
        // Arrange
        var id = Guid.NewGuid();
        var request = new UpdateRecurringExpenseRequest("New Name", null, null, null, null, null, null);
        var updated = CreateTestRecurringExpense(_userId, id);
        _recurringExpenseRepository.UpdateAsync(_userId, id, Arg.Any<UpdateRecurringExpenseRequest>()).Returns(updated);

        // Act
        var result = await RecurringExpenseFunctions.Update(CreateContext(), id, request, _recurringExpenseRepository, _vendorRepository);

        // Assert
        var okResult = Assert.IsType<Ok<RecurringExpenseWithCategory>>(result);
        Assert.Equal(id, okResult.Value!.Id);
    }

    [Fact]
    public async Task Update_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var id = Guid.NewGuid();
        var request = new UpdateRecurringExpenseRequest("New Name", null, null, null, null, null, null);
        _recurringExpenseRepository.UpdateAsync(_userId, id, Arg.Any<UpdateRecurringExpenseRequest>()).Returns((RecurringExpenseWithCategory?)null);

        // Act
        var result = await RecurringExpenseFunctions.Update(CreateContext(), id, request, _recurringExpenseRepository, _vendorRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WithInvalidAmount_ReturnsBadRequest()
    {
        // Arrange
        var id = Guid.NewGuid();
        var request = new UpdateRecurringExpenseRequest(null, -5m, null, null, null, null, null);

        // Act
        var result = await RecurringExpenseFunctions.Update(CreateContext(), id, request, _recurringExpenseRepository, _vendorRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Delete_WhenExists_ReturnsNoContent()
    {
        // Arrange
        var id = Guid.NewGuid();
        _recurringExpenseRepository.DeleteAsync(_userId, id).Returns(true);

        // Act
        var result = await RecurringExpenseFunctions.Delete(CreateContext(), id, _recurringExpenseRepository);

        // Assert
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var id = Guid.NewGuid();
        _recurringExpenseRepository.DeleteAsync(_userId, id).Returns(false);

        // Act
        var result = await RecurringExpenseFunctions.Delete(CreateContext(), id, _recurringExpenseRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }
}
