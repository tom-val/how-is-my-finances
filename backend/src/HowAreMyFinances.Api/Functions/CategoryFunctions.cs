using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Services;

namespace HowAreMyFinances.Api.Functions;

public static class CategoryFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, ICategoryService categoryService)
    {
        var userId = context.GetUserId();
        var categories = await categoryService.GetAllAsync(userId);
        return Results.Ok(categories);
    }
}
