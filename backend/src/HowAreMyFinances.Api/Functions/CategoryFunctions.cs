using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;
using Npgsql;

namespace HowAreMyFinances.Api.Functions;

public static class CategoryFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, ICategoryRepository categoryRepository)
    {
        var userId = context.GetUserId();
        var categories = await categoryRepository.GetAllAsync(userId);
        return Results.Ok(categories);
    }

    public static async Task<IResult> Create(
        HttpContext context,
        CreateCategoryRequest request,
        ICategoryRepository categoryRepository)
    {
        var validation = CategoryEntity.ValidateName(request.Name);
        if (!validation.IsSuccess)
            return Results.BadRequest(new { error = validation.Error });

        var userId = context.GetUserId();
        var category = await categoryRepository.CreateAsync(userId,
            new CreateCategoryRequest(validation.Value!.Name));
        return Results.Created($"/v1/categories/{category.Id}", category);
    }

    public static async Task<IResult> Update(
        HttpContext context,
        Guid id,
        UpdateCategoryRequest request,
        ICategoryRepository categoryRepository)
    {
        var validation = CategoryEntity.ValidateUpdate(request.Name);
        if (!validation.IsSuccess)
            return Results.BadRequest(new { error = validation.Error });

        var userId = context.GetUserId();
        var trimmedRequest = request.Name is not null
            ? request with { Name = request.Name.Trim() }
            : request;

        var category = await categoryRepository.UpdateAsync(userId, id, trimmedRequest);

        return category is null
            ? Results.NotFound(new { error = "Category not found" })
            : Results.Ok(category);
    }

    public static async Task<IResult> Delete(
        HttpContext context,
        Guid id,
        ICategoryRepository categoryRepository)
    {
        var userId = context.GetUserId();

        try
        {
            var deleted = await categoryRepository.DeleteAsync(userId, id);

            return deleted
                ? Results.NoContent()
                : Results.NotFound(new { error = "Category not found" });
        }
        catch (PostgresException ex) when (ex.SqlState == "23503")
        {
            return Results.Conflict(new { error = "Cannot delete category that has expenses" });
        }
    }
}
