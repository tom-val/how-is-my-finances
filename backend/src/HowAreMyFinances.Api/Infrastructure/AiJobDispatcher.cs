using System.Text.Json;
using Amazon.SQS;
using Amazon.SQS.Model;
using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using Microsoft.Extensions.Options;

namespace HowAreMyFinances.Api.Infrastructure;

/// <summary>
/// Creates an ai_jobs row and sends <c>{ "jobId": "...", "type": "..." }</c> to the AI processor queue.
/// </summary>
public sealed class AiJobDispatcher : IAiJobDispatcher
{
    private readonly IAiJobRepository _aiJobRepository;
    private readonly IServiceProvider _serviceProvider;
    private readonly SqsSettings _settings;
    private readonly ILogger<AiJobDispatcher> _logger;

    public AiJobDispatcher(
        IAiJobRepository aiJobRepository,
        IServiceProvider serviceProvider,
        IOptions<SqsSettings> settings,
        ILogger<AiJobDispatcher> logger)
    {
        _aiJobRepository = aiJobRepository;
        _serviceProvider = serviceProvider;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<Guid?> DispatchAsync(Guid userId, string jobType, object requestBody)
    {
        var jobId = await _aiJobRepository.CreateAsync(userId, jobType, requestBody);

        if (string.IsNullOrWhiteSpace(_settings.AiJobsQueueUrl))
        {
            _logger.LogInformation("[AiJobs] No queue URL configured; job {JobId} ({JobType}) created but not sent", jobId, jobType);
            return jobId;
        }

        try
        {
            // Resolved lazily: the SQS client needs an AWS region, which local dev doesn't have.
            var sqs = _serviceProvider.GetRequiredService<IAmazonSQS>();
            await sqs.SendMessageAsync(new SendMessageRequest
            {
                QueueUrl = _settings.AiJobsQueueUrl,
                MessageBody = JsonSerializer.Serialize(new { jobId, type = jobType })
            });
            return jobId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AiJobs] Failed to queue job {JobId} ({JobType})", jobId, jobType);
            await _aiJobRepository.MarkFailedAsync(userId, jobId, "Could not queue the job");
            return null;
        }
    }
}
