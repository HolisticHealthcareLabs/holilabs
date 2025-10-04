package vidabanq.export_dp

# Differential privacy export policy
# Enforces epsilon budget limits, consent requirements, and cooldown periods

import future.keywords.if
import future.keywords.in

default allow := false

# Allow if all DP export requirements are met
allow if {
    not epsilon_budget_exhausted
    consent_allows_research
    not within_cooldown
}

# Check if subject's epsilon budget is exhausted
epsilon_budget_exhausted if {
    subject_id := input.subject_id
    requested_epsilon := input.request.epsilon

    budget := data.dp_budgets[subject_id]
    used := budget.used_epsilon
    total := budget.total_epsilon

    used + requested_epsilon > total
}

# Check if consent allows research purpose
consent_allows_research if {
    patient_token_id := input.patient_token_id
    consent := data.consents[patient_token_id]

    "RESEARCH" in consent.purposes
    consent.state == "ACTIVE"
}

# Check if export is within cooldown period
within_cooldown if {
    subject_id := input.subject_id
    budget := data.dp_budgets[subject_id]

    cooldown_until := time.parse_rfc3339_ns(budget.cooldown_until)
    now := time.now_ns()

    now < cooldown_until
}

# Deny messages
deny[msg] {
    epsilon_budget_exhausted
    subject_id := input.subject_id
    budget := data.dp_budgets[subject_id]
    msg := sprintf("Epsilon budget exhausted for subject '%s'. Used: %.2f, Total: %.2f", [subject_id, budget.used_epsilon, budget.total_epsilon])
}

deny[msg] {
    not consent_allows_research
    msg := "Patient consent does not allow RESEARCH purpose or is not ACTIVE"
}

deny[msg] {
    within_cooldown
    subject_id := input.subject_id
    budget := data.dp_budgets[subject_id]
    msg := sprintf("Export cooldown active until %s", [budget.cooldown_until])
}
