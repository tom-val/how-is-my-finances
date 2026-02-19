using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;

namespace HowAreMyFinances.Api.Functions;

public static class CategoryFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, ICategoryRepository categoryRepository)
    {
        var userId = context.GetUserId();
        var categories = await categoryRepository.GetAllAsync(userId);
        return Results.Ok(categories);
    }
}
