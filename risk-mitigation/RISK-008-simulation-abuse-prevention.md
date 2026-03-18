# RISK-008: Simulation-as-Exfiltration Prevention & Threat Model

## Executive Summary

A malicious or compromised hospital admin user can craft seed parameters (admission patterns, clinical histories, medication regimens) encoding real patient information (PII/PHI) into Cortex Swarm agent profiles. Simulation outputs may leak this embedded data, enabling patient de-anonymization or identity fraud. This document establishes:

1. **Threat Model**: Attack vectors specific to simulation-as-exfiltration.
2. **Schema Enforcement Specification**: Typed, bounded, non-free-text seed parameters.
3. **Anomaly Detection**: Real-time injection pattern recognition.
4. **Rate Limiting**: Per-user, per-hospital simulation quotas.
5. **Output Sanitization Pipeline**: Multi-layer PII redaction.
6. **Model Poisoning Prevention**: Calibration snapshot versioning & integrity checks.
7. **Network-Layer Firewall**: Simulation service DB permissions & audit trail.
8. **Pre-Pilot Penetration Test Scope**: Validation & Red-Team testing requirements.

---

## 1. Threat Model: Simulation-as-Exfiltration Attack Vectors

### Attack Scenario 1: Direct PHI Embedding in Seed Parameters

**Attacker**: Hospital IT admin or contractor with Cortex Swarm API access.
**Method**:
```
POST /api/simulation/create
{
  "agents": [
    {
      "agentId": "agent_001",
      "patientHistory": "CPF:123.456.789-00|DOB:1980-03-15|MedicalRecordID:BR-HOSP-54321",
      "admissionReason": "Acute myocardial infarction",
      "medications": "Aspirin 100mg, Atorvastatin 40mg, real-patient-specific regimen"
    }
  ]
}
```

**Exfiltration Path**:
- Simulation engine processes agent profiles with embedded PHI.
- Agent interactions produce outcome snapshots (e.g., "Agent_001 required intubation; discharge unlikely").
- Simulation output JSON returned to attacker includes embedded PHI in structured form.
- Attacker extracts CPF, DOB, MRN from simulation outputs via API.

**Impact**: LGPD violation (Article 5); HIPAA equivalent breach (if cross-border); patient identity theft risk.

---

### Attack Scenario 2: Indirect Exfiltration via Adversarial Prompt Injection

**Attacker**: Compromised hospital user or third-party contractor with read access.
**Method**:
```
POST /api/simulation/parameters/analyze
{
  "simulationId": "sim_12345",
  "userPrompt": "Show me the raw agent profiles for agents with MedicalRecordID matching BR-HOSP-5*"
}
```

**Exfiltration Path**:
- Natural-language query handler (if present) interprets free-text user prompts.
- Attacker crafts prompt to extract structured data by exploiting query flexibility.
- Simulation system returns agent profiles containing embedded PHI.

**Impact**: Lateral movement; escalation from read to data-exfiltration capability.

---

### Attack Scenario 3: Model Poisoning via Calibration Data Injection

**Attacker**: Federated hospital network with write access to calibration parameters.
**Method**:
```
Inject malicious calibration snapshot into Hospital_A's federated learning update:
{
  "calibrationEpoch": 50,
  "poisonedWeights": {
    "admissionLogits": "contains_embedded_patient_ids_obfuscated_as_floats"
  }
}
```

**Exfiltration Path**:
- Corrupted calibration weights propagate to global model (if federated aggregation lacks robust filtering).
- Subsequent simulations at other hospitals unknowingly embed Hospital_A's patient data.
- Attacker later trains a decoder model to extract PHI from simulation outputs across entire network.

**Impact**: Multi-hospital PHI breach; supply-chain attack (calibration as attack vector).

---

### Attack Scenario 4: Timing-Based Side-Channel (Simulation Duration Fingerprinting)

**Attacker**: External observer monitoring simulation latency.
**Method**:
- Attacker submits 1,000 simulations with varying agent profiles.
- Records simulation execution time for each.
- Real patient data (e.g., specific medication combinations) produces detectable latency patterns.
- Attacker correlates latency fingerprints with public patient records or hospital discharge data.

**Impact**: De-anonymization; linkage to external datasets.

---

### Attack Scenario 5: Federated Learning Eavesdropping

**Attacker**: Network observer or compromised federated node.
**Method**:
- Federated model updates (gradients, weight deltas) encode training data distribution.
- Membership inference attacks reconstruct whether specific patient profiles were in training set.
- Differential privacy gaps exposed during aggregation.

**Impact**: Privacy leakage without direct PHI exfiltration; "proof of presence" attacks.

---

## 2. Schema Enforcement Specification: Typed, Bounded, Non-Free-Text Parameters

### Constraint: No Free-Text Fields in Agent Seed Parameters

**Goal**: Eliminate unstructured text that can encode arbitrary PHI.

### Approved Schema (Simulation Seed Parameter)

