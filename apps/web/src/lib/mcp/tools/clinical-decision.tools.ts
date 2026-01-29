/**
 * MCP Clinical Decision Support Tools
 *
 * Tools for clinical decision support capabilities including:
 * - Drug interaction checking
 * - Allergy interaction checking
 * - Vital sign alerts
 * - Lab result alerts
 * - Differential diagnosis generation
 * - Preventive care gap analysis
 * - Clinical risk score calculation
 * - Clinical reminders
 * - Order validation
 * - AI-powered care suggestions
 *
 * These tools integrate with existing clinical services and API routes
 * for HIPAA-compliant clinical decision support.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';
import { checkDrugInteractions } from '@/lib/openfda/drug-interactions';
import { calculateASCVDRisk, getASCVDAssessment, type ASCVDInputs } from '@/lib/risk-scores/ascvd';
import { calculateDiabetesRisk, getDiabetesScreeningRecommendation, type DiabetesRiskInputs } from '@/lib/risk-scores/diabetes';
import { symptomDiagnosisEngine } from '@/lib/clinical/engines/symptom-diagnosis-engine';
import type { SymptomInput, PatientContext } from '@holilabs/shared-types';

// =============================================================================
// SCHEMAS
// =============================================================================

const CheckDrugInteractionsSchema = z.object({
    medications: z.array(z.string()).min(2).describe('Array of medication names to check for interactions (minimum 2)'),
    patientId: z.string().optional().describe('Optional: Patient ID to also check against their current medications'),
});

const CheckAllergyInteractionsSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    medications: z.array(z.string()).describe('Array of medication names to check against patient allergies'),
});

const GetVitalAlertsSchema = z.object({
    patientId: z.string().optional().describe('Patient ID to fetch vitals from database'),
    patientAge: z.number().optional().describe('Patient age for context-specific ranges'),
    vitals: z.object({
        systolicBP: z.number().optional().describe('Systolic blood pressure (mmHg)'),
        diastolicBP: z.number().optional().describe('Diastolic blood pressure (mmHg)'),
        heartRate: z.number().optional().describe('Heart rate (bpm)'),
        respiratoryRate: z.number().optional().describe('Respiratory rate (breaths/min)'),
        temperature: z.number().optional().describe('Temperature (Celsius)'),
        oxygenSaturation: z.number().optional().describe('SpO2 (%)'),
        weight: z.number().optional().describe('Weight (kg)'),
        height: z.number().optional().describe('Height (cm)'),
    }).optional().describe('Vitals to check (if not fetching from database)'),
});

const GetLabAlertsSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    days: z.number().min(1).max(365).default(30).describe('Number of days of lab results to check'),
    labResults: z.array(z.object({
        testName: z.string(),
        value: z.number(),
        unit: z.string().optional(),
    })).optional().describe('Optional: Specific lab results to check'),
});

const GenerateDifferentialDiagnosisSchema = z.object({
    patientId: z.string().optional().describe('Optional: Patient ID for context'),
    age: z.number().describe('Patient age'),
    sex: z.enum(['M', 'F', 'O']).describe('Patient sex'),
    chiefComplaint: z.string().describe('Primary symptom or reason for visit'),
    symptoms: z.array(z.string()).describe('Array of symptoms'),
    duration: z.string().optional().describe('Duration of symptoms (e.g., "3 days", "2 weeks")'),
    severity: z.enum(['mild', 'moderate', 'severe']).optional().describe('Symptom severity'),
    medicalHistory: z.array(z.string()).optional().describe('Relevant medical history'),
    medications: z.array(z.string()).optional().describe('Current medications'),
    allergies: z.array(z.string()).optional().describe('Known allergies'),
});

const GetPreventiveCareGapsSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    patientAge: z.number().optional().describe('Patient age (will be calculated if not provided)'),
    patientGender: z.enum(['M', 'F']).optional().describe('Patient gender (will be fetched if not provided)'),
    conditions: z.array(z.string()).optional().describe('Patient conditions for condition-specific screenings'),
});

const CalculateRiskScoresSchema = z.object({
    patientId: z.string().optional().describe('Patient ID to fetch data from database'),
    riskTypes: z.array(z.enum(['ascvd', 'diabetes', 'all'])).default(['all']).describe('Types of risk scores to calculate'),
    // ASCVD inputs
    age: z.number().optional().describe('Patient age (40-79 for ASCVD)'),
    gender: z.enum(['male', 'female']).optional().describe('Patient gender'),
    race: z.enum(['white', 'african_american', 'other']).optional().describe('Race for ASCVD calculation'),
    totalCholesterol: z.number().optional().describe('Total cholesterol (mg/dL)'),
    hdlCholesterol: z.number().optional().describe('HDL cholesterol (mg/dL)'),
    systolicBP: z.number().optional().describe('Systolic blood pressure (mmHg)'),
    bpTreated: z.boolean().optional().describe('On hypertension treatment'),
    diabetic: z.boolean().optional().describe('Has diabetes'),
    smoker: z.boolean().optional().describe('Current smoker'),
    // Diabetes inputs
    familyHistory: z.boolean().optional().describe('Family history of diabetes'),
    hypertension: z.boolean().optional().describe('Has hypertension'),
    physicalActivity: z.boolean().optional().describe('Regular physical activity (30+ min/day)'),
    bmi: z.number().optional().describe('Body mass index (kg/m2)'),
    gestationalDiabetes: z.boolean().optional().describe('History of gestational diabetes (females)'),
});

const GetClinicalRemindersSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    includePreventive: z.boolean().default(true).describe('Include preventive care reminders'),
    includeFollowUp: z.boolean().default(true).describe('Include follow-up reminders'),
    includeMedication: z.boolean().default(true).describe('Include medication-related reminders'),
    limit: z.number().min(1).max(50).default(20).describe('Maximum reminders to return'),
});

const ValidateOrderSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    orderType: z.enum(['medication', 'lab', 'imaging', 'referral']).describe('Type of order'),
    orderDetails: z.object({
        // Medication order
        medication: z.string().optional(),
        dose: z.string().optional(),
        frequency: z.string().optional(),
        route: z.string().optional(),
        // Lab order
        labTests: z.array(z.string()).optional(),
        // Imaging order
        imagingType: z.string().optional(),
        bodyPart: z.string().optional(),
        indication: z.string().optional(),
        // Referral
        specialty: z.string().optional(),
        reason: z.string().optional(),
    }).describe('Order details based on order type'),
});

const GetCareSuggestionsSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    context: z.enum(['encounter', 'review', 'follow-up', 'preventive']).default('encounter').describe('Context for suggestions'),
    includeAI: z.boolean().default(true).describe('Include AI-generated suggestions'),
    focusAreas: z.array(z.string()).optional().describe('Specific focus areas (e.g., "diabetes", "cardiovascular")'),
});

// =============================================================================
// VITAL SIGN NORMAL RANGES
// =============================================================================

const VITAL_RANGES = {
    adult: {
        systolicBP: { min: 90, max: 120, criticalLow: 70, criticalHigh: 180 },
        diastolicBP: { min: 60, max: 80, criticalLow: 40, criticalHigh: 120 },
        heartRate: { min: 60, max: 100, criticalLow: 40, criticalHigh: 150 },
        respiratoryRate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 30 },
        temperature: { min: 36.1, max: 37.2, criticalLow: 35, criticalHigh: 40 },
        oxygenSaturation: { min: 95, max: 100, criticalLow: 88, criticalHigh: 100 },
    },
};

// =============================================================================
// HANDLERS
// =============================================================================

// CHECK DRUG INTERACTIONS
async function checkDrugInteractionsHandler(
    input: z.infer<typeof CheckDrugInteractionsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        let medications = [...input.medications];

        // If patientId provided, add their current medications
        if (input.patientId) {
            const patientMeds = await prisma.medication.findMany({
                where: { patientId: input.patientId, isActive: true },
                select: { name: true },
            });
            const patientMedNames = patientMeds.map(m => m.name);
            medications = [...new Set([...medications, ...patientMedNames])];
        }

        if (medications.length < 2) {
            return {
                success: true,
                data: {
                    interactions: [],
                    medicationsChecked: medications,
                    message: 'At least 2 medications required to check interactions',
                },
            };
        }

        // Use OpenFDA drug interaction service
        const interactions = await checkDrugInteractions(medications);

        logger.info({
            event: 'drug_interactions_checked',
            medicationCount: medications.length,
            interactionCount: interactions.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                interactions: interactions.map(i => ({
                    drug1: i.drug1,
                    drug2: i.drug2,
                    severity: i.severity,
                    description: i.description,
                    source: i.source,
                })),
                medicationsChecked: medications,
                hasInteractions: interactions.length > 0,
                severeInteractions: interactions.filter(i => i.severity === 'high').length,
                moderateInteractions: interactions.filter(i => i.severity === 'moderate').length,
                recommendations: interactions
                    .filter(i => i.severity === 'high')
                    .map(i => `ALERT: ${i.drug1} + ${i.drug2} - ${i.description}`),
            },
        };
    } catch (error) {
        logger.error({ event: 'check_drug_interactions_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check drug interactions',
            data: null,
        };
    }
}

// CHECK ALLERGY INTERACTIONS
async function checkAllergyInteractionsHandler(
    input: z.infer<typeof CheckAllergyInteractionsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Get patient allergies
        const allergies = await prisma.allergy.findMany({
            where: { patientId: input.patientId, isActive: true },
            select: {
                id: true,
                allergen: true,
                allergyType: true,
                severity: true,
                reactions: true,
            },
        });

        if (allergies.length === 0) {
            return {
                success: true,
                data: {
                    alerts: [],
                    allergiesOnFile: 0,
                    medicationsChecked: input.medications,
                    hasConflicts: false,
                    message: 'No allergies on file for this patient',
                },
            };
        }

        const alerts: any[] = [];

        // Check each medication against allergies
        for (const medication of input.medications) {
            const medLower = medication.toLowerCase();

            for (const allergy of allergies) {
                const allergenLower = allergy.allergen.toLowerCase();

                // Direct match or class match
                const isMatch = medLower.includes(allergenLower) ||
                    allergenLower.includes(medLower) ||
                    checkDrugClassMatch(medication, allergy.allergen);

                if (isMatch) {
                    const isCritical = allergy.severity === 'SEVERE';

                    alerts.push({
                        id: `allergy-alert-${allergy.id}-${medication}`,
                        type: isCritical ? 'critical' : 'warning',
                        medication,
                        allergen: allergy.allergen,
                        severity: allergy.severity,
                        reactions: allergy.reactions,
                        title: isCritical
                            ? `CRITICAL: ${medication} contraindicated - ${allergy.allergen} allergy`
                            : `Warning: ${medication} may interact with ${allergy.allergen} allergy`,
                        recommendation: isCritical
                            ? 'DO NOT prescribe. Consider alternative medication.'
                            : 'Use with caution. Monitor for allergic reactions.',
                        actionRequired: isCritical,
                    });
                }
            }
        }

        logger.info({
            event: 'allergy_interactions_checked',
            patientId: input.patientId,
            medicationCount: input.medications.length,
            allergyCount: allergies.length,
            alertCount: alerts.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                alerts,
                allergiesOnFile: allergies.length,
                medicationsChecked: input.medications,
                hasConflicts: alerts.length > 0,
                criticalAlerts: alerts.filter(a => a.type === 'critical').length,
                warningAlerts: alerts.filter(a => a.type === 'warning').length,
            },
        };
    } catch (error) {
        logger.error({ event: 'check_allergy_interactions_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check allergy interactions',
            data: null,
        };
    }
}

// Drug class matching helper
function checkDrugClassMatch(medication: string, allergen: string): boolean {
    const drugClasses: Record<string, string[]> = {
        'penicillin': ['amoxicillin', 'ampicillin', 'piperacillin', 'oxacillin', 'nafcillin'],
        'sulfa': ['sulfamethoxazole', 'sulfasalazine', 'sulfonamide', 'bactrim', 'septra'],
        'cephalosporin': ['cefazolin', 'ceftriaxone', 'cephalexin', 'cefuroxime', 'cefdinir'],
        'nsaid': ['ibuprofen', 'naproxen', 'aspirin', 'diclofenac', 'meloxicam', 'ketorolac'],
        'opioid': ['morphine', 'codeine', 'hydrocodone', 'oxycodone', 'fentanyl', 'tramadol'],
        'ace inhibitor': ['lisinopril', 'enalapril', 'captopril', 'ramipril', 'benazepril'],
        'statin': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin'],
    };

    const medLower = medication.toLowerCase();
    const allergenLower = allergen.toLowerCase();

    for (const [className, members] of Object.entries(drugClasses)) {
        if (allergenLower.includes(className) || members.some(m => allergenLower.includes(m))) {
            if (members.some(m => medLower.includes(m)) || medLower.includes(className)) {
                return true;
            }
        }
    }

    return false;
}

// GET VITAL ALERTS
async function getVitalAlertsHandler(
    input: z.infer<typeof GetVitalAlertsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        let vitals = input.vitals;
        let patientAge = input.patientAge;

        // Fetch vitals from database if patientId provided and no vitals given
        if (input.patientId && !vitals) {
            const patient = await prisma.patient.findUnique({
                where: { id: input.patientId },
                select: {
                    dateOfBirth: true,
                },
            });

            // Get most recent vital signs for this patient
            const latestVitalSign = await prisma.vitalSign.findFirst({
                where: { patientId: input.patientId },
                orderBy: { recordedAt: 'desc' },
            });

            if (patient) {
                patientAge = patient.dateOfBirth
                    ? Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : undefined;

                if (latestVitalSign) {
                    vitals = {
                        systolicBP: latestVitalSign.systolicBP ?? undefined,
                        diastolicBP: latestVitalSign.diastolicBP ?? undefined,
                        heartRate: latestVitalSign.heartRate ?? undefined,
                        respiratoryRate: latestVitalSign.respiratoryRate ?? undefined,
                        temperature: latestVitalSign.temperature ?? undefined,
                        oxygenSaturation: latestVitalSign.oxygenSaturation ?? undefined,
                        weight: latestVitalSign.weight ?? undefined,
                        height: latestVitalSign.height ?? undefined,
                    };
                }
            }
        }

        if (!vitals) {
            return {
                success: true,
                data: {
                    alerts: [],
                    message: 'No vitals provided or found in database',
                },
            };
        }

        const alerts: any[] = [];
        const ranges = VITAL_RANGES.adult;

        // Check each vital sign
        if (vitals.systolicBP !== undefined) {
            const alert = checkVitalRange('Systolic BP', vitals.systolicBP, ranges.systolicBP, 'mmHg');
            if (alert) alerts.push(alert);
        }

        if (vitals.diastolicBP !== undefined) {
            const alert = checkVitalRange('Diastolic BP', vitals.diastolicBP, ranges.diastolicBP, 'mmHg');
            if (alert) alerts.push(alert);
        }

        if (vitals.heartRate !== undefined) {
            const alert = checkVitalRange('Heart Rate', vitals.heartRate, ranges.heartRate, 'bpm');
            if (alert) alerts.push(alert);
        }

        if (vitals.respiratoryRate !== undefined) {
            const alert = checkVitalRange('Respiratory Rate', vitals.respiratoryRate, ranges.respiratoryRate, '/min');
            if (alert) alerts.push(alert);
        }

        if (vitals.temperature !== undefined) {
            const alert = checkVitalRange('Temperature', vitals.temperature, ranges.temperature, 'C');
            if (alert) alerts.push(alert);
        }

        if (vitals.oxygenSaturation !== undefined) {
            const alert = checkVitalRange('SpO2', vitals.oxygenSaturation, ranges.oxygenSaturation, '%');
            if (alert) alerts.push(alert);
        }

        logger.info({
            event: 'vital_alerts_generated',
            patientId: input.patientId,
            alertCount: alerts.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                alerts,
                vitalsChecked: vitals,
                patientAge,
                hasAbnormalities: alerts.length > 0,
                criticalAlerts: alerts.filter(a => a.type === 'critical').length,
                warningAlerts: alerts.filter(a => a.type === 'warning').length,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_vital_alerts_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get vital alerts',
            data: null,
        };
    }
}

// Helper to check vital range
function checkVitalRange(
    name: string,
    value: number,
    range: { min: number; max: number; criticalLow?: number; criticalHigh?: number },
    unit: string
): any | null {
    let deviation: string | null = null;
    let type: 'critical' | 'warning' = 'warning';

    if (range.criticalLow && value < range.criticalLow) {
        deviation = 'critical_low';
        type = 'critical';
    } else if (range.criticalHigh && value > range.criticalHigh) {
        deviation = 'critical_high';
        type = 'critical';
    } else if (value < range.min) {
        deviation = 'low';
    } else if (value > range.max) {
        deviation = 'high';
    }

    if (!deviation) return null;

    return {
        id: `vital-${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
        type,
        vitalSign: name,
        value,
        unit,
        normalRange: `${range.min}-${range.max}`,
        deviation,
        title: type === 'critical'
            ? `CRITICAL: ${name} ${deviation.includes('low') ? 'dangerously low' : 'dangerously high'}`
            : `${name} ${deviation === 'low' ? 'below' : 'above'} normal`,
        message: `${name}: ${value} ${unit} (Normal: ${range.min}-${range.max} ${unit})`,
        recommendation: getVitalRecommendation(name, deviation),
        actionRequired: type === 'critical',
        priority: type === 'critical' ? 'high' : 'medium',
    };
}

function getVitalRecommendation(name: string, deviation: string): string {
    const recommendations: Record<string, Record<string, string>> = {
        'Systolic BP': {
            critical_high: 'URGENT: Severe hypertension. Check for end-organ damage. Consider IV antihypertensives.',
            critical_low: 'URGENT: Hypotension. Assess for shock. IV fluids, vasopressors if needed.',
            high: 'Elevated blood pressure. Recheck in 5 minutes. Consider medication adjustment.',
            low: 'Low blood pressure. Assess symptoms. Review medications.',
        },
        'Heart Rate': {
            critical_high: 'URGENT: Severe tachycardia. ECG, assess stability. Consider rate control.',
            critical_low: 'URGENT: Severe bradycardia. ECG, assess stability. Consider atropine/pacing.',
            high: 'Tachycardia. Assess for fever, anxiety, dehydration, pain.',
            low: 'Bradycardia. Review medications (beta-blockers). Consider ECG.',
        },
        'SpO2': {
            critical_low: 'URGENT: Severe hypoxemia. Supplemental oxygen. Assess airway. Consider intubation.',
            low: 'Hypoxemia. Apply supplemental oxygen. Assess respiratory status.',
        },
        'Temperature': {
            critical_high: 'URGENT: Hyperthermia. Cooling measures. Assess for heat stroke or malignant hyperthermia.',
            critical_low: 'URGENT: Hypothermia. Active rewarming. Monitor cardiac rhythm.',
            high: 'Fever. Assess for infection. Consider antipyretics.',
            low: 'Hypothermia. Passive rewarming. Assess cause.',
        },
    };

    return recommendations[name]?.[deviation] ||
        `Abnormal ${name}. Clinical assessment recommended.`;
}

// GET LAB ALERTS
async function getLabAlertsHandler(
    input: z.infer<typeof GetLabAlertsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        let labResults = input.labResults;

        // Fetch from database if not provided
        if (!labResults) {
            const recentLabs = await prisma.labResult.findMany({
                where: {
                    patientId: input.patientId,
                    resultDate: {
                        gte: new Date(Date.now() - input.days * 24 * 60 * 60 * 1000),
                    },
                },
                orderBy: { resultDate: 'desc' },
                take: 50,
            });

            labResults = recentLabs.map(lab => ({
                testName: lab.testName,
                value: typeof lab.value === 'number' ? lab.value : parseFloat(String(lab.value)),
                unit: lab.unit || undefined,
            }));
        }

        if (!labResults || labResults.length === 0) {
            return {
                success: true,
                data: {
                    alerts: [],
                    labsChecked: 0,
                    hasAbnormalities: false,
                    message: 'No lab results found to check',
                },
            };
        }

        // Lab reference ranges (simplified - production would use more comprehensive database)
        const labRanges: Record<string, { min: number; max: number; criticalLow?: number; criticalHigh?: number; unit: string }> = {
            'Sodium': { min: 136, max: 145, criticalLow: 120, criticalHigh: 160, unit: 'mEq/L' },
            'Potassium': { min: 3.5, max: 5.0, criticalLow: 2.5, criticalHigh: 6.5, unit: 'mEq/L' },
            'Glucose': { min: 70, max: 100, criticalLow: 40, criticalHigh: 400, unit: 'mg/dL' },
            'Creatinine': { min: 0.7, max: 1.3, criticalHigh: 10, unit: 'mg/dL' },
            'Hemoglobin': { min: 13.5, max: 17.5, criticalLow: 7, unit: 'g/dL' },
            'WBC': { min: 4.5, max: 11, criticalLow: 2, criticalHigh: 30, unit: 'K/uL' },
            'Platelets': { min: 150, max: 400, criticalLow: 50, criticalHigh: 1000, unit: 'K/uL' },
            'Troponin': { min: 0, max: 0.04, criticalHigh: 0.04, unit: 'ng/mL' },
            'HbA1c': { min: 4, max: 5.6, unit: '%' },
        };

        const alerts: any[] = [];

        for (const lab of labResults) {
            const range = labRanges[lab.testName];
            if (!range || isNaN(lab.value)) continue;

            let deviation: string | null = null;
            let type: 'critical' | 'warning' = 'warning';

            if (range.criticalLow && lab.value < range.criticalLow) {
                deviation = 'critical_low';
                type = 'critical';
            } else if (range.criticalHigh && lab.value > range.criticalHigh) {
                deviation = 'critical_high';
                type = 'critical';
            } else if (lab.value < range.min) {
                deviation = 'low';
            } else if (lab.value > range.max) {
                deviation = 'high';
            }

            if (deviation) {
                alerts.push({
                    id: `lab-${lab.testName}-${Date.now()}`,
                    type,
                    labTest: lab.testName,
                    value: lab.value,
                    unit: range.unit,
                    normalRange: `${range.min}-${range.max}`,
                    deviation,
                    title: type === 'critical'
                        ? `CRITICAL: ${lab.testName} ${deviation.includes('low') ? 'critically low' : 'critically high'}`
                        : `${lab.testName} ${deviation === 'low' ? 'below' : 'above'} normal`,
                    message: `${lab.testName}: ${lab.value} ${range.unit} (Normal: ${range.min}-${range.max})`,
                    actionRequired: type === 'critical',
                    priority: type === 'critical' ? 'high' : 'medium',
                });
            }
        }

        logger.info({
            event: 'lab_alerts_generated',
            patientId: input.patientId,
            labsChecked: labResults.length,
            alertCount: alerts.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                alerts,
                labsChecked: labResults.length,
                hasAbnormalities: alerts.length > 0,
                criticalAlerts: alerts.filter(a => a.type === 'critical').length,
                warningAlerts: alerts.filter(a => a.type === 'warning').length,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_lab_alerts_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get lab alerts',
            data: null,
        };
    }
}

// GENERATE DIFFERENTIAL DIAGNOSIS
async function generateDifferentialDiagnosisHandler(
    input: z.infer<typeof GenerateDifferentialDiagnosisSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Build symptom input for engine
        const symptomInput: SymptomInput = {
            chiefComplaint: input.chiefComplaint,
            duration: input.duration,
            severity: input.severity,
            associatedSymptoms: input.symptoms,
        };

        // Build patient context
        const patientContext: PatientContext = {
            patientId: input.patientId || 'anonymous',
            age: input.age,
            sex: input.sex === 'O' ? 'O' : input.sex,
            diagnoses: input.medicalHistory?.map((condition, idx) => ({
                id: `hist_${idx}`,
                icd10Code: 'Z87.89',
                name: condition,
                clinicalStatus: 'ACTIVE' as const,
            })) || [],
            medications: input.medications?.map((med, idx) => ({
                id: `med_${idx}`,
                name: med,
                status: 'ACTIVE' as const,
            })) || [],
            allergies: input.allergies?.map((allergy, idx) => ({
                id: `allergy_${idx}`,
                allergen: allergy,
                type: 'OTHER' as const,
                severity: 'moderate' as const,
                status: 'ACTIVE' as const,
            })) || [],
        };

        // Use the symptom diagnosis engine
        const result = await symptomDiagnosisEngine.evaluate(symptomInput, patientContext);

        logger.info({
            event: 'differential_diagnosis_generated',
            patientId: input.patientId,
            chiefComplaint: input.chiefComplaint,
            method: result.method,
            differentialCount: result.data.differentials.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                differentials: result.data.differentials.map(d => ({
                    name: d.name,
                    icd10Code: d.icd10Code,
                    probability: d.probability,
                    probabilityLevel: d.probability >= 0.6 ? 'high' : d.probability >= 0.3 ? 'moderate' : 'low',
                    reasoning: d.reasoning,
                    redFlags: d.redFlags,
                    workupSuggestions: d.workupSuggestions,
                })),
                urgency: result.data.urgency,
                processingMethod: result.method,
                confidence: result.confidence,
                fallbackReason: result.fallbackReason,
                clinicalNote: result.data.urgency === 'emergent'
                    ? 'EMERGENT: Consider immediate emergency evaluation'
                    : result.data.urgency === 'urgent'
                        ? 'URGENT: Expedited clinical evaluation recommended'
                        : 'Routine clinical evaluation recommended',
            },
        };
    } catch (error) {
        logger.error({ event: 'generate_differential_diagnosis_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate differential diagnosis',
            data: null,
        };
    }
}

// GET PREVENTIVE CARE GAPS
async function getPreventiveCareGapsHandler(
    input: z.infer<typeof GetPreventiveCareGapsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Get patient data if needed
        let patientAge = input.patientAge;
        let patientGender = input.patientGender;

        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: {
                dateOfBirth: true,
                gender: true,
                lastMammogram: true,
                lastColonoscopy: true,
                lastPapSmear: true,
                lastProstateScreening: true,
                lastCholesterolTest: true,
                lastHbA1c: true,
                lastBloodPressureCheck: true,
            },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        if (!patientAge && patient.dateOfBirth) {
            patientAge = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }

        if (!patientGender) {
            patientGender = patient.gender?.toLowerCase() === 'female' || patient.gender?.toLowerCase() === 'f' ? 'F' : 'M';
        }

        // Get existing reminders
        const existingReminders = await prisma.preventiveCareReminder.findMany({
            where: {
                patientId: input.patientId,
                status: { in: ['DUE', 'OVERDUE', 'SCHEDULED'] },
            },
        });

        const gaps: any[] = [];
        const now = new Date();

        // Check screening gaps based on age and gender
        if (patientGender === 'F' && patientAge && patientAge >= 50 && patientAge <= 74) {
            const lastMammogram = patient.lastMammogram;
            const monthsSinceLastMammogram = lastMammogram
                ? Math.floor((now.getTime() - lastMammogram.getTime()) / (30 * 24 * 60 * 60 * 1000))
                : null;

            if (!monthsSinceLastMammogram || monthsSinceLastMammogram >= 24) {
                gaps.push({
                    screening: 'Mammogram',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'B',
                    priority: 'HIGH',
                    lastCompleted: lastMammogram?.toISOString() || 'Never',
                    recommendedFrequency: 'Every 2 years',
                    overdue: monthsSinceLastMammogram ? monthsSinceLastMammogram >= 24 : true,
                    recommendation: 'Schedule mammogram screening for breast cancer detection',
                });
            }
        }

        if (patientGender === 'F' && patientAge && patientAge >= 21 && patientAge <= 65) {
            const lastPap = patient.lastPapSmear;
            const monthsSinceLastPap = lastPap
                ? Math.floor((now.getTime() - lastPap.getTime()) / (30 * 24 * 60 * 60 * 1000))
                : null;

            if (!monthsSinceLastPap || monthsSinceLastPap >= 36) {
                gaps.push({
                    screening: 'Pap Smear',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'A',
                    priority: 'HIGH',
                    lastCompleted: lastPap?.toISOString() || 'Never',
                    recommendedFrequency: 'Every 3 years',
                    overdue: monthsSinceLastPap ? monthsSinceLastPap >= 36 : true,
                    recommendation: 'Schedule cervical cancer screening',
                });
            }
        }

        if (patientAge && patientAge >= 45 && patientAge <= 75) {
            const lastColonoscopy = patient.lastColonoscopy;
            const yearsSinceLastColonoscopy = lastColonoscopy
                ? Math.floor((now.getTime() - lastColonoscopy.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                : null;

            if (!yearsSinceLastColonoscopy || yearsSinceLastColonoscopy >= 10) {
                gaps.push({
                    screening: 'Colonoscopy',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'A',
                    priority: 'HIGH',
                    lastCompleted: lastColonoscopy?.toISOString() || 'Never',
                    recommendedFrequency: 'Every 10 years',
                    overdue: yearsSinceLastColonoscopy ? yearsSinceLastColonoscopy >= 10 : true,
                    recommendation: 'Schedule colorectal cancer screening',
                });
            }
        }

        if (patientAge && patientAge >= 40 && patientAge <= 75) {
            const lastCholesterol = patient.lastCholesterolTest;
            const monthsSinceLastCholesterol = lastCholesterol
                ? Math.floor((now.getTime() - lastCholesterol.getTime()) / (30 * 24 * 60 * 60 * 1000))
                : null;

            if (!monthsSinceLastCholesterol || monthsSinceLastCholesterol >= 60) {
                gaps.push({
                    screening: 'Lipid Panel',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'B',
                    priority: 'MEDIUM',
                    lastCompleted: lastCholesterol?.toISOString() || 'Never',
                    recommendedFrequency: 'Every 5 years',
                    overdue: monthsSinceLastCholesterol ? monthsSinceLastCholesterol >= 60 : true,
                    recommendation: 'Schedule cardiovascular risk assessment',
                });
            }
        }

        logger.info({
            event: 'preventive_care_gaps_checked',
            patientId: input.patientId,
            gapsFound: gaps.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                patientAge,
                patientGender,
                gaps,
                gapsCount: gaps.length,
                existingRemindersCount: existingReminders.length,
                highPriorityGaps: gaps.filter(g => g.priority === 'HIGH').length,
                overdueCount: gaps.filter(g => g.overdue).length,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_preventive_care_gaps_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get preventive care gaps',
            data: null,
        };
    }
}

// CALCULATE RISK SCORES
async function calculateRiskScoresHandler(
    input: z.infer<typeof CalculateRiskScoresSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const results: any = {};
        const calculateAll = input.riskTypes.includes('all');

        // ASCVD Risk Score
        if (calculateAll || input.riskTypes.includes('ascvd')) {
            try {
                const ascvdInputs: ASCVDInputs = {
                    age: input.age || 50,
                    gender: input.gender || 'male',
                    race: input.race || 'white',
                    totalCholesterol: input.totalCholesterol || 200,
                    hdlCholesterol: input.hdlCholesterol || 50,
                    systolicBP: input.systolicBP || 120,
                    bpTreated: input.bpTreated || false,
                    diabetic: input.diabetic || false,
                    smoker: input.smoker || false,
                };

                // Validate ASCVD age range
                if (ascvdInputs.age >= 40 && ascvdInputs.age <= 79) {
                    const ascvdResult = getASCVDAssessment(ascvdInputs);
                    results.ascvd = {
                        tenYearRisk: ascvdResult.tenYearRisk,
                        riskPercentage: ascvdResult.riskPercentage,
                        category: ascvdResult.category,
                        recommendation: ascvdResult.recommendation,
                        uspstfGrade: ascvdResult.uspstfGrade,
                        lifetimeRisk: ascvdResult.lifetimeRisk,
                        inputs: ascvdInputs,
                    };
                } else {
                    results.ascvd = {
                        error: 'ASCVD calculator valid for ages 40-79',
                        age: ascvdInputs.age,
                    };
                }
            } catch (e) {
                results.ascvd = { error: e instanceof Error ? e.message : 'Failed to calculate ASCVD' };
            }
        }

        // Diabetes Risk Score
        if (calculateAll || input.riskTypes.includes('diabetes')) {
            try {
                const diabetesInputs: DiabetesRiskInputs = {
                    age: input.age || 50,
                    gender: input.gender || 'male',
                    familyHistory: input.familyHistory || false,
                    hypertension: input.hypertension || false,
                    physicalActivity: input.physicalActivity || true,
                    bmi: input.bmi || 25,
                    gestationalDiabetes: input.gestationalDiabetes,
                };

                const diabetesResult = calculateDiabetesRisk(diabetesInputs);
                const screeningRec = getDiabetesScreeningRecommendation(diabetesInputs);

                results.diabetes = {
                    score: diabetesResult.score,
                    risk: diabetesResult.risk,
                    riskPercentage: diabetesResult.riskPercentage,
                    category: diabetesResult.category,
                    recommendation: diabetesResult.recommendation,
                    nextSteps: diabetesResult.nextSteps,
                    screeningRecommendation: screeningRec,
                    inputs: diabetesInputs,
                };
            } catch (e) {
                results.diabetes = { error: e instanceof Error ? e.message : 'Failed to calculate diabetes risk' };
            }
        }

        // Store risk scores if patient ID provided
        if (input.patientId) {
            try {
                if (results.ascvd && !results.ascvd.error) {
                    await prisma.riskScore.create({
                        data: {
                            patientId: input.patientId,
                            riskType: 'ASCVD',
                            algorithmVersion: 'ACC-AHA-2013',
                            score: results.ascvd.tenYearRisk,
                            scorePercentage: results.ascvd.riskPercentage, // String type
                            category: results.ascvd.category,
                            inputData: results.ascvd.inputs as any,
                            recommendation: results.ascvd.recommendation || 'See clinical guidelines',
                        },
                    });
                }

                if (results.diabetes && !results.diabetes.error) {
                    await prisma.riskScore.create({
                        data: {
                            patientId: input.patientId,
                            riskType: 'DIABETES',
                            algorithmVersion: 'ADA-2009',
                            score: results.diabetes.score,
                            scorePercentage: `${(results.diabetes.risk * 100).toFixed(1)}%`, // String type
                            category: results.diabetes.category,
                            inputData: results.diabetes.inputs as any,
                            recommendation: results.diabetes.recommendation || 'See clinical guidelines',
                        },
                    });
                }
            } catch (e) {
                logger.warn({ event: 'risk_score_store_failed', error: e });
            }
        }

        logger.info({
            event: 'risk_scores_calculated',
            patientId: input.patientId,
            riskTypes: Object.keys(results),
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                riskScores: results,
                calculatedAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'calculate_risk_scores_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to calculate risk scores',
            data: null,
        };
    }
}

// GET CLINICAL REMINDERS
async function getClinicalRemindersHandler(
    input: z.infer<typeof GetClinicalRemindersSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const reminders: any[] = [];
        const now = new Date();

        // Get preventive care reminders
        if (input.includePreventive) {
            const preventiveReminders = await prisma.preventiveCareReminder.findMany({
                where: {
                    patientId: input.patientId,
                    status: { in: ['DUE', 'OVERDUE'] },
                },
                orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
                take: input.limit,
            });

            for (const reminder of preventiveReminders) {
                const isOverdue = reminder.dueDate < now;
                reminders.push({
                    id: reminder.id,
                    type: 'preventive',
                    title: reminder.title,
                    description: reminder.description,
                    screeningType: reminder.screeningType,
                    dueDate: reminder.dueDate.toISOString(),
                    priority: reminder.priority,
                    status: isOverdue ? 'OVERDUE' : 'DUE',
                    guidelineSource: reminder.guidelineSource,
                });
            }
        }

        // Get follow-up reminders (from appointments that need follow-up)
        if (input.includeFollowUp) {
            const upcomingAppointments = await prisma.appointment.findMany({
                where: {
                    patientId: input.patientId,
                    startTime: {
                        gte: now,
                        lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
                    },
                    status: { in: ['SCHEDULED', 'CONFIRMED'] },
                },
                orderBy: { startTime: 'asc' },
                take: 10,
                select: {
                    id: true,
                    type: true,
                    startTime: true,
                    title: true,
                    description: true,
                },
            });

            for (const appointment of upcomingAppointments) {
                reminders.push({
                    id: `followup-${appointment.id}`,
                    type: 'follow_up',
                    title: `Upcoming: ${appointment.title || appointment.type || 'Appointment'}`,
                    description: appointment.description || 'Scheduled appointment',
                    dueDate: appointment.startTime.toISOString(),
                    priority: 'MEDIUM',
                    status: 'DUE',
                    appointmentId: appointment.id,
                });
            }
        }

        // Get medication-related reminders
        if (input.includeMedication) {
            const medications = await prisma.medication.findMany({
                where: {
                    patientId: input.patientId,
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    endDate: true,
                    prescriptionId: true,
                },
            });

            for (const med of medications) {
                // Check for medications ending soon
                if (med.endDate) {
                    const daysUntilEnd = Math.floor((med.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                    if (daysUntilEnd <= 14 && daysUntilEnd >= 0) {
                        reminders.push({
                            id: `ending-${med.id}`,
                            type: 'medication',
                            title: `Medication ending: ${med.name}`,
                            description: `Ends in ${daysUntilEnd} day(s)`,
                            dueDate: med.endDate.toISOString(),
                            priority: daysUntilEnd <= 7 ? 'HIGH' : 'MEDIUM',
                            status: 'DUE',
                            medicationId: med.id,
                        });
                    }
                }
            }

            // Check for prescriptions needing refills
            const prescriptions = await prisma.prescription.findMany({
                where: {
                    patientId: input.patientId,
                    status: { in: ['SIGNED', 'FILLED'] },
                    refillsRemaining: { lte: 1 },
                },
                select: {
                    id: true,
                    medications: true,
                    refillsRemaining: true,
                },
            });

            for (const rx of prescriptions) {
                const medNames = (rx.medications as any[])?.map(m => m.name || m.medication).join(', ') || 'Prescription';
                reminders.push({
                    id: `refill-${rx.id}`,
                    type: 'medication',
                    title: `Low refills: ${medNames}`,
                    description: `Only ${rx.refillsRemaining} refill(s) remaining`,
                    priority: rx.refillsRemaining === 0 ? 'HIGH' : 'MEDIUM',
                    status: 'DUE',
                    prescriptionId: rx.id,
                });
            }
        }

        // Sort by priority and due date
        reminders.sort((a, b) => {
            const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, URGENT: -1 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
            if (aPriority !== bPriority) return aPriority - bPriority;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            return 0;
        });

        logger.info({
            event: 'clinical_reminders_fetched',
            patientId: input.patientId,
            reminderCount: reminders.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                reminders: reminders.slice(0, input.limit),
                totalCount: reminders.length,
                overdueCount: reminders.filter(r => r.status === 'OVERDUE').length,
                byType: {
                    preventive: reminders.filter(r => r.type === 'preventive').length,
                    followUp: reminders.filter(r => r.type === 'follow_up').length,
                    medication: reminders.filter(r => r.type === 'medication').length,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_clinical_reminders_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get clinical reminders',
            data: null,
        };
    }
}

// VALIDATE ORDER
async function validateOrderHandler(
    input: z.infer<typeof ValidateOrderSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const validationResults: any = {
            isValid: true,
            warnings: [],
            errors: [],
            recommendations: [],
        };

        // Get patient data for validation
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            include: {
                allergies: { where: { isActive: true } },
                medications: { where: { isActive: true } },
                diagnoses: { where: { status: 'ACTIVE' } },
            },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        // Validate based on order type
        switch (input.orderType) {
            case 'medication':
                if (input.orderDetails.medication) {
                    // Check allergy interactions
                    const allergyConflicts = patient.allergies.filter(allergy => {
                        const allergenLower = allergy.allergen.toLowerCase();
                        const medLower = input.orderDetails.medication!.toLowerCase();
                        return allergenLower.includes(medLower) || medLower.includes(allergenLower) ||
                            checkDrugClassMatch(input.orderDetails.medication!, allergy.allergen);
                    });

                    if (allergyConflicts.length > 0) {
                        validationResults.isValid = false;
                        validationResults.errors.push({
                            type: 'allergy_conflict',
                            message: `Patient has allergy to ${allergyConflicts.map(a => a.allergen).join(', ')}`,
                            severity: 'critical',
                        });
                    }

                    // Check drug interactions
                    const currentMedNames = patient.medications.map(m => m.name);
                    if (currentMedNames.length > 0) {
                        const interactions = await checkDrugInteractions([input.orderDetails.medication, ...currentMedNames]);
                        const severeInteractions = interactions.filter(i => i.severity === 'high');

                        if (severeInteractions.length > 0) {
                            validationResults.warnings.push({
                                type: 'drug_interaction',
                                message: `Potential severe interactions: ${severeInteractions.map(i => `${i.drug1}+${i.drug2}`).join(', ')}`,
                                severity: 'high',
                                details: severeInteractions,
                            });
                        }
                    }
                }
                break;

            case 'lab':
                if (input.orderDetails.labTests) {
                    // Check for recent lab results (to detect duplicate orders)
                    const recentLabResults = await prisma.labResult.findMany({
                        where: {
                            patientId: input.patientId,
                            resultDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                        },
                        select: { testName: true },
                    });

                    for (const test of input.orderDetails.labTests) {
                        const isDuplicate = recentLabResults.some(lab =>
                            lab.testName.toLowerCase().includes(test.toLowerCase())
                        );

                        if (isDuplicate) {
                            validationResults.warnings.push({
                                type: 'duplicate_order',
                                message: `${test} was performed within the last 7 days`,
                                severity: 'medium',
                            });
                        }
                    }
                }
                break;

            case 'imaging':
                if (input.orderDetails.imagingType) {
                    // Check for recent imaging studies
                    const recentImaging = await prisma.imagingStudy.findMany({
                        where: {
                            patientId: input.patientId,
                            studyDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                            modality: input.orderDetails.imagingType,
                        },
                    });

                    if (recentImaging.length > 0) {
                        validationResults.warnings.push({
                            type: 'recent_imaging',
                            message: `Similar imaging (${input.orderDetails.imagingType}) performed within last 30 days`,
                            severity: 'medium',
                        });
                    }

                    // Check for pregnancy if applicable
                    const patientGender = patient.gender?.toLowerCase();
                    if ((patientGender === 'female' || patientGender === 'f') &&
                        ['CT', 'X-Ray', 'Fluoroscopy', 'XR', 'CT'].includes(input.orderDetails.imagingType)) {
                        validationResults.recommendations.push({
                            type: 'pregnancy_check',
                            message: 'Consider pregnancy test before radiation-based imaging in female patient',
                        });
                    }
                }
                break;

            case 'referral':
                if (!input.orderDetails.reason) {
                    validationResults.warnings.push({
                        type: 'missing_reason',
                        message: 'Referral reason not specified - may delay authorization',
                        severity: 'low',
                    });
                }
                break;
        }

        logger.info({
            event: 'order_validated',
            patientId: input.patientId,
            orderType: input.orderType,
            isValid: validationResults.isValid,
            warningCount: validationResults.warnings.length,
            errorCount: validationResults.errors.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                orderType: input.orderType,
                orderDetails: input.orderDetails,
                validation: validationResults,
            },
        };
    } catch (error) {
        logger.error({ event: 'validate_order_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to validate order',
            data: null,
        };
    }
}

// GET CARE SUGGESTIONS
async function getCareSuggestionsHandler(
    input: z.infer<typeof GetCareSuggestionsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const suggestions: any[] = [];

        // Get patient data
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            include: {
                diagnoses: { where: { status: 'ACTIVE' } },
                medications: { where: { isActive: true } },
                allergies: { where: { isActive: true } },
                riskScores: { orderBy: { calculatedAt: 'desc' }, take: 5 },
                preventionPlans: { where: { status: 'ACTIVE' } },
            },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        const age = patient.dateOfBirth
            ? Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null;

        // Generate suggestions based on context
        // Diagnosis-based suggestions
        for (const diagnosis of patient.diagnoses) {
            const conditionLower = diagnosis.description?.toLowerCase() || '';

            if (conditionLower.includes('diabetes') || conditionLower.includes('dm')) {
                suggestions.push({
                    category: 'chronic_disease_management',
                    condition: 'Diabetes',
                    title: 'Diabetes Care Checklist',
                    suggestions: [
                        'Review HbA1c (last 3 months)',
                        'Check for retinopathy (annual dilated eye exam)',
                        'Monitor kidney function (annual urine albumin)',
                        'Assess foot health and neuropathy',
                        'Update lipid panel if > 1 year',
                    ],
                    priority: 'HIGH',
                    evidenceSource: 'ADA Standards of Care 2024',
                });
            }

            if (conditionLower.includes('hypertension') || conditionLower.includes('htn')) {
                suggestions.push({
                    category: 'chronic_disease_management',
                    condition: 'Hypertension',
                    title: 'Hypertension Management',
                    suggestions: [
                        'Verify BP at target (<130/80 for most adults)',
                        'Review medication adherence',
                        'Assess for secondary causes if resistant',
                        'Check renal function and electrolytes',
                        'Discuss lifestyle modifications',
                    ],
                    priority: 'HIGH',
                    evidenceSource: 'AHA/ACC Hypertension Guidelines',
                });
            }

            if (conditionLower.includes('heart failure') || conditionLower.includes('chf')) {
                suggestions.push({
                    category: 'chronic_disease_management',
                    condition: 'Heart Failure',
                    title: 'Heart Failure Management',
                    suggestions: [
                        'Optimize GDMT (ACEi/ARB/ARNI, beta-blocker, MRA, SGLT2i)',
                        'Monitor weight and fluid status',
                        'Review BNP/NT-proBNP trends',
                        'Assess functional status and symptoms',
                        'Consider device therapy if EF remains low',
                    ],
                    priority: 'HIGH',
                    evidenceSource: 'AHA/ACC Heart Failure Guidelines',
                });
            }
        }

        // Risk score-based suggestions
        for (const riskScore of patient.riskScores) {
            if (riskScore.riskType === 'ASCVD' && riskScore.score && riskScore.score >= 0.075) {
                suggestions.push({
                    category: 'risk_reduction',
                    riskType: 'Cardiovascular',
                    title: 'Cardiovascular Risk Reduction',
                    suggestions: [
                        `10-year ASCVD risk: ${(riskScore.score * 100).toFixed(1)}% (${riskScore.category})`,
                        riskScore.score >= 0.20 ? 'High-intensity statin indicated' : 'Consider moderate-intensity statin',
                        'Target LDL < 70-100 mg/dL based on risk',
                        'Optimize blood pressure control',
                        'Emphasize lifestyle modifications',
                    ],
                    priority: riskScore.score >= 0.20 ? 'HIGH' : 'MEDIUM',
                    evidenceSource: 'AHA/ACC Cardiovascular Prevention Guidelines',
                });
            }

            if (riskScore.riskType === 'DIABETES' && riskScore.score && riskScore.score >= 5) {
                suggestions.push({
                    category: 'risk_reduction',
                    riskType: 'Diabetes',
                    title: 'Diabetes Prevention',
                    suggestions: [
                        `Diabetes risk score: ${riskScore.score} (${riskScore.category})`,
                        'Consider referral to Diabetes Prevention Program',
                        'Screen with fasting glucose or HbA1c',
                        'Counsel on weight loss (5-7% body weight)',
                        'Encourage 150 min/week physical activity',
                    ],
                    priority: riskScore.score >= 8 ? 'HIGH' : 'MEDIUM',
                    evidenceSource: 'ADA Diabetes Prevention Guidelines',
                });
            }
        }

        // Age-based preventive suggestions
        if (age) {
            if (age >= 50 && age <= 75) {
                suggestions.push({
                    category: 'preventive_care',
                    title: 'Cancer Screening',
                    suggestions: [
                        'Colorectal cancer screening (colonoscopy or alternatives)',
                        age >= 55 ? 'Lung cancer screening if smoking history (20+ pack-years)' : null,
                    ].filter(Boolean),
                    priority: 'MEDIUM',
                    evidenceSource: 'USPSTF',
                });
            }

            if (age >= 65) {
                suggestions.push({
                    category: 'preventive_care',
                    title: 'Geriatric Care',
                    suggestions: [
                        'Annual wellness visit',
                        'Falls risk assessment',
                        'Cognitive screening consideration',
                        'Review medication list for polypharmacy',
                        'Ensure vaccinations up to date (flu, pneumococcal, shingles)',
                    ],
                    priority: 'MEDIUM',
                    evidenceSource: 'AGS/BGS Guidelines',
                });
            }
        }

        // Polypharmacy check
        if (patient.medications.length >= 5) {
            suggestions.push({
                category: 'medication_safety',
                title: 'Polypharmacy Review',
                suggestions: [
                    `Patient on ${patient.medications.length} medications`,
                    'Review for drug-drug interactions',
                    'Assess for inappropriate medications (Beers criteria if elderly)',
                    'Consider deprescribing opportunities',
                    'Verify all medications still indicated',
                ],
                priority: patient.medications.length >= 10 ? 'HIGH' : 'MEDIUM',
                evidenceSource: 'Medication Safety Best Practices',
            });
        }

        // Filter by focus areas if specified
        let filteredSuggestions = suggestions;
        if (input.focusAreas && input.focusAreas.length > 0) {
            filteredSuggestions = suggestions.filter(s =>
                input.focusAreas!.some(area =>
                    s.category.toLowerCase().includes(area.toLowerCase()) ||
                    s.title.toLowerCase().includes(area.toLowerCase()) ||
                    (s.condition && s.condition.toLowerCase().includes(area.toLowerCase()))
                )
            );
        }

        // Sort by priority
        filteredSuggestions.sort((a, b) => {
            const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2) -
                (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2);
        });

        logger.info({
            event: 'care_suggestions_generated',
            patientId: input.patientId,
            context: input.context,
            suggestionCount: filteredSuggestions.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                patientAge: age,
                context: input.context,
                suggestions: filteredSuggestions,
                totalSuggestions: filteredSuggestions.length,
                highPrioritySuggestions: filteredSuggestions.filter(s => s.priority === 'HIGH').length,
                activeDiagnoses: patient.diagnoses.length,
                activeMedications: patient.medications.length,
                generatedAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'get_care_suggestions_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get care suggestions',
            data: null,
        };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const clinicalDecisionTools: MCPTool[] = [
    {
        name: 'check_drug_interactions',
        description: 'Check for drug-drug interactions between medications. Uses OpenFDA API and local interaction database for comprehensive checking.',
        category: 'clinical-decision',
        inputSchema: CheckDrugInteractionsSchema,
        requiredPermissions: ['patient:read', 'medication:read'],
        handler: checkDrugInteractionsHandler,
        examples: [
            {
                description: 'Check interactions between warfarin and aspirin',
                input: {
                    medications: ['warfarin', 'aspirin'],
                },
                expectedOutput: 'Returns interaction details with severity and recommendations',
            },
        ],
    },
    {
        name: 'check_allergy_interactions',
        description: 'Check medications against patient allergies to identify contraindications and potential allergic reactions.',
        category: 'clinical-decision',
        inputSchema: CheckAllergyInteractionsSchema,
        requiredPermissions: ['patient:read', 'medication:read'],
        handler: checkAllergyInteractionsHandler,
        examples: [
            {
                description: 'Check if amoxicillin is safe for a patient with penicillin allergy',
                input: {
                    patientId: 'patient-123',
                    medications: ['amoxicillin'],
                },
                expectedOutput: 'Returns allergy conflict alert with severity',
            },
        ],
    },
    {
        name: 'get_vital_alerts',
        description: 'Get alerts for abnormal vital signs. Checks against age-appropriate normal ranges and identifies critical values.',
        category: 'clinical-decision',
        inputSchema: GetVitalAlertsSchema,
        requiredPermissions: ['patient:read'],
        handler: getVitalAlertsHandler,
        examples: [
            {
                description: 'Check vital signs for abnormalities',
                input: {
                    vitals: {
                        systolicBP: 180,
                        diastolicBP: 110,
                        heartRate: 95,
                        oxygenSaturation: 92,
                    },
                },
                expectedOutput: 'Returns alerts for elevated BP and low oxygen saturation',
            },
        ],
    },
    {
        name: 'get_lab_alerts',
        description: 'Get alerts for critical or abnormal lab values. Checks recent lab results against reference ranges.',
        category: 'clinical-decision',
        inputSchema: GetLabAlertsSchema,
        requiredPermissions: ['patient:read'],
        handler: getLabAlertsHandler,
        examples: [
            {
                description: 'Check for abnormal lab values in last 30 days',
                input: {
                    patientId: 'patient-123',
                    days: 30,
                },
                expectedOutput: 'Returns list of abnormal lab values with severity',
            },
        ],
    },
    {
        name: 'generate_differential_diagnosis',
        description: 'Generate differential diagnosis from symptoms using AI with deterministic fallback. Includes red flags and workup suggestions.',
        category: 'clinical-decision',
        inputSchema: GenerateDifferentialDiagnosisSchema,
        requiredPermissions: ['patient:read', 'ai:read'],
        handler: generateDifferentialDiagnosisHandler,
        examples: [
            {
                description: 'Generate differential for chest pain',
                input: {
                    age: 55,
                    sex: 'M',
                    chiefComplaint: 'chest pain',
                    symptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
                    severity: 'severe',
                },
                expectedOutput: 'Returns differential diagnoses with probabilities and urgency level',
            },
        ],
    },
    {
        name: 'get_preventive_care_gaps',
        description: 'Get missing preventive care items based on patient age, gender, and conditions. Uses USPSTF guidelines.',
        category: 'prevention',
        inputSchema: GetPreventiveCareGapsSchema,
        requiredPermissions: ['patient:read', 'prevention:read'],
        handler: getPreventiveCareGapsHandler,
        examples: [
            {
                description: 'Check preventive care gaps for a 55-year-old female',
                input: {
                    patientId: 'patient-123',
                    patientAge: 55,
                    patientGender: 'F',
                },
                expectedOutput: 'Returns list of due/overdue screenings',
            },
        ],
    },
    {
        name: 'calculate_risk_scores',
        description: 'Calculate clinical risk scores including 10-year ASCVD risk and diabetes risk with treatment recommendations.',
        category: 'clinical-decision',
        inputSchema: CalculateRiskScoresSchema,
        requiredPermissions: ['patient:read'],
        handler: calculateRiskScoresHandler,
        examples: [
            {
                description: 'Calculate cardiovascular risk',
                input: {
                    age: 55,
                    gender: 'male',
                    totalCholesterol: 220,
                    hdlCholesterol: 45,
                    systolicBP: 140,
                    bpTreated: true,
                    diabetic: false,
                    smoker: true,
                },
                expectedOutput: 'Returns ASCVD 10-year risk with statin recommendations',
            },
        ],
    },
    {
        name: 'get_clinical_reminders',
        description: 'Get clinical reminders for a patient including preventive care, follow-ups, and medication alerts.',
        category: 'clinical-decision',
        inputSchema: GetClinicalRemindersSchema,
        requiredPermissions: ['patient:read', 'prevention:read'],
        handler: getClinicalRemindersHandler,
        examples: [
            {
                description: 'Get all clinical reminders for a patient',
                input: {
                    patientId: 'patient-123',
                    includePreventive: true,
                    includeFollowUp: true,
                    includeMedication: true,
                },
                expectedOutput: 'Returns prioritized list of clinical reminders',
            },
        ],
    },
    {
        name: 'validate_order',
        description: 'Validate a clinical order (medication, lab, imaging, referral) for safety and appropriateness.',
        category: 'clinical-decision',
        inputSchema: ValidateOrderSchema,
        requiredPermissions: ['patient:read', 'medication:read'],
        handler: validateOrderHandler,
        examples: [
            {
                description: 'Validate a medication order for a patient with allergies',
                input: {
                    patientId: 'patient-123',
                    orderType: 'medication',
                    orderDetails: {
                        medication: 'amoxicillin',
                        dose: '500mg',
                        frequency: 'TID',
                    },
                },
                expectedOutput: 'Returns validation result with any warnings or errors',
            },
        ],
    },
    {
        name: 'get_care_suggestions',
        description: 'Get AI-powered care suggestions based on patient conditions, risk scores, and clinical guidelines.',
        category: 'clinical-decision',
        inputSchema: GetCareSuggestionsSchema,
        requiredPermissions: ['patient:read', 'ai:read'],
        handler: getCareSuggestionsHandler,
        examples: [
            {
                description: 'Get care suggestions for a diabetic patient',
                input: {
                    patientId: 'patient-123',
                    context: 'encounter',
                    focusAreas: ['diabetes'],
                },
                expectedOutput: 'Returns prioritized care suggestions with evidence sources',
            },
        ],
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const CLINICAL_DECISION_TOOL_COUNT = clinicalDecisionTools.length;
