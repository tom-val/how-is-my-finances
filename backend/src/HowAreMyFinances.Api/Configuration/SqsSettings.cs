namespace HowAreMyFinances.Api.Configuration;

/// <summary>
/// SQS settings for the AI processor queue. When <see cref="AiJobsQueueUrl"/> is empty (local dev),
/// AI jobs are still created but no message is sent.
/// </summary>
public sealed class SqsSettings
{
    public const string SectionName = "Sqs";

    public string AiJobsQueueUrl { get; set; } = string.Empty;
}