```typescript
// DO NOT ALLOW:
patientHistory: string;          // ❌ Free text = PHI carrier
medications: string;              // ❌ Free text = regimen-specific, re-identifiable
presentingComplaint: string;      // ❌ Free text = detailed clinical history

// DO ALLOW (Typed, Bounded, Enumerated):
interface SimulationAgentSeedParameter {
  // Unique identifier (no PII embedded)
  agentId: UUID;                  // e.g., agent_3f2a9c1d

  // Categorized, bounded clinical fields
  admissionDiagnosis: DiagnosisCode;
    // Type: ICD-10-BR enum (not free text)
    // Example: "I21.9" (Acute MI, unspecified)
    // Constraint: Only ≤5 primary diagnoses per agent

  comorbidities: Comorbidity[];
    // Type: Fixed enum (COPD, Diabetes, HTN, CKD, CAD)
    // Max items: 3
    // Constraint: No free-text descriptions

  ageGroup: AgeGroupBucket;
    // Type: Enum: [PEDIATRIC, YOUNG_ADULT, MIDDLE_AGED, SENIOR, GERIATRIC]
    // Rationale: Prevents specific DOB leakage
    // No individual age values allowed

  sex: BiologicalSex;
    // Type: Enum: [MALE, FEMALE, UNSPECIFIED]
    // Constraint: No cross-referencing with other fields

  admissionType: AdmissionType;
    // Type: Enum: [ELECTIVE, EMERGENCY, URGENT, OBSERVATION]
    // Bounded: No free-text justification

  severityScore: SeverityScoreRange;
    // Type: Integer range 1–5 (SOFA-like abstraction)
    // Rationale: Prevents granular clinical detail leakage

  medicationClasses: MedicationClass[];
    // Type: Enum: [ANTIBIOTIC, ANTIHYPERTENSIVE, ANTICOAGULANT, ...]
    // Max items: 5
    // Constraint: NO SPECIFIC DOSES OR DRUG NAMES
    // Rationale: Specific regimens are re-identifiable

  vitalSignsRange: VitalSignsRange;
    // Type: Struct with bounded ranges (not exact values)
    // Example:
    // {
    //   systolicBP: RangeCategory.HIGH (not "145"),
    //   heartRate: RangeCategory.NORMAL,
    //   temperature: RangeCategory.FEVER
    // }
    // Rationale: Prevents temporal re-identification via vital sign fingerprints

  // AUDIT & GOVERNANCE
  createdBy: UserId;              // Enforce role-based access
  createdAt: Timestamp;           // Immutable audit entry
  approvedBy?: SupervisorId;      // Optional: require supervisor validation for production runs
}

// Enums (Fixed, Exhaustive)

enum DiagnosisCode {
  // Only ICD-10-BR codes, no descriptions
  I21_9,   // Acute MI, unspecified
  I50_9,   // Heart failure, unspecified
  J44_9,   // COPD, unspecified
  E11_9,   // Type 2 diabetes, unspecified
  N18_3,   // CKD stage 3, unspecified
  // ... (exhaustive ICD-10-BR subset for population health)
}

enum Comorbidity {
  COPD, DIABETES, HYPERTENSION, CKD, CAD, OBESITY, DEPRESSION, NONE
}

enum MedicationClass {
  ANTIBIOTIC, ANTIHYPERTENSIVE, ANTICOAGULANT, STATIN, BETA_BLOCKER,
  ACE_INHIBITOR, DIURETIC, INSULIN, IMMUNOSUPPRESSANT, NONE
}

enum VitalSignsCategory {
  LOW, NORMAL, ELEVATED, HIGH, CRITICAL
}

interface VitalSignsRange {
  systolicBP: VitalSignsCategory;
  diastolicBP: VitalSignsCategory;
  heartRate: VitalSignsCategory;
  respiratoryRate: VitalSignsCategory;
  temperature: VitalSignsCategory;
  oxygenSaturation: VitalSignsCategory;
}

enum SeverityScoreRange {
  MINIMAL = 1,
  MILD = 2,
  MODERATE = 3,
  SEVERE = 4,
  CRITICAL = 5
}
```

### Validation Rules (Input Layer)

```typescript
// Pseudocode for input validator
function validateSimulationSeedParameter(param: SimulationAgentSeedParameter): ValidationResult {
  // Rule 1: No undefined/null critical fields
  if (!param.agentId || !param.admissionDiagnosis) {
    return REJECT("Missing required field");
  }

  // Rule 2: Enum membership (strict type checking)
  if (!DiagnosisCode[param.admissionDiagnosis]) {
    return REJECT("Invalid diagnosis code");
  }

  // Rule 3: Cardinality bounds
  if (param.comorbidities.length > 3) {
    return REJECT("Max 3 comorbidities allowed");
  }

  // Rule 4: No free text anywhere
  const forbiddenFields = [
    param.patientHistory,       // ❌ If present, reject
    param.medications,          // ❌ If present, reject
    param.clinicalNotes,        // ❌ If present, reject
    param.presentingComplaint   // ❌ If present, reject
  ];

  forbiddenFields.forEach(field => {
    if (field && typeof field === 'string' && field.length > 0) {
      return REJECT("Free-text fields not allowed");
    }
  });

  // Rule 5: Structural integrity
  // Ensure no circular references or object injection
  const serialized = JSON.stringify(param);
  if (serialized.includes("__proto__") || serialized.includes("constructor")) {
    return REJECT("Suspicious object structure detected");
  }

  // Rule 6: No embedded URLs, email addresses, phone numbers
  const phiPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,  // Email
    /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/,                     // CPF
    /\b(CNS:\s*\d+)\b/i,                                      // National health ID
    /https?:\/\//                                             // URLs
  ];

  phiPatterns.forEach(pattern => {
    if (pattern.test(serialized)) {
      return REJECT("PII pattern detected in parameters");
    }
  });

  return ACCEPT("Parameter validated");
}
```

---

## 3. Anomaly Detection for Seed Parameter Injection

### Real-Time Injection Pattern Recognition

**Goal**: Detect when a user submits parameters with statistical anomalies (likely adversarial).

### Anomaly Scoring Algorithm

