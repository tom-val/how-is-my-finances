variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, prod)."
  type        = string
}

variable "deployment_package_path" {
  description = "Path to the Lambda deployment zip file."
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL."
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key."
  type        = string
  sensitive   = true
}

variable "supabase_db_connection_string" {
  description = "PostgreSQL connection string for Supabase database."
  type        = string
  sensitive   = true
}

variable "api_gateway_execution_arn" {
  description = "Execution ARN of the API Gateway to allow invocation."
  type        = string
}

variable "cors_allowed_origins" {
  description = "Comma-separated list of allowed CORS origins for the .NET middleware."
  type        = string
  default     = ""
}
