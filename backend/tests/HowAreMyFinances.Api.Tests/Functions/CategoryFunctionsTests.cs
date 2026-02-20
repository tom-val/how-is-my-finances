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

public class CategoryFunctionsTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
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

    private static Category CreateTestCategory(Guid userId, Guid? id = null)
    {
        return new Category(
            Id: id ?? Guid.NewGuid(),
            UserId: userId,
            Name: "Test Category",
            Icon: null,
            SortOrder: 0,
            IsArchived: false,
            CreatedAt: DateTime.UtcNow
        );
    }

    [Fact]
    public async Task GetAll_ReturnsCategoriesList()
    {
        // Arrange
        var categories = new List<Category>
        {
            new(Guid.NewGuid(), _userId, "Food", null, 1, false, DateTime.UtcNow),
            new(Guid.NewGuid(), _userId, "Transport", null, 2, false, DateTime.UtcNow)
        };
        _categoryRepository.GetAllAsync(_userId).Returns(categories);

        // Act
        var result = await CategoryFunctions.GetAll(CreateContext(), _categoryRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<Category>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task Create_WithValidName_ReturnsCreated()
    {
        // Arrange
        var request = new CreateCategoryRequest("Food");
        var created = CreateTestCategory(_userId);
        _categoryRepository.CreateAsync(_userId, Arg.Any<CreateCategoryRequest>()).Returns(created);

        // Act
        var result = await CategoryFunctions.Create(CreateContext(), request, _categoryRepository);

        // Assert
        var createdResult = Assert.IsType<Created<Category>>(result);
        Assert.Equal(created.Id, createdResult.Value!.Id);
    }

    [Fact]
    public async Task Create_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateCategoryRequest("");

        // Act
        var result = await CategoryFunctions.Create(CreateContext(), request, _categoryRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
        await _categoryRepository.DidNotReceive().CreateAsync(Arg.Any<Guid>(), Arg.Any<CreateCategoryRequest>());
    }

    [Fact]
    public async Task Update_WhenExists_ReturnsUpdated()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        var request = new UpdateCategoryRequest("New Name", null);
        var updated = CreateTestCategory(_userId, categoryId);
        _categoryRepository.UpdateAsync(_userId, categoryId, Arg.Any<UpdateCategoryRequest>()).Returns(updated);

        // Act
        var result = await CategoryFunctions.Update(CreateContext(), categoryId, request, _categoryRepository);

        // Assert
        var okResult = Assert.IsType<Ok<Category>>(result);
        Assert.Equal(categoryId, okResult.Value!.Id);
    }

    [Fact]
    public async Task Update_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        var request = new UpdateCategoryRequest("New Name", null);
        _categoryRepository.UpdateAsync(_userId, categoryId, Arg.Any<UpdateCategoryRequest>()).Returns((Category?)null);

        // Act
        var result = await CategoryFunctions.Update(CreateContext(), categoryId, request, _categoryRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Update_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        var request = new UpdateCategoryRequest("  ", null);

        // Act
        var result = await CategoryFunctions.Update(CreateContext(), categoryId, request, _categoryRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
        await _categoryRepository.DidNotReceive().UpdateAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<UpdateCategoryRequest>());
    }

    [Fact]
    public async Task Update_ArchiveCategory_ReturnsUpdated()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        var request = new UpdateCategoryRequest(null, true);
        var archived = new Category(categoryId, _userId, "Test", null, 0, true, DateTime.UtcNow);
        _categoryRepository.UpdateAsync(_userId, categoryId, Arg.Any<UpdateCategoryRequest>()).Returns(archived);

        // Act
        var result = await CategoryFunctions.Update(CreateContext(), categoryId, request, _categoryRepository);

        // Assert
        var okResult = Assert.IsType<Ok<Category>>(result);
        Assert.True(okResult.Value!.IsArchived);
    }

    [Fact]
    public async Task Delete_WhenExists_ReturnsNoContent()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        _categoryRepository.DeleteAsync(_userId, categoryId).Returns(true);

        // Act
        var result = await CategoryFunctions.Delete(CreateContext(), categoryId, _categoryRepository);

        // Assert
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        _categoryRepository.DeleteAsync(_userId, categoryId).Returns(false);

        // Act
        var result = await CategoryFunctions.Delete(CreateContext(), categoryId, _categoryRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Delete_WhenHasExpenses_ReturnsConflict()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        var pgException = new PostgresException(
            messageText: "update or delete on table \"categories\" violates foreign key constraint",
            severity: "ERROR",
            invariantSeverity: "ERROR",
            sqlState: "23503");
        _categoryRepository.DeleteAsync(_userId, categoryId).Throws(pgException);

        // Act
        var result = await CategoryFunctions.Delete(CreateContext(), categoryId, _categoryRepository);

        // Assert
        Assert.Equal(409, GetStatusCode(result));
    }
}