```typescript
interface AnomalyDetectionConfig {
  enableRealTimeScoring: boolean;
  scoreThreshold: number;           // Alert triggered if score > threshold (e.g., 0.75)
  trainingWindowSize: number;       // Baseline built from last N submissions (e.g., 500)
  alertAction: 'WARN' | 'BLOCK';    // Block or warn operations above threshold
}

function scoreParameterAnomalies(
  param: SimulationAgentSeedParameter,
  userProfile: UserProfile,
  baselineStats: BaselineStatistics
): AnomalyScore {

  // Component 1: User Behavioral Anomaly (0–1 scale)
  // ===================================================
  // Question: Is this user submitting unusually complex simulations?
  const userComplexityScore = computeUserBehaviorDeviation(
    userProfile.pastSimulations,
    param.comorbidities.length + param.medicationClasses.length
  );
  // Extreme deviation → higher score

  // Component 2: Parameter Entropy Anomaly (0–1 scale)
  // ===================================================
  // Question: Do these parameters exhibit statistical unnaturalness?
  // (e.g., all agents have identical vital signs → unrealistic)
  const entropyScore = computeParameterEntropy(
    param.vitalSignsRange,
    baselineStats.vitalSignsDistribution
  );
  // Low entropy (high repetition) → higher score

  // Component 3: Temporal Anomaly (0–1 scale)
  // ===================================================
  // Question: Is the user submitting at unusual times or high velocity?
  const temporalScore = computeTemporalAnomaly(
    userProfile.submissionHistory,
    userProfile.lastSubmissionTime
  );
  // High velocity or off-hours → higher score

  // Component 4: Field Encoding Anomaly (0–1 scale)
  // ===================================================
  // Question: Are enum values being used in suspicious combinations?
  // (e.g., all CRITICAL severity + all rare comorbidities together)
  const encodingScore = detectFieldEncodingPatterns(param);
  // Suspicious correlation → higher score

  // Weighted aggregate
  const aggregateScore = (
    0.3 * userComplexityScore +
    0.3 * entropyScore +
    0.2 * temporalScore +
    0.2 * encodingScore
  );

  return {
    score: aggregateScore,
    components: {
      userBehavior: userComplexityScore,
      entropy: entropyScore,
      temporal: temporalScore,
      encoding: encodingScore
    },
    recommendation: aggregateScore > 0.75 ? 'INVESTIGATE' : 'ALLOW',
    reasoning: generateReasoningNarrative(aggregateScore)
  };
}

// Helper: User Behavioral Deviation
function computeUserBehaviorDeviation(
  pastSimulations: Simulation[],
  currentComplexity: number
): number {
  const mean = calculateMean(pastSimulations.map(s => s.complexity));
  const stdDev = calculateStdDev(pastSimulations.map(s => s.complexity));

  // Z-score: how many standard deviations from mean?
  const zScore = (currentComplexity - mean) / stdDev;

  // Convert to 0–1 anomaly score
  // |z| > 3 → score ≈ 0.95 (extreme anomaly)
  // |z| = 0 → score = 0 (normal)
  return Math.min(Math.abs(zScore) / 3, 1.0);
}

// Helper: Parameter Entropy
function computeParameterEntropy(
  currentVitals: VitalSignsRange,
  baselineDistribution: Map<string, number>
): number {
  const currentEncoding = encodeVitalsAsString(currentVitals);

  // Is this encoding common in the baseline?
  const baselineFrequency = baselineDistribution.get(currentEncoding) || 0;
  const expectedFrequency = 1 / baselineDistribution.size;

  // If rare in baseline → anomaly
  if (baselineFrequency < 0.01 * expectedFrequency) {
    return 0.85; // High anomaly score
  }

  return 0.1; // Low anomaly
}

// Helper: Temporal Anomaly
function computeTemporalAnomaly(
  submissionHistory: Submission[],
  lastSubmissionTime: Timestamp
): number {
  const timeSinceLastSubmission = Date.now() - lastSubmissionTime;
  const meanInterSubmissionTime = calculateMean(
    submissionHistory.map(s => s.timeDelta)
  );

  // Is this submission happening unusually fast?
  if (timeSinceLastSubmission < meanInterSubmissionTime * 0.1) {
    return 0.80; // Possible attack velocity
  }

  // Is this happening at an unusual hour?
  const hourOfDay = new Date(lastSubmissionTime).getHours();
  const isOffHours = hourOfDay < 6 || hourOfDay > 22;

  if (isOffHours && timeSinceLastSubmission < meanInterSubmissionTime * 0.5) {
    return 0.70;
  }

  return 0.1;
}

// Helper: Field Encoding Anomalies
function detectFieldEncodingPatterns(param: SimulationAgentSeedParameter): number {
  // Rule 1: Rare diagnosis + rare comorbidities = suspicious
  const rareComorbidityCount = param.comorbidities.filter(
    c => getRarityScore(c) > 0.8
  ).length;

  if (rareComorbidityCount >= 2 && param.severityScore === SeverityScoreRange.CRITICAL) {
    return 0.75; // Unlikely real patient combination
  }

  // Rule 2: All vital signs in critical range = statistically impossible for survival
  const criticalVitalCount = Object.values(param.vitalSignsRange).filter(
    v => v === VitalSignsCategory.CRITICAL
  ).length;

  if (criticalVitalCount >= 5) {
    return 0.80; // Patient would not be alive
  }

  return 0.1;
}
```

### Real-Time Alert & Logging

```typescript
// On anomaly detection trigger:
async function handleAnomalyDetection(
  anomalyScore: AnomalyScore,
  param: SimulationAgentSeedParameter,
  user: UserProfile,
  config: AnomalyDetectionConfig
): Promise<void> {

  if (anomalyScore.score > config.scoreThreshold) {
    // Log for compliance audit
    await auditLog.record({
      eventType: 'ANOMALOUS_PARAMETER_SUBMISSION',
      userId: user.id,
      hospitalId: user.hospitalId,
      anomalyScore: anomalyScore.score,
      components: anomalyScore.components,
      parameterHash: hash(JSON.stringify(param)),
      timestamp: Date.now(),
      severity: 'MEDIUM'
    });

    // Alert security team
    await notificationService.alertSecurityTeam({
      subject: `Anomalous simulation parameters from ${user.email}`,
      body: anomalyScore.reasoning
    });

    // Action based on config
    if (config.alertAction === 'BLOCK') {
      throw new Error(`Parameter submission blocked: anomaly score ${anomalyScore.score}`);
    } else {
      // Log warning but allow; human review recommended
      logger.warn(`High-anomaly submission accepted (manual review recommended)`);
    }
  }
}
```

