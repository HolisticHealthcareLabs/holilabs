package vidabanq.residency

# Data residency policy enforcement
# Ensures data is stored and accessed only in allowed regions

import future.keywords.if
import future.keywords.in

default allow := false

# Allow if residency requirements are met
allow if {
    bucket_matches_residency
    org_country_matches
}

# Check if S3 bucket/region matches configured residency
bucket_matches_residency if {
    bucket := input.request.bucket
    required_region := data.config.residency.region
    required_prefix := data.config.residency.bucket_prefix

    startswith(bucket, required_prefix)
}

# Check if organization's country matches residency policy
org_country_matches if {
    org_country := input.org.country_code
    allowed_countries := data.config.residency.allowed_countries

    org_country in allowed_countries
}

# Brazil-specific rule
org_country_matches if {
    org_country := input.org.country_code
    residency_region := data.config.residency.region

    org_country == "BR"
    residency_region == "sa-east-1"
}

# Mexico-specific rule
org_country_matches if {
    org_country := input.org.country_code
    residency_region := data.config.residency.region

    org_country == "MX"
    residency_region == "us-south-1"
}

# Argentina-specific rule
org_country_matches if {
    org_country := input.org.country_code
    residency_region := data.config.residency.region

    org_country == "AR"
    residency_region == "sa-east-1"
}

# Deny messages
deny[msg] {
    not bucket_matches_residency
    msg := sprintf("Bucket '%s' does not match required residency prefix '%s'", [input.request.bucket, data.config.residency.bucket_prefix])
}

deny[msg] {
    not org_country_matches
    msg := sprintf("Organization country '%s' does not match residency requirements", [input.org.country_code])
}
