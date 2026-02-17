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

variable "supabase_jwt_secret" {
  description = "Supabase JWT secret for token validation (not available via Terraform provider)."
  type        = string
  sensitive   = true
}
