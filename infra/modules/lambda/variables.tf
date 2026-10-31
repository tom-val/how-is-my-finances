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

variable "enable_banking_application_id" {
  description = "Enable Banking application id (JWT kid). Empty disables the bank endpoints (503)."
  type        = string
  default     = ""
}

variable "enable_banking_private_key_b64" {
  description = "Base64 of the Enable Banking application's RSA-2048 private key PEM (single line)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_banking_redirect_url" {
  description = "Redirect URL registered with Enable Banking for the bank authorisation callback."
  type        = string
  default     = "https://finances.valiunas.dev/bank/callback"
}

variable "sqs_ai_jobs_queue_url" {
  description = "URL of the AI jobs SQS queue. Empty means jobs are created but not queued."
  type        = string
  default     = ""
}
