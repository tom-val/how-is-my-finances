using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class ImportFunctionsTests
{
    private readonly IImportRepository _importRepository = Substitute.For<IImportRepository>();
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

    private static ImportRequest CreateValidRequest()
    {
        return new ImportRequest(
            Categories: ["Food", "Transport"],
            Months:
            [
                new ImportMonthEntry(
                    Year: 2024,
                    Month: 1,
                    Salary: 2500m,
                    Expenses:
                    [
                        new ImportExpenseEntry(
                            ItemName: "Groceries",
                            Amount: 45.50m,
                            CategoryName: "Food",
                            Vendor: "Lidl",
                            ExpenseDate: "2024-01-15",
                            Comment: null)
                    ],
                    Incomes:
                    [
                        new ImportIncomeEntry(
                            Source: "Salary",
                            Amount: 2500m,
                            IncomeDate: "2024-01-10",
                            Comment: null)
                    ])
            ]);
    }

    [Fact]
    public async Task Import_WithValidRequest_Returns201()
    {
        // Arrange
        var request = CreateValidRequest();
        var expectedResult = new ImportResult(
            CategoriesCreated: 2,
            MonthsCreated: 1,
            ExpensesCreated: 1,
            IncomesCreated: 1);

        _importRepository.ImportAsync(_userId, request).Returns(expectedResult);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(201, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_WithValidRequest_ReturnsImportResult()
    {
        // Arrange
        var request = CreateValidRequest();
        var expectedResult = new ImportResult(
            CategoriesCreated: 2,
            MonthsCreated: 1,
            ExpensesCreated: 1,
            IncomesCreated: 1);

        _importRepository.ImportAsync(_userId, request).Returns(expectedResult);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        var createdResult = Assert.IsType<Created<ImportResult>>(result);
        Assert.Equal(2, createdResult.Value!.CategoriesCreated);
        Assert.Equal(1, createdResult.Value.MonthsCreated);
        Assert.Equal(1, createdResult.Value.ExpensesCreated);
        Assert.Equal(1, createdResult.Value.IncomesCreated);
    }

    [Fact]
    public async Task Import_EmptyCategories_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: [],
            Months: [new ImportMonthEntry(2024, 1, 2500m, [], [])]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_EmptyMonths_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months: []);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_InvalidMonth_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months: [new ImportMonthEntry(2024, 13, 2500m, [], [])]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_InvalidYear_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months: [new ImportMonthEntry(1999, 1, 2500m, [], [])]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_NegativeSalary_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months: [new ImportMonthEntry(2024, 1, -100m, [], [])]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_EmptyExpenseItemName_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months:
            [
                new ImportMonthEntry(2024, 1, 2500m,
                    Expenses: [new ImportExpenseEntry("", 10m, "Food", null, "2024-01-15", null)],
                    Incomes: [])
            ]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_ZeroExpenseAmount_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months:
            [
                new ImportMonthEntry(2024, 1, 2500m,
                    Expenses: [new ImportExpenseEntry("Milk", 0m, "Food", null, "2024-01-15", null)],
                    Incomes: [])
            ]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_InvalidExpenseDate_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months:
            [
                new ImportMonthEntry(2024, 1, 2500m,
                    Expenses: [new ImportExpenseEntry("Milk", 5m, "Food", null, "not-a-date", null)],
                    Incomes: [])
            ]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_EmptyCategoryName_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months:
            [
                new ImportMonthEntry(2024, 1, 2500m,
                    Expenses: [new ImportExpenseEntry("Milk", 5m, "", null, "2024-01-15", null)],
                    Incomes: [])
            ]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_EmptyIncomeSource_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months:
            [
                new ImportMonthEntry(2024, 1, 2500m,
                    Expenses: [],
                    Incomes: [new ImportIncomeEntry("", 2500m, "2024-01-10", null)])
            ]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_InvalidIncomeDate_Returns400()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months:
            [
                new ImportMonthEntry(2024, 1, 2500m,
                    Expenses: [],
                    Incomes: [new ImportIncomeEntry("Salary", 2500m, "invalid", null)])
            ]);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Import_MonthWithNoExpensesOrIncomes_Returns201()
    {
        // Arrange
        var request = new ImportRequest(
            Categories: ["Food"],
            Months: [new ImportMonthEntry(2024, 1, 2500m, [], [])]);

        var expectedResult = new ImportResult(1, 1, 0, 0);
        _importRepository.ImportAsync(_userId, request).Returns(expectedResult);

        // Act
        var result = await ImportFunctions.Import(CreateContext(), request, _importRepository);

        // Assert
        Assert.Equal(201, GetStatusCode(result));
    }
}
