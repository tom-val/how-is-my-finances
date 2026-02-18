locals {
  project_name = "how-is-my-finances"
  environment  = "dev"
}

# --- Supabase ---

module "supabase" {
  source = "../../modules/supabase"

  project_name      = local.project_name
  environment       = local.environment
  organization_id   = var.supabase_organization_id
  database_password = var.supabase_database_password
  region            = "eu-central-1"
  site_url          = "https://${module.cloudfront.distribution_domain_name}"
}

# --- S3 Frontend (bucket created first, no CloudFront dependency) ---

module "s3_frontend" {
  source = "../../modules/s3-frontend"

  project_name = local.project_name
  environment  = local.environment
}

# --- CloudFront (references S3 bucket) ---

module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name                   = local.project_name
  environment                    = local.environment
  s3_bucket_regional_domain_name = module.s3_frontend.bucket_regional_domain_name
}

# --- S3 bucket policy (ties S3 and CloudFront together, breaks circular dep) ---

resource "aws_s3_bucket_policy" "frontend" {
  bucket = module.s3_frontend.bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${module.s3_frontend.bucket_arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = module.cloudfront.distribution_arn
        }
      }
    }]
  })
}

# --- API Gateway ---

module "api_gateway" {
  source = "../../modules/api-gateway"

  project_name       = local.project_name
  environment        = local.environment
  lambda_invoke_arn  = module.lambda.invoke_arn
  cors_allow_origins = ["https://${module.cloudfront.distribution_domain_name}"]
}

# --- Lambda ---

module "lambda" {
  source = "../../modules/lambda"

  project_name                  = local.project_name
  environment                   = local.environment
  deployment_package_path       = "${path.module}/dummy.zip"
  supabase_url                  = module.supabase.project_url
  supabase_service_key          = module.supabase.service_role_key
  supabase_db_connection_string = module.supabase.db_connection_string
  api_gateway_execution_arn     = module.api_gateway.execution_arn
}
