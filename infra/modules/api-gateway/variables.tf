variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, prod)."
  type        = string
}

variable "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function to integrate with."
  type        = string
}

variable "cors_allow_origins" {
  description = "List of allowed CORS origins."
  type        = list(string)
}
