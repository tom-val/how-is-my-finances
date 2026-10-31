using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IAiJobRepository
{
    /// <summary>Creates a pending job; <paramref name="requestBody"/> is stored as camelCase JSON.</summary>
    Task<Guid> CreateAsync(Guid userId, string jobType, object requestBody);

    Task<AiJobStatus?> GetStatusAsync(Guid userId, Guid jobId);

    Task MarkFailedAsync(Guid userId, Guid jobId, string error);
}

/// <summary>Creates an AI job row and queues it for the AI processor.</summary>
public interface IAiJobDispatcher
{
    /// <summary>
    /// Returns the job id, or null when the job could not be queued (it is then marked failed).
    /// When no queue URL is configured (local dev) the job is created but not sent.
    /// </summary>
    Task<Guid?> DispatchAsync(Guid userId, string jobType, object requestBody);
}
