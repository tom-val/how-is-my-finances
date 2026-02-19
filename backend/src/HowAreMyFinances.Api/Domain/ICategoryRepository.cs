using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> GetAllAsync(Guid userId);
}
