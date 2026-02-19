using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using HowAreMyFinances.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class CategoryFunctionsTests
{
    private readonly ICategoryService _categoryService = Substitute.For<ICategoryService>();
    private readonly Guid _userId = Guid.NewGuid();

    private HttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Items["UserId"] = _userId;
        return context;
    }

    [Fact]
    public async Task GetAll_ReturnsCategoriesList()
    {
        // Arrange
        var categories = new List<Category>
        {
            new(Guid.NewGuid(), _userId, "Food", null, 1, DateTime.UtcNow),
            new(Guid.NewGuid(), _userId, "Transport", null, 2, DateTime.UtcNow)
        };
        _categoryService.GetAllAsync(_userId).Returns(categories);

        // Act
        var result = await CategoryFunctions.GetAll(CreateContext(), _categoryService);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<Category>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }
}
