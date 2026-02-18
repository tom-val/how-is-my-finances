output "authorizer_id" {
  description = "ID of the API Gateway Lambda authorizer."
  value       = aws_apigatewayv2_authorizer.jwt.id
}

output "function_name" {
  description = "Name of the authorizer Lambda function."
  value       = aws_lambda_function.authorizer.function_name
}
