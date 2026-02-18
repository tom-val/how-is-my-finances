variable "project_name" {
  description = "Project name used for the Supabase project."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, prod)."
  type        = string
}

variable "organization_id" {
  description = "Supabase organisation ID."
  type        = string
}

variable "database_password" {
  description = "Password for the Supabase database."
  type        = string
  sensitive   = true
}

variable "region" {
  description = "Supabase project region (e.g. eu-central-1)."
  type        = string
}

variable "site_url" {
  description = "Frontend URL used as the default redirect after authentication (e.g. sign-up confirmation)."
  type        = string
}

variable "pooler_host" {
  description = "Supabase Supavisor connection pooler hostname (from Dashboard → Database → Connection String)."
  type        = string
}
