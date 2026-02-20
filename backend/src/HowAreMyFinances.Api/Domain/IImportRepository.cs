using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IImportRepository
{
    Task<ImportResult> ImportAsync(Guid userId, ImportRequest request);
}
