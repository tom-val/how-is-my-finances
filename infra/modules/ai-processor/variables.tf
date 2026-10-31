variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, prod)."
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key used by the processor."
  type        = string
  sensitive   = true
}

variable "db_connection_string" {
  description = "Npgsql-format PostgreSQL connection string (parsed by the processor)."
  type        = string
  sensitive   = true
}

variable "api_lambda_role_name" {
  description = "Name of the API Lambda's IAM role, granted sqs:SendMessage on the queue."
  type        = string
}
