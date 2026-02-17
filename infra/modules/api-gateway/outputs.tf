output "api_endpoint" {
  description = "Base URL of the HTTP API."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "execution_arn" {
  description = "Execution ARN of the API Gateway (used for Lambda permissions)."
  value       = aws_apigatewayv2_api.api.execution_arn
}

output "api_id" {
  description = "ID of the HTTP API."
  value       = aws_apigatewayv2_api.api.id
}