---

## 4. Rate Limiting Specification

### Per-User, Per-Hospital Quota System

**Goal**: Prevent brute-force parameter injection attacks and limit attack surface.

```typescript
interface RateLimitPolicy {
  // Per individual user
  perUserLimits: {
    simulationsPerHour: number;     // e.g., 10
    simulationsPerDay: number;      // e.g., 50
    agentsPerSimulation: number;    // e.g., 100 agents max per single run
    parametersSubmissionsPerHour: number; // e.g., 20 (parameter tuning)
  };

  // Per hospital
  perHospitalLimits: {
    simulationsPerHour: number;     // e.g., 100 (all users combined)
    simulationsPerDay: number;      // e.g., 500
    totalComputeUnitsPerMonth: number; // e.g., 10,000 CU
  };

  // Per role (authorization)
  roleLimits: {
    ADMIN: { simulationsPerDay: 200 },
    CLINICIAN: { simulationsPerDay: 50 },
    ANALYST: { simulationsPerDay: 100 },
    GUEST: { simulationsPerDay: 5 }
  };

  // Penalty escalation (on repeated violations)
  penaltyPolicy: {
    firstViolation: { action: 'WARN', duration: null };
    secondViolation: { action: 'THROTTLE', duration: '1 hour' };
    thirdViolation: { action: 'BLOCK', duration: '24 hours' };
  };
}

// Pseudocode: Rate Limit Check
async function checkRateLimit(
  userId: string,
  hospitalId: string,
  policy: RateLimitPolicy
): Promise<RateLimitCheckResult> {

  // Fetch user's submission history (last 1 hour, 1 day)
  const userSubmissionsHour = await submissionStore.countRecent(userId, '1 hour');
  const userSubmissionsDay = await submissionStore.countRecent(userId, '1 day');

  // Fetch hospital's submission history
  const hospitalSubmissionsHour = await submissionStore.countRecent(hospitalId, '1 hour', 'HOSPITAL');
  const hospitalSubmissionsDay = await submissionStore.countRecent(hospitalId, '1 day', 'HOSPITAL');

  // Check violations
  const violations = [];

  if (userSubmissionsHour >= policy.perUserLimits.simulationsPerHour) {
    violations.push('USER_HOURLY_QUOTA');
  }
  if (userSubmissionsDay >= policy.perUserLimits.simulationsPerDay) {
    violations.push('USER_DAILY_QUOTA');
  }
  if (hospitalSubmissionsHour >= policy.perHospitalLimits.simulationsPerHour) {
    violations.push('HOSPITAL_HOURLY_QUOTA');
  }
  if (hospitalSubmissionsDay >= policy.perHospitalLimits.simulationsPerDay) {
    violations.push('HOSPITAL_DAILY_QUOTA');
  }

  // Retrieve user's violation history
  const violationHistory = await violationStore.getHistory(userId);

  // Determine penalty
  let action = 'ALLOW';
  if (violations.length > 0) {
    const penaltyEscalation = policy.penaltyPolicy[`violation_${violationHistory.count}`]
      || policy.penaltyPolicy.thirdViolation;
    action = penaltyEscalation.action;

    // Log violation
    await auditLog.record({
      eventType: 'RATE_LIMIT_VIOLATION',
      userId,
      hospitalId,
      violations,
      action,
      timestamp: Date.now()
    });
  }

  return {
    allowed: action === 'ALLOW',
    action,
    remainingQuotaHourly: Math.max(0, policy.perUserLimits.simulationsPerHour - userSubmissionsHour),
    remainingQuotaDaily: Math.max(0, policy.perUserLimits.simulationsPerDay - userSubmissionsDay)
  };
}
```

---

## 5. Output Sanitization Pipeline

### Multi-Layer PII Redaction

**Goal**: Ensure simulation output JSON contains no embedded PHI, even if input validation was bypassed.

