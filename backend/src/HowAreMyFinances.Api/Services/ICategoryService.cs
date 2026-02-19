using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<Category>> GetAllAsync(Guid userId);
}
