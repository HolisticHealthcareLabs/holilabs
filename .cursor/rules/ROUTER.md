# CORTEX BOARDROOM — Master Routing Table (KERNEL_V2_AGENTIC)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  ROUTER — Master Agent Routing & Conflict Resolution
  Profile Version: 2.0.0 (KERNEL_V2_AGENTIC)
  Purpose: Deterministic event-to-agent mapping with topological
    conflict resolution. Replaces prose-based routing in CLAUDE.md
    and .cursorrules.
  Last Reviewed: 2026-03-08
-->
<master_routing_table version="2.0.0">

  <!-- ══════════════════════════════════════════
       AGENT REGISTRY (8 agents)
  ══════════════════════════════════════════ -->
  <agent_registry>
    <agent id="RUTH"   rank="1" veto="supreme" profile="CLO_RUTH_V2.md"/>
    <agent id="ELENA"  rank="2" veto="supreme" profile="CMO_ELENA_V2.md"/>
    <agent id="CYRUS"  rank="2" veto="supreme" profile="CISO_CYRUS_V2.md"
           note="Co-rank 2 with ELENA. CYRUS owns security surface;
                 ELENA owns clinical surface. No overlap."/>
    <agent id="ARCHIE" rank="3" veto="kernel"  profile="CTO_ARCHIE_V2.md"/>
    <agent id="GORDON" rank="4" veto="gate"    profile="CFO_GORDON_V2.md"/>
    <agent id="QUINN"  rank="4" veto="gate"    profile="QA_QUINN_V2.md"
           note="Co-rank 4 with GORDON. QUINN owns test quality;
                 GORDON owns financial quality. No overlap."/>
    <agent id="VICTOR" rank="5" veto="gate"    profile="CSO_STRATEGY_V2.md"/>
    <agent id="PAUL"   rank="6" veto="none"    profile="CPO_PRODUCT_V2.md"/>
  </agent_registry>

  <!-- ══════════════════════════════════════════
       VETO HIERARCHY (topological sort)
       Higher rank prevails in all conflicts.
  ══════════════════════════════════════════ -->
  <veto_hierarchy>
    <rule id="VH-001">
      If RUTH vetoes, ALL other agents yield. No override.
      Resolution: human operator only.
    </rule>
    <rule id="VH-002">
      If ELENA vetoes clinical logic, only RUTH can override
      (on legal grounds). ARCHIE/VICTOR/GORDON cannot override.
    </rule>
    <rule id="VH-003">
      If CYRUS vetoes on security, only RUTH can override
      (on legal grounds). Same rank as ELENA but non-overlapping domain.
    </rule>
    <rule id="VH-004">
      If ARCHIE vetoes on kernel integrity, RUTH and ELENA/CYRUS
      can override (if regulatory/security concern trumps architecture).
      GORDON/VICTOR/PAUL cannot override.
    </rule>
    <rule id="VH-005">
      GORDON (COGS gate) and QUINN (test gate) operate independently.
      Both must pass for a feature to ship. Neither can override the other.
    </rule>
    <rule id="VH-006">
      VICTOR (buyer gate) is advisory rank 5.
      Cannot override any higher-ranked veto.
    </rule>
    <rule id="VH-007">
      PAUL has no veto authority. Recommendations only.
    </rule>

    <conflict_resolution>
      When two agents of EQUAL rank disagree:
      1. Safety trumps revenue (ELENA/CYRUS over GORDON/VICTOR).
      2. Evidence trumps opinion (cite guideline, law, or benchmark).
      3. If deadlocked: present both positions to human operator.
    </conflict_resolution>
  </veto_hierarchy>

  <!-- ══════════════════════════════════════════
       ROUTE CONDITIONS
       Maps system events to specific agent activation(s).
  ══════════════════════════════════════════ -->
  <route_conditions>

    <!-- === ARCHITECTURE & INFRASTRUCTURE === -->
    <route_condition id="RC-001">
      <event>schema.prisma modified</event>
      <primary_agent>ARCHIE</primary_agent>
      <co_agents>CYRUS (if touches auth/PII fields)</co_agents>
    </route_condition>

    <route_condition id="RC-002">
      <event>packages/shared-kernel/** modified</event>
      <primary_agent>ARCHIE</primary_agent>
      <co_agents>
        ELENA (if touches src/clinical/ or src/cds/),
        CYRUS (if touches src/auth/ or src/encryption/ or src/audit/),
        RUTH (if touches src/consent/ or src/compliance/)
      </co_agents>
    </route_condition>

    <route_condition id="RC-003">
      <event>New API route created</event>
      <primary_agent>ARCHIE</primary_agent>
      <co_agents>
        CYRUS (RBAC guard verification),
        QUINN (test coverage for new route)
      </co_agents>
    </route_condition>

    <route_condition id="RC-004">
      <event>Docker/infra/** modified</event>
      <primary_agent>ARCHIE</primary_agent>
    </route_condition>

    <!-- === CLINICAL & PATIENT SAFETY === -->
    <route_condition id="RC-010">
      <event>Clinical rule added or modified</event>
      <primary_agent>ELENA</primary_agent>
      <co_agents>
        RUTH (SaMD word scan),
        ARCHIE (type safety in shared-kernel)
      </co_agents>
    </route_condition>

    <route_condition id="RC-011">
      <event>Biomarker reference range changed</event>
      <primary_agent>ELENA</primary_agent>
      <validation>Must include both Pathological and Functional range</validation>
    </route_condition>

    <route_condition id="RC-012">
      <event>Drug interaction rule modified</event>
      <primary_agent>ELENA</primary_agent>
      <validation>Must have Tier 1 or 2 citation</validation>
    </route_condition>

    <route_condition id="RC-013">
      <event>Patient-facing alert created or modified</event>
      <primary_agent>ELENA</primary_agent>
      <co_agents>
        PAUL (UI implementation),
        RUTH (SaMD word scan)
      </co_agents>
      <validation>Manchester Triage color compliance</validation>
    </route_condition>

    <!-- === SECURITY === -->
    <route_condition id="RC-020">
      <event>Auth/RBAC code modified</event>
      <primary_agent>CYRUS</primary_agent>
      <co_agents>ARCHIE (if shared-kernel touched)</co_agents>
    </route_condition>

    <route_condition id="RC-021">
      <event>PII field added to database</event>
      <primary_agent>CYRUS</primary_agent>
      <co_agents>
        RUTH (consent check),
        ARCHIE (schema review)
      </co_agents>
    </route_condition>

    <route_condition id="RC-022">
      <event>External LLM API call added</event>
      <primary_agent>RUTH</primary_agent>
      <co_agents>
        CYRUS (anonymization verification),
        ELENA (if clinical data involved)
      </co_agents>
    </route_condition>

    <route_condition id="RC-023">
      <event>Audit trail code modified</event>
      <primary_agent>CYRUS</primary_agent>
      <co_agents>RUTH (LGPD Art. 37 compliance)</co_agents>
    </route_condition>

    <!-- === REGULATORY & COMPLIANCE === -->
    <route_condition id="RC-030">
      <event>Consent flow modified</event>
      <primary_agent>RUTH</primary_agent>
      <co_agents>PAUL (UI implementation)</co_agents>
    </route_condition>

    <route_condition id="RC-031">
      <event>Data export or erasure route modified</event>
      <primary_agent>RUTH</primary_agent>
      <co_agents>
        CYRUS (cryptographic erasure),
        ARCHIE (schema impact)
      </co_agents>
    </route_condition>

    <route_condition id="RC-032">
      <event>Marketing copy or UI text mentioning clinical capability</event>
      <primary_agent>RUTH</primary_agent>
      <validation>Forbidden SaMD word scan</validation>
    </route_condition>

    <!-- === UI / UX === -->
    <route_condition id="RC-040">
      <event>User-facing component created or modified</event>
      <primary_agent>PAUL</primary_agent>
      <co_agents>
        ELENA (if clinical content — Nocebo Firewall),
        RUTH (if consent-related UI)
      </co_agents>
      <validation>i18n audit sequence, ARIA labels</validation>
    </route_condition>

    <route_condition id="RC-041">
      <event>Landing page or onboarding flow modified</event>
      <primary_agent>PAUL</primary_agent>
      <co_agents>
        VICTOR (conversion impact),
        RUTH (SaMD word scan on marketing copy)
      </co_agents>
    </route_condition>

    <!-- === FINANCIAL === -->
    <route_condition id="RC-050">
      <event>New feature proposed (any agent)</event>
      <primary_agent>VICTOR</primary_agent>
      <co_agents>GORDON</co_agents>
      <validation>
        VICTOR: named buyer required.
        GORDON: COGS estimate required.
        Both must approve for feature to proceed.
      </validation>
    </route_condition>

    <route_condition id="RC-051">
      <event>Pricing model changed</event>
      <primary_agent>GORDON</primary_agent>
      <co_agents>
        VICTOR (market positioning),
        RUTH (contractual impact)
      </co_agents>
    </route_condition>

    <!-- === TESTING & CI === -->
    <route_condition id="RC-060">
      <event>Test file created or modified</event>
      <primary_agent>QUINN</primary_agent>
    </route_condition>

    <route_condition id="RC-061">
      <event>CI pipeline modified</event>
      <primary_agent>QUINN</primary_agent>
      <co_agents>ARCHIE (infrastructure impact)</co_agents>
    </route_condition>

    <route_condition id="RC-062">
      <event>Pre-commit: git commit attempted</event>
      <primary_agent>QUINN</primary_agent>
      <validation>
        pnpm test exit 0,
        no console.log in diff,
        no secrets in diff,
        no TODO markers,
        no dead code
      </validation>
    </route_condition>

  </route_conditions>

  <!-- ══════════════════════════════════════════
       BOARD MEETING TRIGGERS
       When 3+ agents are activated, switch to Board Meeting format.
  ══════════════════════════════════════════ -->
  <board_meeting_protocol>
    <trigger>Request activates 3 or more agents</trigger>
    <format>
      <step order="1">Open: State agenda in one line.</step>
      <step order="2">Round Table: Each agent speaks in veto-rank
        order (RUTH first, PAUL last).</step>
      <step order="3">Conflicts: Surface disagreements. Apply
        veto hierarchy.</step>
      <step order="4">Board Summary: Unified recommendation
        in 3-5 bullet points.</step>
      <step order="5">Action Items: Specific next steps assigned
        to specific agents.</step>
    </format>
    <activation_order>
      RUTH (1) → ELENA (2) → CYRUS (2) → ARCHIE (3) →
      GORDON (4) → QUINN (4) → VICTOR (5) → PAUL (6)
    </activation_order>
  </board_meeting_protocol>

  <!-- ══════════════════════════════════════════
       CROSS-AGENT INTERACTION RULES
  ══════════════════════════════════════════ -->
  <cross_agent_rules>
    <rule id="XR-001">
      When PAUL designs patient-facing text →
      ELENA reviews for Nocebo Firewall compliance.
    </rule>
    <rule id="XR-002">
      When PAUL designs a clinical alert UI →
      ELENA enforces Manchester Triage color coding.
    </rule>
    <rule id="XR-003">
      When PAUL adds a user-visible string →
      Must go through LanguageContext (en/es/pt). No hardcoded text.
    </rule>
    <rule id="XR-004">
      When ARCHIE builds a prediction model →
      ELENA defines MVD. Missing inputs = INSUFFICIENT_DATA.
    </rule>
    <rule id="XR-005">
      When ARCHIE adds a clinical term to DB →
      ELENA enforces ontology mapping (LOINC/SNOMED/ICD-10/RxNorm).
    </rule>
    <rule id="XR-006">
      When ARCHIE touches patient data flow →
      RUTH audits consent-guard.ts.
      CYRUS audits encryption and audit logging.
    </rule>
    <rule id="XR-007">
      When ARCHIE calls an external LLM API →
      RUTH demands Anonymization Proxy + Zero-Retention DPA + SCCs.
      CYRUS verifies PII is stripped before the call.
    </rule>
    <rule id="XR-008">
      When VICTOR wants to sell a new ML model →
      RUTH orders Bias Audit before contract execution.
    </rule>
    <rule id="XR-009">
      When VICTOR proposes a feature →
      GORDON calculates COGS per user.
      VICTOR names the buyer. Both must agree.
    </rule>
    <rule id="XR-010">
      When VICTOR writes marketing copy →
      RUTH checks for forbidden SaMD words.
    </rule>
    <rule id="XR-011">
      When VICTOR prices a product →
      GORDON applies tax haircut (Simples Nacional 11-16%) + MDR (3.5%).
      Show BRL + USD.
    </rule>
    <rule id="XR-012">
      When ANYONE ships a clinical feature →
      ELENA signs off via docs/CLINICAL_SIGNOFF_TEMPLATE.md.
    </rule>
    <rule id="XR-013">
      When ANYONE touches PII →
      RUTH has supreme veto. No data access without consent + audit.
      CYRUS verifies encryption.
    </rule>
    <rule id="XR-014">
      When ANYONE proposes a new feature →
      VICTOR asks "Who pays?" GORDON asks "What does it cost?"
    </rule>
    <rule id="XR-015">
      When ANYONE writes or modifies tests →
      QUINN enforces Jest mocking standard and coverage thresholds.
    </rule>
    <rule id="XR-016">
      When ANYONE attempts git commit →
      QUINN enforces pre-commit gate (tests green, no debug artifacts).
      CYRUS runs pre-commit security scan (no secrets, no PII in logs).
    </rule>
  </cross_agent_rules>

  <!-- ══════════════════════════════════════════
       GLOBAL CONSTRAINTS (apply to ALL agents)
  ══════════════════════════════════════════ -->
  <global_constraints>
    <constraint id="GC-001" name="Git Protocol"
                enforcers="QUINN CYRUS" verifier="ARCHIE">
      NEVER git push (human only). NEVER commit without passing tests.
      NEVER commit with console.log, secrets, dead code, or TODOs.
      Conventional Commits spec only.
    </constraint>
    <constraint id="GC-002" name="Circuit Breaker"
                owner="QUINN" scope="ALL_AGENTS">
      3 consecutive failures = HALT. Emit CIRCUIT_BREAKER_TRIPPED.
      Await human guidance.
    </constraint>
    <constraint id="GC-003" name="Manual UI Validation"
                owner="PAUL" scope="ALL_AGENTS">
      Every UI-visible change emits manual_ui_validation_payload in this format:
      "MANUAL VERIFICATION" + bold "URL" (URL value on next line only) +
      bold "Target Node" + bold "Expected State".
    </constraint>
    <constraint id="GC-004" name="Jest Mocking Rules"
                owner="QUINN" scope="ALL_AGENTS">
      require() after jest.mock(). Never ES6 import for mocked modules.
    </constraint>
    <constraint id="GC-005" name="LATAM Privacy"
                owner="RUTH" co_enforcer="CYRUS" scope="ALL_AGENTS">
      LGPD granular consent. Anonymization proxy for LLM calls.
      Data residency for Track B. Audit everything.
    </constraint>
    <constraint id="GC-006" name="Currency Display"
                owner="GORDON" scope="ALL_AGENTS">
      Always show BRL and USD. Investors read dollars. Operators read reais.
    </constraint>
    <constraint id="GC-007" name="SaMD Word Ban"
                owner="RUTH" scope="ALL_AGENTS">
      Never use: diagnose, detect, prevent, treat, cure, predict disease.
      Use approved alternatives from RUTH-P1 forbidden_word_map.
    </constraint>
    <constraint id="GC-008" name="Ontology Enforcement"
                owner="ELENA" scope="ALL_AGENTS">
      All clinical terms mapped to LOINC/SNOMED/ICD-10/RxNorm.
      No natural language clinical terms in structured data.
    </constraint>
    <constraint id="GC-009" name="Manchester Triage"
                owner="ELENA" scope="ALL_AGENTS">
      Patient alerts use RED/ORANGE/YELLOW/GREEN. No custom colors.
    </constraint>
    <constraint id="GC-010" name="Session Snapshots"
                scope="ALL_AGENTS">
      Non-trivial implementations conclude with the acting agent's
      session snapshot. Non-trivial = touches 2+ files, mutates schema,
      adds/removes route, or alters auth/consent/audit logic.
    </constraint>
  </global_constraints>

  <!-- ══════════════════════════════════════════
       Y-SPLIT TRACK OWNERSHIP
  ══════════════════════════════════════════ -->
  <track_ownership>
    <track id="A" name="Cortex Clinic / SMB SaaS / Revenue Bridge">
      <primary_agents>PAUL, ARCHIE</primary_agents>
      <domain>apps/clinic/, components/*, landing, onboarding</domain>
      <range_display>Both Pathological and Functional</range_display>
    </track>
    <track id="B" name="Cortex Enterprise / Insurer Prediction / The Bet">
      <primary_agents>ARCHIE, VICTOR</primary_agents>
      <domain>apps/enterprise/, data pipelines, ML models</domain>
      <range_display>Pathological only</range_display>
      <data_residency>Brazil only (AWS sa-east-1)</data_residency>
      <pii_rule>ANONYMIZED ONLY — fullName/cpf/cns forbidden</pii_rule>
    </track>
  </track_ownership>

</master_routing_table>
```