```typescript
interface SanitizationPipeline {
  layers: [
    PII_REGEX_FILTER,           // Layer 1: Pattern-based detection
    STRUCTURAL_REDACTION,      // Layer 2: Field-level redaction
    DIFFERENTIAL_PRIVACY,      // Layer 3: Statistical noise injection
    CRYPTOGRAPHIC_HASHING      // Layer 4: Irreversible transformation
  ];
}

// Layer 1: PII Regex Filter
async function sanitizeWithRegexFilter(output: SimulationOutput): Promise<SimulationOutput> {
  const phiPatterns = [
    {
      name: 'CPF',
      pattern: /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g,
      replacement: '[REDACTED_CPF]'
    },
    {
      name: 'CNS',
      pattern: /\b(CNS:\s*\d{1,20})\b/gi,
      replacement: '[REDACTED_CNS]'
    },
    {
      name: 'EMAIL',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '[REDACTED_EMAIL]'
    },
    {
      name: 'PHONE',
      pattern: /\b(\+55)?\s?(\d{2})\s?(\d{4,5})-?(\d{4})\b/g,
      replacement: '[REDACTED_PHONE]'
    },
    {
      name: 'MRN_PATTERN',
      pattern: /\b(BR-[A-Z]{2}-\d{5,10})\b/g,
      replacement: '[REDACTED_MRN]'
    },
    {
      name: 'SPECIFIC_DATES',
      pattern: /\b(\d{4}-\d{2}-\d{2})\b/g,  // YYYY-MM-DD
      replacement: '[REDACTED_DATE]'
    }
  ];

  const serialized = JSON.stringify(output);
  let sanitized = serialized;

  phiPatterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  return JSON.parse(sanitized);
}

// Layer 2: Structural Redaction (field-level)
function sanitizeWithStructuralRedaction(output: SimulationOutput): SimulationOutput {
  // Define sensitive fields to redact entirely
  const sensitivePaths = [
    'agents[*].patientHistory',
    'agents[*].medicalRecordId',
    'agents[*].dateOfBirth',
    'agents[*].admissionTimestamp',  // Can be re-identifying
    'outputMetadata.hospitalInternalId',
    'outputMetadata.userIdSubmitter'
  ];

  sensitivePaths.forEach(path => {
    output = redactPath(output, path);
  });

  return output;
}

// Helper: Redact nested JSON path
function redactPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (part.includes('[*]')) {
      // Array iteration: agents[*].field
      const arrayName = part.replace('[*]', '');
      if (Array.isArray(current[arrayName])) {
        current[arrayName] = current[arrayName].map(item =>
          redactPath(item, parts.slice(i + 1).join('.'))
        );
      }
      return obj;
    } else {
      current = current[part];
    }
  }

  const finalKey = parts[parts.length - 1];
  if (current && typeof current === 'object') {
    current[finalKey] = '[REDACTED]';
  }

  return obj;
}

// Layer 3: Differential Privacy (add noise to sensitive metrics)
function sanitizeWithDifferentialPrivacy(
  output: SimulationOutput,
  epsilon: number = 1.0  // Privacy budget (lower = more noise)
): SimulationOutput {

  // Identify numeric fields that could be re-identifying
  const sensitiveNumericFields = [
    'agents[*].outcomes.losHours',        // Length of stay
    'agents[*].outcomes.icuDays',         // ICU duration
    'agents[*].outcomes.readmissionDays'  // Readmission timing
  ];

  // Add Laplace noise proportional to sensitivity
  sensitiveNumericFields.forEach(fieldPath => {
    const values = extractFieldValues(output, fieldPath);
    values.forEach((value, idx) => {
      const sensitivity = 1.0; // Max change in any single agent's value
      const scale = sensitivity / epsilon;
      const noise = laplacianNoise(scale);
      injectNoise(output, fieldPath, idx, value + noise);
    });
  });

  return output;
}

// Layer 4: Cryptographic Hashing (irreversible transformation)
function sanitizeWithCryptographicHashing(output: SimulationOutput): SimulationOutput {
  // Hash agent IDs so they're not reversible
  if (output.agents) {
    output.agents = output.agents.map(agent => ({
      ...agent,
      agentId: hashWithSalt(agent.agentId, HASHING_SALT),
      // Original agentId cannot be recovered
    }));
  }

  return output;
}

// Main orchestration
async function sanitizeOutput(
  output: SimulationOutput,
  config: SanitizationConfig
): Promise<SanitizationResult> {

  let sanitized = output;

  // Apply layers sequentially
  sanitized = await sanitizeWithRegexFilter(sanitized);
  sanitized = sanitizeWithStructuralRedaction(sanitized);
  sanitized = sanitizeWithDifferentialPrivacy(sanitized, config.epsilon);
  sanitized = sanitizeWithCryptographicHashing(sanitized);

  // Verify no PII escaped
  const residualPii = detectResidualPii(sanitized);
  if (residualPii.found) {
    throw new Error(`PII detection failed post-sanitization: ${residualPii.samples.join(', ')}`);
  }

  // Log sanitization event for audit
  await auditLog.record({
    eventType: 'OUTPUT_SANITIZATION_COMPLETE',
    simulationId: output.simulationId,
    layersApplied: 4,
    piiRemoved: residualPii.patternsMatched,
    timestamp: Date.now()
  });

  return {
    sanitized,
    success: true,
    piiRemovalCount: residualPii.patternsMatched
  };
}
```

---

## 6. Model Poisoning Prevention: Calibration Snapshot Versioning

### Integrity & Tamper-Detection Mechanism

**Goal**: Detect and prevent malicious calibration updates from corrupting the global simulation model.

