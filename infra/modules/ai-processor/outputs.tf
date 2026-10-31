output "queue_url" {
  description = "URL of the AI jobs SQS queue (the API publishes { jobId, type } here)."
  value       = aws_sqs_queue.ai_jobs.url
}

output "function_name" {
  description = "AI processor Lambda function name (used for deployment in CI/CD)."
  value       = aws_lambda_function.processor.function_name
}
