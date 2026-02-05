/**
 * RLHF Feedback Collector (Enhanced Schema)
 * 
 * Captures comprehensive doctor validation decisions for:
 * 1. Fine-tuning the local LLM with rich clinical context
 * 2. Building a proprietary clinical validation dataset
 * 3. Continuous improvement of probabilistic accuracy
 * 
 * Data is stored locally in SQLite and can be exported for training.
 * All PII is anonymized before storage.
 * 
 * @module sidecar/llm/rlhf-collector
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - COMPREHENSIVE CLINICAL CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PatientContext {
    // Demographics (Anonymized)
    ageRange: 'neonate' | 'infant' | 'pediatric' | 'adolescent' | 'adult' | 'geriatric';
    weightRange?: 'underweight' | 'normal' | 'overweight' | 'obese';
    sex?: 'male' | 'female' | 'other';
    pregnancyStatus?: 'pregnant' | 'breastfeeding' | 'none' | 'unknown';

    // Clinical Status
    renalFunction?: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment' | 'dialysis';
    hepaticFunction?: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment';
    cardiacStatus?: 'normal' | 'heart_failure' | 'arrhythmia' | 'post_mi';

    // Comorbidities (ICD-10 categories, not specific codes)
    comorbidityCategories?: string[]; // e.g., ['diabetes', 'hypertension', 'copd']
    allergyCategories?: string[]; // e.g., ['penicillin', 'sulfa', 'nsaid']

    // Vitals (ranges, not exact values)
    bpCategory?: 'hypotensive' | 'normal' | 'elevated' | 'hypertensive_stage1' | 'hypertensive_stage2' | 'hypertensive_crisis';
    heartRateCategory?: 'bradycardia' | 'normal' | 'tachycardia';
    temperatureCategory?: 'hypothermic' | 'normal' | 'febrile' | 'hyperthermic';

    // Lab Results (categorical)
    creatinineCategory?: 'normal' | 'elevated' | 'critical';
    potassiumCategory?: 'low' | 'normal' | 'high' | 'critical';
    glucoseCategory?: 'hypoglycemic' | 'normal' | 'elevated' | 'hyperglycemic';
    inrCategory?: 'subtherapeutic' | 'therapeutic' | 'supratherapeutic' | 'critical';
}

export interface MedicationContext {
    // Drug Information
    genericName: string;
    brandName?: string;
    drugClass?: string; // e.g., 'anticoagulant', 'antibiotic', 'opioid'
    controlledSubstance?: boolean;
    highAlertMedication?: boolean;

    // Dosing
    doseValue?: number;
    doseUnit?: string; // mg, mcg, mL, units
    frequency?: string; // BID, TID, PRN, etc.
    route?: 'oral' | 'iv' | 'im' | 'subq' | 'topical' | 'inhaled' | 'rectal' | 'other';
    duration?: string; // e.g., '7 days', 'ongoing'

    // Context
    indication?: string; // e.g., 'infection', 'pain', 'hypertension'
    isNewPrescription?: boolean;
    isDoseChange?: boolean;
}

export interface InteractionContext {
    // Current Medications (drug classes only)
    concurrentDrugClasses?: string[];
    polypharmacyCount?: number; // Number of concurrent medications

    // Detected Interactions
    detectedInteractions?: Array<{
        interactionType: 'drug-drug' | 'drug-allergy' | 'drug-disease' | 'drug-food' | 'duplicate_therapy';
        severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
        description: string;
    }>;
}

export interface EncounterContext {
    // Setting
    encounterType: 'inpatient' | 'outpatient' | 'emergency' | 'icu' | 'surgery' | 'telehealth';
    specialty?: string; // e.g., 'cardiology', 'oncology', 'primary_care'

    // Urgency
    acuityLevel?: 'routine' | 'urgent' | 'emergent' | 'stat';

    // EHR Context
    ehrType?: string;
    formType?: 'prescription' | 'order_set' | 'medication_reconciliation' | 'discharge';
}

export interface FeedbackRecord {
    id: string;
    timestamp: Date;
    sessionId: string;

    // Rich Context
    patient: PatientContext;
    medication: MedicationContext;
    interactions?: InteractionContext;
    encounter: EncounterContext;

    // LLM Prediction
    llmRiskLevel: 'low' | 'medium' | 'high';
    llmConfidence: number;
    llmReasoning: string;
    llmLatencyMs: number;
    llmModelVersion?: string;

    // Doctor Decision
    doctorAction: 'confirmed' | 'overridden' | 'escalated' | 'modified';
    overrideJustification?: string;
    modificationDetails?: string;
    timeToDecisionMs?: number; // How long doctor took to decide

    // Ground Truth (for training)
    correctRiskLevel?: 'low' | 'medium' | 'high';

    // Quality Signals
    wasEscalatedToSupervisor?: boolean;
    supervisorAgreed?: boolean;
    adverseEventReported?: boolean;
}

export interface TrainingExport {
    version: string;
    exportedAt: Date;
    recordCount: number;
    records: FeedbackRecord[];
    schema: {
        patientContextFields: string[];
        medicationContextFields: string[];
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RLHF COLLECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class RLHFCollector {
    private db: Database.Database;
    private sessionId: string;

    constructor(sessionId: string) {
        this.sessionId = sessionId;

        // Store in user data directory
        const dbPath = path.join(
            app.getPath('userData'),
            'rlhf-feedback-v2.db'
        );

        this.db = new Database(dbPath);
        this.initializeSchema();
    }

    /**
     * Record a feedback event with full context
     */
    recordFeedback(feedback: Omit<FeedbackRecord, 'id' | 'timestamp' | 'sessionId'>): string {
        const id = this.generateId();
        const timestamp = new Date().toISOString();

        const stmt = this.db.prepare(`
      INSERT INTO feedback (
        id, timestamp, session_id,
        patient_context, medication_context, interaction_context, encounter_context,
        llm_risk_level, llm_confidence, llm_reasoning, llm_latency_ms, llm_model_version,
        doctor_action, override_justification, modification_details, time_to_decision_ms,
        correct_risk_level, was_escalated, supervisor_agreed, adverse_event_reported
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            id, timestamp, this.sessionId,
            JSON.stringify(feedback.patient),
            JSON.stringify(feedback.medication),
            feedback.interactions ? JSON.stringify(feedback.interactions) : null,
            JSON.stringify(feedback.encounter),
            feedback.llmRiskLevel,
            feedback.llmConfidence,
            feedback.llmReasoning,
            feedback.llmLatencyMs,
            feedback.llmModelVersion || null,
            feedback.doctorAction,
            feedback.overrideJustification || null,
            feedback.modificationDetails || null,
            feedback.timeToDecisionMs || null,
            feedback.correctRiskLevel || null,
            feedback.wasEscalatedToSupervisor ? 1 : 0,
            feedback.supervisorAgreed ? 1 : 0,
            feedback.adverseEventReported ? 1 : 0
        );

        return id;
    }

    /**
     * Update feedback with ground truth (when doctor corrects)
     */
    updateGroundTruth(feedbackId: string, correctRiskLevel: 'low' | 'medium' | 'high'): void {
        const stmt = this.db.prepare(`
      UPDATE feedback SET correct_risk_level = ? WHERE id = ?
    `);
        stmt.run(correctRiskLevel, feedbackId);
    }

    /**
     * Mark adverse event (critical for training)
     */
    reportAdverseEvent(feedbackId: string): void {
        const stmt = this.db.prepare(`
      UPDATE feedback SET adverse_event_reported = 1 WHERE id = ?
    `);
        stmt.run(feedbackId);
    }

    /**
     * Export data for training (full context)
     */
    exportForTraining(since?: Date): TrainingExport {
        let query = 'SELECT * FROM feedback WHERE doctor_action IN ("confirmed", "overridden", "modified")';
        const params: (string | number)[] = [];

        if (since) {
            query += ' AND timestamp >= ?';
            params.push(since.toISOString());
        }

        query += ' ORDER BY timestamp ASC';

        const rows = this.db.prepare(query).all(...params) as any[];

        const records: FeedbackRecord[] = rows.map(row => ({
            id: row.id,
            timestamp: new Date(row.timestamp),
            sessionId: row.session_id,
            patient: JSON.parse(row.patient_context),
            medication: JSON.parse(row.medication_context),
            interactions: row.interaction_context ? JSON.parse(row.interaction_context) : undefined,
            encounter: JSON.parse(row.encounter_context),
            llmRiskLevel: row.llm_risk_level,
            llmConfidence: row.llm_confidence,
            llmReasoning: row.llm_reasoning,
            llmLatencyMs: row.llm_latency_ms,
            llmModelVersion: row.llm_model_version,
            doctorAction: row.doctor_action,
            overrideJustification: row.override_justification,
            modificationDetails: row.modification_details,
            timeToDecisionMs: row.time_to_decision_ms,
            correctRiskLevel: row.correct_risk_level,
            wasEscalatedToSupervisor: !!row.was_escalated,
            supervisorAgreed: !!row.supervisor_agreed,
            adverseEventReported: !!row.adverse_event_reported,
        }));

        return {
            version: '2.0.0',
            exportedAt: new Date(),
            recordCount: records.length,
            records,
            schema: {
                patientContextFields: [
                    'ageRange', 'weightRange', 'sex', 'pregnancyStatus',
                    'renalFunction', 'hepaticFunction', 'cardiacStatus',
                    'comorbidityCategories', 'allergyCategories',
                    'bpCategory', 'heartRateCategory', 'temperatureCategory',
                    'creatinineCategory', 'potassiumCategory', 'glucoseCategory', 'inrCategory'
                ],
                medicationContextFields: [
                    'genericName', 'brandName', 'drugClass', 'controlledSubstance', 'highAlertMedication',
                    'doseValue', 'doseUnit', 'frequency', 'route', 'duration',
                    'indication', 'isNewPrescription', 'isDoseChange'
                ]
            }
        };
    }

    /**
     * Export as JSONL for LLM fine-tuning (OpenAI/Llama format)
     */
    exportAsJSONL(): string {
        const data = this.exportForTraining();

        const lines = data.records
            .filter(r => r.correctRiskLevel || r.doctorAction === 'confirmed')
            .map(r => {
                // Build rich context prompt
                const prompt = this.buildTrainingPrompt(r);
                const targetRisk = r.correctRiskLevel || r.llmRiskLevel;

                const response = JSON.stringify({
                    risk_level: targetRisk,
                    reasoning: r.overrideJustification || r.llmReasoning,
                    confidence: r.doctorAction === 'confirmed' ? 95 : 75,
                });

                return JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a clinical decision support AI. Assess medication orders for safety risks.' },
                        { role: 'user', content: prompt },
                        { role: 'assistant', content: response }
                    ]
                });
            });

        return lines.join('\n');
    }

    /**
     * Get comprehensive statistics
     */
    getStats(): {
        totalRecords: number;
        confirmedCount: number;
        overriddenCount: number;
        modifiedCount: number;
        escalatedCount: number;
        accuracyRate: number;
        avgLatencyMs: number;
        avgTimeToDecisionMs: number;
        adverseEventCount: number;
        byEncounterType: Record<string, number>;
        byDrugClass: Record<string, number>;
    } {
        const basic = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN doctor_action = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN doctor_action = 'overridden' THEN 1 ELSE 0 END) as overridden,
        SUM(CASE WHEN doctor_action = 'modified' THEN 1 ELSE 0 END) as modified,
        SUM(CASE WHEN doctor_action = 'escalated' THEN 1 ELSE 0 END) as escalated,
        AVG(llm_latency_ms) as avg_latency,
        AVG(time_to_decision_ms) as avg_decision_time,
        SUM(CASE WHEN adverse_event_reported = 1 THEN 1 ELSE 0 END) as adverse_events
      FROM feedback
    `).get() as any;

        const total = basic.total || 0;
        const confirmed = basic.confirmed || 0;

        // Get breakdown by encounter type
        const encounterRows = this.db.prepare(`
      SELECT json_extract(encounter_context, '$.encounterType') as enc_type, COUNT(*) as cnt
      FROM feedback GROUP BY enc_type
    `).all() as any[];

        const byEncounterType: Record<string, number> = {};
        encounterRows.forEach(row => {
            if (row.enc_type) byEncounterType[row.enc_type] = row.cnt;
        });

        // Get breakdown by drug class
        const drugRows = this.db.prepare(`
      SELECT json_extract(medication_context, '$.drugClass') as drug_class, COUNT(*) as cnt
      FROM feedback GROUP BY drug_class ORDER BY cnt DESC LIMIT 10
    `).all() as any[];

        const byDrugClass: Record<string, number> = {};
        drugRows.forEach(row => {
            if (row.drug_class) byDrugClass[row.drug_class] = row.cnt;
        });

        return {
            totalRecords: total,
            confirmedCount: confirmed,
            overriddenCount: basic.overridden || 0,
            modifiedCount: basic.modified || 0,
            escalatedCount: basic.escalated || 0,
            accuracyRate: total > 0 ? (confirmed / total) * 100 : 0,
            avgLatencyMs: basic.avg_latency || 0,
            avgTimeToDecisionMs: basic.avg_decision_time || 0,
            adverseEventCount: basic.adverse_events || 0,
            byEncounterType,
            byDrugClass,
        };
    }

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private initializeSchema(): void {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL,
        
        -- Rich Context (JSON)
        patient_context TEXT NOT NULL,
        medication_context TEXT NOT NULL,
        interaction_context TEXT,
        encounter_context TEXT NOT NULL,
        
        -- LLM Prediction
        llm_risk_level TEXT NOT NULL,
        llm_confidence INTEGER NOT NULL,
        llm_reasoning TEXT NOT NULL,
        llm_latency_ms INTEGER NOT NULL,
        llm_model_version TEXT,
        
        -- Doctor Decision
        doctor_action TEXT NOT NULL,
        override_justification TEXT,
        modification_details TEXT,
        time_to_decision_ms INTEGER,
        
        -- Ground Truth
        correct_risk_level TEXT,
        
        -- Quality Signals
        was_escalated INTEGER DEFAULT 0,
        supervisor_agreed INTEGER DEFAULT 0,
        adverse_event_reported INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback(timestamp);
      CREATE INDEX IF NOT EXISTS idx_feedback_doctor_action ON feedback(doctor_action);
      CREATE INDEX IF NOT EXISTS idx_feedback_adverse ON feedback(adverse_event_reported);
    `);
    }

    private generateId(): string {
        return `fb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    private buildTrainingPrompt(record: FeedbackRecord): string {
        const patient = record.patient;
        const med = record.medication;
        const enc = record.encounter;

        let prompt = `Assess clinical risk for the following medication order:\n\n`;
        prompt += `**Medication**: ${med.genericName}`;
        if (med.doseValue && med.doseUnit) prompt += ` ${med.doseValue}${med.doseUnit}`;
        if (med.frequency) prompt += ` ${med.frequency}`;
        if (med.route) prompt += ` (${med.route})`;
        prompt += `\n`;

        if (med.drugClass) prompt += `**Drug Class**: ${med.drugClass}\n`;
        if (med.highAlertMedication) prompt += `**⚠️ High Alert Medication**\n`;
        if (med.indication) prompt += `**Indication**: ${med.indication}\n`;

        prompt += `\n**Patient**:\n`;
        prompt += `- Age: ${patient.ageRange}\n`;
        if (patient.sex) prompt += `- Sex: ${patient.sex}\n`;
        if (patient.weightRange) prompt += `- Weight: ${patient.weightRange}\n`;
        if (patient.pregnancyStatus && patient.pregnancyStatus !== 'none') prompt += `- Pregnancy: ${patient.pregnancyStatus}\n`;

        if (patient.renalFunction && patient.renalFunction !== 'normal') prompt += `- Renal: ${patient.renalFunction}\n`;
        if (patient.hepaticFunction && patient.hepaticFunction !== 'normal') prompt += `- Hepatic: ${patient.hepaticFunction}\n`;
        if (patient.cardiacStatus && patient.cardiacStatus !== 'normal') prompt += `- Cardiac: ${patient.cardiacStatus}\n`;

        if (patient.allergyCategories?.length) prompt += `- Allergies: ${patient.allergyCategories.join(', ')}\n`;
        if (patient.comorbidityCategories?.length) prompt += `- Comorbidities: ${patient.comorbidityCategories.join(', ')}\n`;

        if (record.interactions?.detectedInteractions?.length) {
            prompt += `\n**Detected Interactions**:\n`;
            record.interactions.detectedInteractions.forEach(i => {
                prompt += `- [${i.severity.toUpperCase()}] ${i.interactionType}: ${i.description}\n`;
            });
        }

        prompt += `\n**Setting**: ${enc.encounterType}`;
        if (enc.specialty) prompt += ` (${enc.specialty})`;
        if (enc.acuityLevel) prompt += ` - ${enc.acuityLevel}`;

        return prompt;
    }
}