```typescript
interface CalibrationSnapshot {
  // Immutable metadata
  snapshotId: UUID;
  epochNumber: number;
  sourceHospitalId: string;
  sourceHospitalName: string;

  // Cryptographic integrity
  dataHash: SHA256;           // Hash of calibration data
  signaturePublicKey: PublicKey;
  signature: RSASignature;    // Source hospital's signature

  // Versioning & audit trail
  createdAt: Timestamp;
  approvedBy: string;         // Human reviewer before aggregation
  approvalTimestamp: Timestamp;

  // Payload (actual calibration weights)
  calibrationWeights: {
    admissionLogits: Float32Array;
    losEstimator: Float32Array;
    readmissionPredictor: Float32Array;
    // ... other model components
  };

  // Anomaly detection metadata
  statisticalMetrics: {
    meanWeightChange: number;      // vs. previous epoch
    stdDevWeightChange: number;
    outlierFraction: number;       // % of weights deviating >3σ
    divergenceFromGlobal: number;  // KL divergence from global model
  };
}

// Step 1: Digital Signature Verification
async function verifyCalibrationSignature(
  snapshot: CalibrationSnapshot
): Promise<VerificationResult> {

  // Reconstruct payload for signature verification
  const payloadToVerify = JSON.stringify(snapshot.calibrationWeights);
  const payloadHash = sha256(payloadToVerify);

  // Verify hospital's digital signature
  const isValid = verifyRSASignature(
    payloadHash,
    snapshot.signature,
    snapshot.signaturePublicKey
  );

  if (!isValid) {
    return {
      valid: false,
      reason: 'SIGNATURE_VERIFICATION_FAILED',
      severity: 'CRITICAL'
    };
  }

  // Verify payload hash matches metadata
  if (payloadHash !== snapshot.dataHash) {
    return {
      valid: false,
      reason: 'PAYLOAD_HASH_MISMATCH',
      severity: 'CRITICAL'
    };
  }

  return { valid: true };
}

// Step 2: Statistical Anomaly Detection (Robust Aggregation)
async function detectAnomalousCalibration(
  snapshot: CalibrationSnapshot,
  globalModel: GlobalSimulationModel,
  historicalSnapshots: CalibrationSnapshot[]
): Promise<AnomalyDetectionResult> {

  // Compute statistical metrics
  const previousEpochSnapshot = historicalSnapshots[historicalSnapshots.length - 1];
  const weightChanges = computeElementWiseChange(
    snapshot.calibrationWeights,
    previousEpochSnapshot.calibrationWeights
  );

  const mean = calculateMean(weightChanges);
  const stdDev = calculateStdDev(weightChanges);

  // Identify outlier weights (>3 sigma deviation)
  const outliers = weightChanges.filter(w => Math.abs(w - mean) > 3 * stdDev);
  const outlierFraction = outliers.length / weightChanges.length;

  // Compute divergence from global model
  const kldivergence = computeKLDivergence(
    snapshot.calibrationWeights,
    globalModel.weights
  );

  // Decision logic
  const isAnomalous = outlierFraction > 0.15 || kldivergence > 0.5;

  return {
    isAnomalous,
    metrics: {
      meanWeightChange: mean,
      stdDevWeightChange: stdDev,
      outlierFraction,
      divergenceFromGlobal: kldivergence
    },
    recommendation: isAnomalous ? 'REJECT_AND_INVESTIGATE' : 'ACCEPT',
    severity: isAnomalous ? 'HIGH' : 'LOW'
  };
}

// Step 3: Human Approval Gate (Before Aggregation)
async function requireHumanApprovalForAggregation(
  snapshot: CalibrationSnapshot,
  anomaly: AnomalyDetectionResult
): Promise<ApprovalResult> {

  // If anomaly detected or high divergence, escalate to human reviewer
  if (anomaly.isAnomalous || anomaly.metrics.divergenceFromGlobal > 0.3) {

    // Create approval task
    const task = {
      taskId: uuid(),
      type: 'CALIBRATION_APPROVAL',
      priority: 'HIGH',
      snapshot,
      anomaly,
      assignedTo: 'calibration-review-team',
      dueDate: Date.now() + 24 * 3600 * 1000, // 24 hours
      requiredApprovals: 2  // Dual approval for high-risk updates
    };

    await approvalWorkflow.createTask(task);

    return {
      requiresApproval: true,
      taskId: task.taskId,
      waitingForReview: true
    };
  }

  // Low-risk updates may auto-approve (with audit logging)
  return {
    requiresApproval: false,
    autoApproved: true
  };
}

// Step 4: Aggregation with Robust Filtering
async function aggregateCalibrationSnapshots(
  snapshots: CalibrationSnapshot[],
  globalModel: GlobalSimulationModel,
  aggregationMethod: 'TRIMMED_MEAN' | 'KRUM' | 'BYZANTINE' = 'TRIMMED_MEAN'
): Promise<GlobalSimulationModel> {

  // Verify all snapshots
  const verificationResults = await Promise.all(
    snapshots.map(s => verifyCalibrationSignature(s))
  );

  if (verificationResults.some(r => !r.valid)) {
    throw new Error('Signature verification failed for one or more snapshots');
  }

  // Detect anomalies
  const anomalies = await Promise.all(
    snapshots.map(s => detectAnomalousCalibration(s, globalModel, []))
  );

  // Filter anomalous snapshots (do not include in aggregation)
  const validSnapshots = snapshots.filter((s, idx) => !anomalies[idx].isAnomalous);

  if (validSnapshots.length < snapshots.length * 0.5) {
    throw new Error('Too many anomalous snapshots detected; aggregation aborted');
  }

  // Perform robust aggregation
  let aggregatedWeights;

  if (aggregationMethod === 'TRIMMED_MEAN') {
    // Remove top and bottom 20%, average the rest
    aggregatedWeights = trimmedMeanAggregation(validSnapshots, 0.2);
  } else if (aggregationMethod === 'KRUM') {
    // Remove the snapshot most distant from others
    aggregatedWeights = krumAggregation(validSnapshots, f = 1);
  } else if (aggregationMethod === 'BYZANTINE') {
    // Iterative filtering (Byzantine-resilient aggregation)
    aggregatedWeights = byzantineAggregation(validSnapshots);
  }

  // Update global model
  const updatedModel = {
    ...globalModel,
    weights: aggregatedWeights,
    lastAggregatedAt: Date.now(),
    aggregatedSnapshots: validSnapshots.length,
    rejectedSnapshots: snapshots.length - validSnapshots.length
  };

  // Log aggregation event
  await auditLog.record({
    eventType: 'MODEL_AGGREGATION_COMPLETE',
    inputSnapshots: snapshots.length,
    validSnapshots: validSnapshots.length,
    rejectedSnapshots: snapshots.length - validSnapshots.length,
    aggregationMethod,
    timestamp: Date.now()
  });

  return updatedModel;
}

// Step 5: Immutable Audit Trail & Versioning
async function logCalibrationSnapshot(
  snapshot: CalibrationSnapshot,
  action: 'ACCEPTED' | 'REJECTED' | 'AGGREGATED'
): Promise<void> {

  const versionedRecord = {
    snapshotId: snapshot.snapshotId,
    epochNumber: snapshot.epochNumber,
    sourceHospital: snapshot.sourceHospitalId,
    action,
    dataHash: snapshot.dataHash,
    timestamp: Date.now(),
    immutable: true  // Mark as immutable for audit compliance
  };

  // Write to append-only audit log
  await auditLog.appendImmutable(versionedRecord);

  // Store snapshot archive (versioning)
  await snapshotArchive.store(
    snapshot.snapshotId,
    snapshot,
    {
      indexedBy: ['epochNumber', 'sourceHospitalId'],
      ttl: 7 * 365 * 24 * 3600 * 1000  // 7 years (regulatory retention)
    }
  );
}
```

