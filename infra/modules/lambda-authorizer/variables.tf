variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, prod)."
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL for JWKS endpoint."
  type        = string
  sensitive   = true
}

variable "api_id" {
  description = "ID of the API Gateway HTTP API."
  type        = string
}

variable "api_execution_arn" {
  description = "Execution ARN of the API Gateway (for Lambda permissions)."
  type        = string
}

variable "lambda_integration_id" {
  description = "ID of the existing Lambda integration (for the public health route)."
  type        = string
}

variable "deployment_package_path" {
  description = "Path to the authorizer Lambda deployment zip file."
  type        = string
}
