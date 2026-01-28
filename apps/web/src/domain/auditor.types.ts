
export enum IntegrityRiskLevel {
    LOW = 'LOW',
    MODERATE = 'MODERATE',
    CRITICAL = 'CRITICAL',
}

export enum DetectionCategory {
    DOSAGE_ERROR = 'DOSAGE_ERROR',
    LATERALITY_MISMATCH = 'LATERALITY_MISMATCH',
    OMISSION = 'OMISSION',
    FABRICATION = 'FABRICATION',
    ALLERGY_CONFLICT = 'ALLERGY_CONFLICT',
}

export interface AuditorExecutionMetadata {
    model_id: string; // e.g., "mock-gpt-4", "gpt-4-turbo"
    latency_ms: number;
    input_tokens: number;
    output_tokens: number;
}

export interface AuditorVerdict {
    execution_metadata: AuditorExecutionMetadata;
    safety_score: number; // 0-100
    risk_level: IntegrityRiskLevel;
    categories_detected: DetectionCategory[];
    reasoning_trace: string; // Chain of Thought
    clinical_intervention: string; // User-facing warning
}