---

## 7. Network-Layer Firewall: Simulation Service DB Permissions

### Principle of Least Privilege (PLP) for Data Access

**Goal**: Ensure simulation service cannot access raw patient data; only pre-aggregated, de-identified calibration snapshots.

```typescript
// Database role hierarchy
interface DatabaseRoleStructure {
  // Patient data tables (RESTRICTED)
  patientRecords: {
    owner: 'hospital_admin_role',
    permissions: {
      select: ['hospital_admin_role'],        // Hospital admins only
      insert: ['hospital_clinical_staff'],    // Clinical staff
      update: ['hospital_admin_role'],
      delete: ['hospital_system_admin']       // Highly restricted
    }
  };

  // Simulation service role (SANDBOXED)
  simulationServiceRole: {
    allowedTables: [
      'calibration_snapshots',    // Aggregated, de-identified
      'simulation_parameters',    // Pre-approved parameter templates
      'simulation_outputs',       // Generated outputs only
      'audit_logs'                // Read-only audit trail
    ],
    deniedTables: [
      'patient_records',          // ❌ NO DIRECT ACCESS
      'patient_visits',           // ❌ NO ACCESS
      'patient_medications',      // ❌ NO ACCESS
      'lab_results',              // ❌ NO ACCESS
      'hospital_admin_settings'   // ❌ NO ACCESS
    ],
    allowedOperations: {
      SELECT: ['*'],
      INSERT: ['simulation_parameters', 'simulation_outputs', 'audit_logs'],
      UPDATE: ['simulation_parameters'],  // Read/write only non-sensitive data
      DELETE: false                       // NO DELETE permission
    }
  };

  // Calibration ingestion service (EPHEMERAL)
  calibrationIngestionRole: {
    allowedTables: ['calibration_snapshots'],
    allowedOperations: {
      SELECT: false,
      INSERT: true,
      UPDATE: false,
      DELETE: false
    },
    ttl: 3600  // Connection reset every hour
  };
}

// SQL-level enforcement (example: PostgreSQL)
const sqlRoleDefinition = `
-- Create role for simulation service
CREATE ROLE simulation_service_app WITH LOGIN PASSWORD '<STRONG_RANDOM_PASSWORD>';

-- Grant read-only access to safe tables
GRANT SELECT ON TABLE calibration_snapshots TO simulation_service_app;
GRANT SELECT ON TABLE simulation_parameters TO simulation_service_app;
GRANT INSERT, SELECT ON TABLE simulation_outputs TO simulation_service_app;
GRANT SELECT ON TABLE audit_logs TO simulation_service_app;

-- Explicitly REVOKE all access to patient tables
REVOKE ALL ON TABLE patient_records FROM simulation_service_app;
REVOKE ALL ON TABLE patient_visits FROM simulation_service_app;
REVOKE ALL ON TABLE patient_medications FROM simulation_service_app;
REVOKE ALL ON TABLE lab_results FROM simulation_service_app;

