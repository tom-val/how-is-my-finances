using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Infrastructure;
using HowAreMyFinances.Api.Models;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Infrastructure;

public class MonthServiceTests
{
    private readonly IMonthRepository _monthRepository = Substitute.For<IMonthRepository>();
    private readonly IRecurringExpenseRepository _recurringExpenseRepository = Substitute.For<IRecurringExpenseRepository>();
    private readonly IExpenseRepository _expenseRepository = Substitute.For<IExpenseRepository>();
    private readonly Guid _userId = Guid.NewGuid();

    private MonthService CreateService() => new(_monthRepository, _recurringExpenseRepository, _expenseRepository);

    private Month Month(int year = 2026, int month = 11) =>
        new(Guid.NewGuid(), _userId, year, month, 0m, null, DateTime.UtcNow, DateTime.UtcNow);

    [Fact]
    public async Task GetOrCreate_WhenExists_ReturnsExistingWithoutCreating()
    {
        // Arrange
        var existing = Month();
        _monthRepository.GetByYearMonthAsync(_userId, 2026, 11).Returns(existing);

        // Act
        var result = await CreateService().GetOrCreateAsync(_userId, 2026, 11);

        // Assert
        Assert.Equal(existing.Id, result.Id);
        await _monthRepository.DidNotReceiveWithAnyArgs().CreateIfNotExistsAsync(default, default!);
        await _expenseRepository.DidNotReceiveWithAnyArgs().CreateFromRecurringAsync(default, default, default!, default);
    }

    [Fact]
    public async Task GetOrCreate_WhenMissing_CreatesAndGeneratesRecurringExpenses()
    {
        // Arrange
        var created = Month();
        var template = new RecurringExpense(Guid.NewGuid(), _userId, Guid.NewGuid(), "Rent", 500m, null, null, 5, true, false,
            DateTime.UtcNow, DateTime.UtcNow);
        _monthRepository.GetByYearMonthAsync(_userId, 2026, 11).Returns((Month?)null);
        _monthRepository.CreateIfNotExistsAsync(_userId, new CreateMonthRequest(2026, 11, 0m)).Returns(created);
        _recurringExpenseRepository.GetActiveAsync(_userId).Returns(new List<RecurringExpense> { template });

        // Act
        var result = await CreateService().GetOrCreateAsync(_userId, 2026, 11);

        // Assert
        Assert.Equal(created.Id, result.Id);
        await _expenseRepository.Received(1).CreateFromRecurringAsync(_userId, created.Id, template, new DateOnly(2026, 11, 5));
    }

    [Fact]
    public async Task GetOrCreate_WhenRaceLost_ReturnsTheOtherMonthWithoutGenerating()
    {
        // Arrange
        var other = Month();
        _monthRepository.GetByYearMonthAsync(_userId, 2026, 11).Returns((Month?)null, other);
        _monthRepository.CreateIfNotExistsAsync(_userId, Arg.Any<CreateMonthRequest>()).Returns((Month?)null);

        // Act
        var result = await CreateService().GetOrCreateAsync(_userId, 2026, 11);

        // Assert
        Assert.Equal(other.Id, result.Id);
        await _recurringExpenseRepository.DidNotReceiveWithAnyArgs().GetActiveAsync(default);
    }
}
