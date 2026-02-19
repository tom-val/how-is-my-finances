using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Functions;

public static class IncomeFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, Guid monthId, IIncomeRepository incomeRepository)
    {
        var userId = context.GetUserId();
        var incomes = await incomeRepository.GetAllByMonthAsync(userId, monthId);
        return Results.Ok(incomes);
    }

    public static async Task<IResult> Create(
        HttpContext context,
        Guid monthId,
        CreateIncomeRequest request,
        IIncomeRepository incomeRepository,
        IMonthRepository monthRepository)
    {
        var validation = IncomeEntity.Create(request.Source, request.Amount, request.IncomeDate, request.Comment);
        if (!validation.IsSuccess)
        {
            return Results.BadRequest(new { error = validation.Error });
        }

        var userId = context.GetUserId();

        // Verify month exists and belongs to user
        var month = await monthRepository.GetByIdAsync(userId, monthId);
        if (month is null)
        {
            return Results.NotFound(new { error = "Month not found" });
        }

        var income = await incomeRepository.CreateAsync(userId, monthId, request);
        return Results.Created($"/v1/incomes/{income.Id}", income);
    }

    public static async Task<IResult> Update(HttpContext context, Guid id, UpdateIncomeRequest request, IIncomeRepository incomeRepository)
    {
        var validation = IncomeEntity.ValidateUpdate(request.Source, request.Amount);
        if (!validation.IsSuccess)
        {
            return Results.BadRequest(new { error = validation.Error });
        }

        var userId = context.GetUserId();
        var income = await incomeRepository.UpdateAsync(userId, id, request);

        return income is null
            ? Results.NotFound(new { error = "Income not found" })
            : Results.Ok(income);
    }

    public static async Task<IResult> Delete(HttpContext context, Guid id, IIncomeRepository incomeRepository)
    {
        var userId = context.GetUserId();
        var deleted = await incomeRepository.DeleteAsync(userId, id);

        return deleted
            ? Results.NoContent()
            : Results.NotFound(new { error = "Income not found" });
    }
}