-- Set default privileges (any future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM simulation_service_app;

-- Restrict to hospital-specific data (if multi-tenant)
-- Ensure row-level security (RLS) policies prevent cross-tenant access
`;

// Runtime enforcement (at application layer)
interface SimulationServiceDatabaseConnection {
  // Use separate credentials with minimal permissions
  username: 'simulation_service_app';
  password: SECRETS_MANAGER.get('SIM_SERVICE_DB_PASSWORD');

  // Connection pooling with statement sanitization
  connectionPool: {
    maxConnections: 5,           // Small pool to limit exposure
    statementTimeout: 30000,     // 30-second timeout (prevent long queries)
    defaultIsolationLevel: 'READ_ONLY'  // Can only read
  };

  // Query whitelist (only pre-approved queries allowed)
  queryWhitelist: [
    'SELECT * FROM calibration_snapshots WHERE ...',
    'SELECT * FROM simulation_parameters WHERE ...',
    'INSERT INTO simulation_outputs VALUES (...)',
    // ... (exhaustive list of safe queries)
  ];

  // Query validation
  validateQuery(query: string): boolean {
    // Reject any query not in whitelist
    return this.queryWhitelist.some(approved =>
      query.toLowerCase().startsWith(approved.toLowerCase())
    );
  }
}

// Row-Level Security (RLS) Policy for Multi-Tenant
const rlsPolicy = `
-- Ensure simulation service can only access simulation_outputs for its own hospital
CREATE POLICY simulation_service_hospital_isolation ON simulation_outputs
  FOR SELECT
  USING (hospital_id = CURRENT_SETTING('hospital_context.id'));

-- Set hospital context at connection time
SET hospital_context.id = '<HOSPITAL_ID>';
`;
```

---

## 8. Pre-Pilot Penetration Test Scope & Requirements

### Red-Team Exercise Objectives

**Duration**: 2–3 weeks pre-pilot
**Budget**: ~USD 15K–25K (external security firm)
**Scope**: All attack vectors outlined in Section 1 (Threat Model)

### Test Plan

| Test Category | Objective | Method |
|---------------|-----------|--------|
| **Input Validation Bypass** | Can attacker inject free-text PHI despite schema validation? | Fuzzing, boundary testing, unicode/encoding bypass |
| **Anomaly Detection Evasion** | Can attacker craft "natural-looking" injected parameters? | Statistical gradient descent to minimize anomaly score |
| **Rate Limiting Bypass** | Can attacker exceed quotas via IP spoofing or distributed submissions? | Multi-source parallel submissions, JWT token manipulation |
| **Output Sanitization Failure** | Can embedded PHI escape the sanitization pipeline? | Exfiltration attempt through regex gaps, encoding tricks |
| **Model Poisoning** | Can malicious calibration updates corrupt global model? | Submit tampered snapshots, verify aggregation resilience |
| **Database Isolation** | Can simulation service access patient_records table? | Attempt direct SQL queries, test RLS enforcement |
| **Audit Trail Tampering** | Can attacker delete or modify audit logs? | Attempt DELETE operations, verify immutability |

### Red-Team Report Deliverables

1. **Executive Summary**: Overall risk rating (Low/Medium/High/Critical), pass/fail on each test objective.
2. **Technical Findings**: Details on vulnerabilities found, with proof-of-concept code.
3. **Remediation Recommendations**: Prioritized list of fixes; note which are blocking for pilot launch.
4. **Compliance Checklist**: Verification that LGPD/HIPAA-equivalent controls are in place.
5. **Re-Test Plan**: After fixes, schedule second pen-test wave (1 week before pilot).

### Go/No-Go Criteria for Pilot Launch

| Criteria | Requirement | Status |
|----------|-------------|--------|
| Zero **CRITICAL** findings | All critical vulns must be closed | REQUIRED |
| ≤2 **HIGH** findings | Max 2 high-risk vulns; must have remediation plan | REQUIRED |
| Output sanitization bypass test | No successful PHI exfiltration | REQUIRED |
| Model aggregation poisoning | ≤5% of snapshots accepted despite tampering | REQUIRED |
| Database isolation | Simulation service cannot access patient_records | REQUIRED |
| Audit trail immutability | Cannot delete/modify audit logs | REQUIRED |
| Rate limiting resilience | Cannot exceed quotas via distributed attack | REQUIRED |

### Post-Launch Monitoring

Even after pilot launch, maintain continuous security monitoring:

```typescript
interface SecurityMonitoringPlan {
  realTimeDetection: {
    anomalousParameterSubmissions: true,      // Alert if anomaly score > threshold
    rateLimitViolations: true,                // Alert on quota exceeds
    databaseAccessAttempts: true,             // Alert on unauthorized SQL
    auditLogTamperAttempts: true              // Alert on DELETE/UPDATE attempts
  };

  weeklySecurity Review: {
    anomalyTrend: true,                       // Analyze 7-day trend
    userBehaviorDeviation: true,              // New user patterns
    modelDrift: true                          // Calibration weights divergence
  };

  monthlySecurityAudit: {
    redTeamSchedule: 'Q1, Q3',                // Schedule follow-up pen-tests
    complianceChecklist: true,                // LGPD/HIPAA audit
    incidentReview: true                      // Post-mortem any incidents
  };
}
```

---

## 9. Summary: Security Controls Checklist

| Control | Owner | Status |
|---------|-------|--------|
| Input validation (typed, bounded, no free-text) | CYRUS | Design complete; implement before pilot |
| Anomaly detection (real-time scoring) | CYRUS | Algorithm finalized; needs implementation |
| Rate limiting (per-user, per-hospital) | CYRUS | Config ready; DB schema needed |
| Output sanitization (4-layer pipeline) | CYRUS | Code skeleton exists; needs refinement |
| Calibration versioning & digital signatures | CYRUS | Design complete; needs cryptography library |
| Model aggregation (robust filtering) | CYRUS | Algorithm designed; implement with testing |
| Database RLS & role-based access | CYRUS | SQL policy drafted; needs DBA review |
| Audit trail immutability (append-only log) | CYRUS | Infrastructure setup needed |
| Pre-pilot pen-test | CYRUS + External Vendor | RFP to be issued 4 weeks pre-pilot |

---

## Sources

- [NIST Trustworthy and Responsible AI](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf)
- [Adversarial Machine Learning: Understanding and Preventing Model Exploitation](https://www.obsidiansecurity.com/blog/adversarial-machine-learning)
- [Data Exfiltration in AI Assistants](https://www.emergentmind.com/topics/data-exfiltration-attacks-on-ai-assistants)
- [Unveiling AI Agent Vulnerabilities Part III: Data Exfiltration](https://www.trendmicro.com/vinfo/us/security/news/threat-landscape/unveiling-ai-agent-vulnerabilities-part-iii-data-exfiltration)
- [Exploiting Web Search Tools of AI Agents for Data Exfiltration](https://arxiv.org/html/2510.09093v1)
- [What Is a Prompt Injection Attack? — Palo Alto Networks](https://www.paloaltonetworks.com/cyberpedia/what-is-prompt-injection-attack)
- [Prompt Injection Attacks: The Most Common AI Exploit in 2025](https://www.obsidiansecurity.com/blog/prompt-injection)
- [LLM Prompt Injection Prevention — OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [AI Prompt Injection in Healthcare: The Real Cyber Risk Hiding in Plain Sight](https://clearwatersecurity.com/blog/ai-prompt-injection-in-healthcare/)
- [Data Poisoning Vulnerabilities Across Health Care Artificial Intelligence Architectures](https://pmc.ncbi.nlm.nih.gov/articles/PMC12881903/)
- [Safeguarding Federated Learning Models Against Data Poisoning Attacks](https://link.springer.com/article/10.1007/s43926-025-00244-z)
- [A Robust and Verifiable Federated Learning Framework for Preventing Data Poisonous Threats](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1762346/full)

---

**Document Version**: 1.0
**Last Updated**: 2026-03-17
**Owner**: CISO & VP Security
**Review Schedule**: Quarterly (during active pilot period)
