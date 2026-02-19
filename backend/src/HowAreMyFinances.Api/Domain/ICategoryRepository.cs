using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> GetAllAsync(Guid userId);
    Task<Category> CreateAsync(Guid userId, CreateCategoryRequest request);
    Task<Category?> UpdateAsync(Guid userId, Guid categoryId, UpdateCategoryRequest request);
    Task<bool> DeleteAsync(Guid userId, Guid categoryId);
}
