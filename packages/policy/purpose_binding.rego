package holilabs.purpose_binding

# Purpose-binding policy enforcement
# Ensures requests match consent purpose and user role has appropriate scope

import future.keywords.if
import future.keywords.in

default allow := false

# Allow if all conditions are met
allow if {
    purpose_matches_consent
    role_has_scope
    not is_revoked
}

# Check if request purpose matches patient consent
purpose_matches_consent if {
    request_purpose := input.request.headers["x-purpose"]
    consent_purposes := data.consents[input.patient_token_id].purposes
    request_purpose in consent_purposes
}

# Check if user role has required scope for the purpose
role_has_scope if {
    purpose := input.request.headers["x-purpose"]
    role := input.user.role

    # CLINICIAN can access CARE
    purpose == "care"
    role == "CLINICIAN"
}

role_has_scope if {
    purpose := input.request.headers["x-purpose"]
    role := input.user.role

    # RESEARCHER can access RESEARCH
    purpose == "research"
    role == "RESEARCHER"
}

role_has_scope if {
    purpose := input.request.headers["x-purpose"]
    role := input.user.role

    # ADMIN can access any purpose
    role == "ADMIN"
}

# Check if consent has been revoked
is_revoked if {
    consent := data.consents[input.patient_token_id]
    consent.state == "REVOKED"
}

is_revoked if {
    consent := data.consents[input.patient_token_id]
    consent.state == "EXPIRED"
}

# Deny message for debugging
deny[msg] {
    not purpose_matches_consent
    msg := "Request purpose does not match patient consent"
}

deny[msg] {
    not role_has_scope
    msg := sprintf("User role '%s' does not have scope for purpose '%s'", [input.user.role, input.request.headers["x-purpose"]])
}

deny[msg] {
    is_revoked
    msg := "Patient consent has been revoked or expired"
}
