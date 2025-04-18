output "api_url" {
  value = aws_apigatewayv2_api.mindmuse_api.api_endpoint
}

output "s3_bucket_name" {
  value = aws_s3_bucket.pdf_bucket.bucket
}

output "frontend_url" {
  value = "http://${aws_elastic_beanstalk_environment.frontend_env.endpoint_url}"
}