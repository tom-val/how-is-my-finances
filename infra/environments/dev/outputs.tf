output "api_endpoint" {
  description = "Base URL of the API Gateway."
  value       = module.api_gateway.api_endpoint
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name."
  value       = module.cloudfront.distribution_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidation in CI/CD)."
  value       = module.cloudfront.distribution_id
}

output "lambda_function_name" {
  description = "Lambda function name (used for deployment in CI/CD)."
  value       = module.lambda.function_name
}

output "s3_frontend_bucket" {
  description = "S3 bucket name for frontend assets."
  value       = module.s3_frontend.bucket_id
}

output "supabase_url" {
  description = "Supabase project URL (used for frontend build)."
  value       = module.supabase.project_url
}

output "supabase_anon_key" {
  description = "Supabase anonymous key (used for frontend build)."
  value       = module.supabase.anon_key
}

output "supabase_project_ref" {
  description = "Supabase project reference ID (used for CLI linking)."
  value       = module.supabase.project_ref
}

output "authorizer_function_name" {
  description = "Authorizer Lambda function name (used for deployment in CI/CD)."
  value       = module.lambda_authorizer.function_name
}
