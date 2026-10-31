variable "supabase_access_token" {
  description = "Supabase management API access token."
  type        = string
  sensitive   = true
}

variable "supabase_organization_id" {
  description = "Supabase organisation ID."
  type        = string
}

variable "supabase_database_password" {
  description = "Password for the Supabase database."
  type        = string
  sensitive   = true
}

variable "enable_banking_application_id" {
  description = "Enable Banking application id. Empty leaves the bank integration unconfigured."
  type        = string
  default     = ""
}

variable "enable_banking_private_key_b64" {
  description = "Base64 of the Enable Banking RSA-2048 private key PEM (single line)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API key for the AI processor Lambda."
  type        = string
  sensitive   = true
  default     = ""
}
