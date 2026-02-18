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

output "lambda_integration_id" {
  description = "ID of the Lambda integration (used by authorizer module for public routes)."
  value       = aws_apigatewayv2_integration.lambda.id
}
