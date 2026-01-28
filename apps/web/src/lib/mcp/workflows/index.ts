/**
 * MCP Workflow Templates - Pre-built workflow templates for common clinical operations
 *
 * Workflows define sequences of MCP tool calls that accomplish complex tasks.
 * The agent uses these templates as guides for multi-step operations.
 */

import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult } from '../types';
import { registry } from '../registry';

// =============================================================================
// WORKFLOW TYPES
// =============================================================================

/**
 * A single step in a workflow
 */
export interface WorkflowStep {
    /** The MCP tool to call */
    toolName: string;

    /** Description of what this step accomplishes */
    description: string;

    /** Map previous step outputs to this step's inputs */
    inputMapping?: Record<string, string>;

    /** Whether this step is optional (workflow can continue if it fails) */
    optional?: boolean;

    /** Condition to evaluate before running this step (JSON-Logic style) */
    condition?: Record<string, any>;
}

/**
 * A workflow template defining a sequence of tool calls
 */
export interface WorkflowTemplate {
    /** Unique identifier for the workflow */
    id: string;

    /** Human-readable name */
    name: string;

    /** Description of what this workflow accomplishes */
    description: string;

    /** Ordered list of steps to execute */
    steps: WorkflowStep[];

    /** Workflow category */
    category: 'clinical' | 'administrative' | 'billing';

    /** Required initial inputs for the workflow */
    requiredInputs?: string[];

    /** Estimated time to complete in minutes */
    estimatedDurationMinutes?: number;

    /** Tags for searchability */
    tags?: string[];
}

/**
 * Result of a single workflow step
 */
export interface WorkflowStepResult {
    stepIndex: number;
    toolName: string;
    success: boolean;
    result: MCPResult;
    executionTimeMs: number;
    skipped?: boolean;
    skipReason?: string;
}

/**
 * Result of executing a complete workflow
 */
export interface WorkflowResult {
    workflowId: string;
    success: boolean;
    completedSteps: number;
    totalSteps: number;
    stepResults: WorkflowStepResult[];
    aggregatedData: Record<string, any>;
    totalExecutionTimeMs: number;
    error?: string;
}

// =============================================================================
// WORKFLOW TEMPLATES
// =============================================================================

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    // =========================================================================
    // CLINICAL WORKFLOWS
    // =========================================================================
    {
        id: 'patient_intake',
        name: 'Patient Intake',
        description: 'Complete patient registration flow including demographics, allergies, and initial appointment scheduling',
        category: 'clinical',
        requiredInputs: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'email', 'phone'],
        estimatedDurationMinutes: 10,
        tags: ['registration', 'new-patient', 'intake'],
        steps: [
            {
                toolName: 'create_patient',
                description: 'Register new patient with demographic information',
                inputMapping: {
                    firstName: 'input.firstName',
                    lastName: 'input.lastName',
                    dateOfBirth: 'input.dateOfBirth',
                    gender: 'input.gender',
                    email: 'input.email',
                    phone: 'input.phone',
                    address: 'input.address',
                    city: 'input.city',
                    state: 'input.state',
                    postalCode: 'input.postalCode',
                },
            },
            {
                toolName: 'create_allergy',
                description: 'Record patient allergies if any',
                optional: true,
                inputMapping: {
                    patientId: 'steps[0].result.data.patientId',
                    allergen: 'input.allergen',
                    allergyType: 'input.allergyType',
                    severity: 'input.severity',
                    reactions: 'input.reactions',
                },
            },
            {
                toolName: 'get_available_slots',
                description: 'Check available appointment slots',
                inputMapping: {
                    clinicianId: 'context.clinicianId',
                    date: 'input.preferredDate',
                },
            },
            {
                toolName: 'create_appointment_record',
                description: 'Schedule initial appointment',
                inputMapping: {
                    patientId: 'steps[0].result.data.patientId',
                    clinicianId: 'context.clinicianId',
                    dateTime: 'input.appointmentDateTime',
                    duration: 'input.appointmentDuration',
                    type: 'CHECKUP',
                    reason: 'New patient intake',
                },
            },
        ],
    },
    {
        id: 'clinical_encounter',
        name: 'Clinical Encounter Documentation',
        description: 'Complete documentation for a patient visit including notes, diagnoses, and medication orders',
        category: 'clinical',
        requiredInputs: ['patientId'],
        estimatedDurationMinutes: 15,
        tags: ['encounter', 'visit', 'documentation', 'soap'],
        steps: [
            {
                toolName: 'get_patient',
                description: 'Retrieve patient information and medical history',
                inputMapping: {
                    patientId: 'input.patientId',
                },
            },
            {
                toolName: 'create_clinical_note',
                description: 'Create SOAP note for the encounter',
                inputMapping: {
                    patientId: 'input.patientId',
                    noteType: 'SOAP',
                    chiefComplaint: 'input.chiefComplaint',
                    subjective: 'input.subjective',
                    objective: 'input.objective',
                    assessment: 'input.assessment',
                    plan: 'input.plan',
                },
            },
            {
                toolName: 'create_diagnosis',
                description: 'Record diagnosis with ICD-10 code',
                optional: true,
                inputMapping: {
                    patientId: 'input.patientId',
                    code: 'input.diagnosisCode',
                    description: 'input.diagnosisDescription',
                    type: 'input.diagnosisType',
                },
            },
            {
                toolName: 'create_medication_draft',
                description: 'Create medication order if needed',
                optional: true,
                inputMapping: {
                    patientId: 'input.patientId',
                    medicationName: 'input.medicationName',
                    dosage: 'input.dosage',
                    frequency: 'input.frequency',
                    route: 'input.route',
                    instructions: 'input.medicationInstructions',
                },
            },
        ],
    },
    {
        id: 'lab_order_workflow',
        name: 'Lab Order and Results Review',
        description: 'Order lab panels and review results when available',
        category: 'clinical',
        requiredInputs: ['patientId', 'panelCode'],
        estimatedDurationMinutes: 5,
        tags: ['lab', 'order', 'results', 'diagnostic'],
        steps: [
            {
                toolName: 'get_lab_panel_definitions',
                description: 'Get available lab panel information',
                inputMapping: {
                    panelCode: 'input.panelCode',
                },
            },
            {
                toolName: 'create_lab_order',
                description: 'Place the lab order',
                inputMapping: {
                    patientId: 'input.patientId',
                    panelCode: 'input.panelCode',
                    priority: 'input.priority',
                    fasting: 'input.fasting',
                    indication: 'input.indication',
                },
            },
            {
                toolName: 'get_lab_results_raw',
                description: 'Retrieve lab results when available',
                optional: true,
                inputMapping: {
                    patientId: 'input.patientId',
                    orderId: 'steps[1].result.data.orderId',
                },
            },
        ],
    },
    {
        id: 'medication_safety_workflow',
        name: 'Medication Prescribing with Safety Check',
        description: 'Safely prescribe medication with interaction and contraindication checks',
        category: 'clinical',
        requiredInputs: ['patientId', 'medicationName', 'dosage', 'frequency'],
        estimatedDurationMinutes: 5,
        tags: ['medication', 'prescription', 'safety', 'interactions'],
        steps: [
            {
                toolName: 'get_patient',
                description: 'Get patient data including current medications and allergies',
                inputMapping: {
                    patientId: 'input.patientId',
                },
            },
            {
                toolName: 'get_interaction_data',
                description: 'Check for drug-drug interactions',
                inputMapping: {
                    medications: 'input.medicationsToCheck',
                },
            },
            {
                toolName: 'match_contraindications',
                description: 'Check for contraindications against patient conditions',
                inputMapping: {
                    patientId: 'input.patientId',
                    proposedMedication: 'input.medicationName',
                },
            },
            {
                toolName: 'create_medication_draft',
                description: 'Create the medication order',
                inputMapping: {
                    patientId: 'input.patientId',
                    medicationName: 'input.medicationName',
                    dosage: 'input.dosage',
                    frequency: 'input.frequency',
                    route: 'input.route',
                    instructions: 'input.instructions',
                    indication: 'input.indication',
                },
            },
        ],
    },
    {
        id: 'prescription_fulfillment',
        name: 'Prescription Fulfillment',
        description: 'Complete prescription workflow from creation to pharmacy transmission',
        category: 'clinical',
        requiredInputs: ['patientId', 'medicationName'],
        estimatedDurationMinutes: 8,
        tags: ['prescription', 'pharmacy', 'fulfillment', 'e-prescribe'],
        steps: [
            {
                toolName: 'create_medication_draft',
                description: 'Create medication order',
                inputMapping: {
                    patientId: 'input.patientId',
                    medicationName: 'input.medicationName',
                    dosage: 'input.dosage',
                    frequency: 'input.frequency',
                    route: 'input.route',
                    instructions: 'input.instructions',
                },
            },
            {
                toolName: 'list_prescriptions',
                description: 'Get prescription status',
                inputMapping: {
                    patientId: 'input.patientId',
                    status: 'PENDING',
                },
            },
            {
                toolName: 'send_to_pharmacy',
                description: 'Send prescription to pharmacy',
                inputMapping: {
                    prescriptionId: 'input.prescriptionId',
                    pharmacyId: 'input.pharmacyId',
                    deliveryMethod: 'input.deliveryMethod',
                },
            },
            {
                toolName: 'get_prescription_status',
                description: 'Verify prescription was transmitted',
                inputMapping: {
                    prescriptionId: 'input.prescriptionId',
                },
            },
        ],
    },
    // =========================================================================
    // ADMINISTRATIVE WORKFLOWS
    // =========================================================================
    {
        id: 'appointment_management',
        name: 'Appointment Management',
        description: 'Schedule, reschedule, or cancel patient appointments with notifications',
        category: 'administrative',
        requiredInputs: ['patientId'],
        estimatedDurationMinutes: 5,
        tags: ['appointment', 'scheduling', 'calendar'],
        steps: [
            {
                toolName: 'get_patient_appointments',
                description: 'Get existing appointments for the patient',
                inputMapping: {
                    patientId: 'input.patientId',
                },
            },
            {
                toolName: 'get_clinician_schedule',
                description: 'Get clinician availability',
                inputMapping: {
                    clinicianId: 'context.clinicianId',
                    startDate: 'input.startDate',
                    endDate: 'input.endDate',
                },
            },
            {
                toolName: 'get_available_slots',
                description: 'Find available time slots',
                inputMapping: {
                    clinicianId: 'context.clinicianId',
                    date: 'input.preferredDate',
                    slotDuration: 'input.duration',
                },
            },
            {
                toolName: 'create_appointment_record',
                description: 'Create the appointment',
                inputMapping: {
                    patientId: 'input.patientId',
                    clinicianId: 'context.clinicianId',
                    dateTime: 'input.selectedDateTime',
                    duration: 'input.duration',
                    type: 'input.appointmentType',
                    reason: 'input.reason',
                },
            },
        ],
    },
    {
        id: 'care_team_communication',
        name: 'Care Team Communication',
        description: 'Create conversation threads for care coordination',
        category: 'administrative',
        requiredInputs: ['patientId', 'participantIds', 'title'],
        estimatedDurationMinutes: 3,
        tags: ['messaging', 'communication', 'care-team', 'coordination'],
        steps: [
            {
                toolName: 'create_conversation',
                description: 'Create a new care team conversation',
                inputMapping: {
                    patientId: 'input.patientId',
                    title: 'input.title',
                    description: 'input.description',
                    participantIds: 'input.participantIds',
                },
            },
            {
                toolName: 'create_message',
                description: 'Send initial message to the conversation',
                inputMapping: {
                    conversationId: 'steps[0].result.data.conversationId',
                    content: 'input.initialMessage',
                    messageType: 'TEXT',
                },
            },
        ],
    },
    // =========================================================================
    // BILLING WORKFLOWS
    // =========================================================================
    {
        id: 'insurance_verification',
        name: 'Insurance Verification',
        description: 'Verify patient insurance coverage and benefits before service',
        category: 'billing',
        requiredInputs: ['patientId'],
        estimatedDurationMinutes: 5,
        tags: ['insurance', 'verification', 'eligibility', 'benefits'],
        steps: [
            {
                toolName: 'get_patient_insurance_info',
                description: 'Get patient insurance record',
                inputMapping: {
                    patientId: 'input.patientId',
                },
            },
            {
                toolName: 'get_raw_insurance_data',
                description: 'Get detailed insurance coverage data',
                inputMapping: {
                    patientId: 'input.patientId',
                    serviceDate: 'input.serviceDate',
                },
            },
            {
                toolName: 'get_procedure_fees',
                description: 'Get procedure fee schedule',
                optional: true,
                inputMapping: {
                    procedureCodes: 'input.procedureCodes',
                    facilityType: 'input.facilityType',
                },
            },
        ],
    },
    {
        id: 'claim_submission',
        name: 'Claim Submission',
        description: 'Submit insurance claim for completed encounter',
        category: 'billing',
        requiredInputs: ['patientId', 'encounterId', 'diagnosisCodes', 'procedureCodes'],
        estimatedDurationMinutes: 10,
        tags: ['billing', 'claims', 'insurance', 'reimbursement'],
        steps: [
            {
                toolName: 'get_patient_insurance_info',
                description: 'Verify patient has active insurance',
                inputMapping: {
                    patientId: 'input.patientId',
                },
            },
            {
                toolName: 'get_procedure_fees',
                description: 'Get procedure fees for claim',
                inputMapping: {
                    procedureCodes: 'input.procedureCodes',
                    facilityType: 'input.facilityType',
                },
            },
            {
                toolName: 'submit_claim',
                description: 'Submit the insurance claim',
                inputMapping: {
                    patientId: 'input.patientId',
                    encounterId: 'input.encounterId',
                    diagnosisCodes: 'input.diagnosisCodes',
                    procedureCodes: 'input.procedureCodes',
                    serviceDate: 'input.serviceDate',
                    placeOfService: 'input.placeOfService',
                },
            },
            {
                toolName: 'get_claim_status',
                description: 'Verify claim was submitted',
                inputMapping: {
                    claimId: 'steps[2].result.data.claimId',
                },
            },
        ],
    },
];

// =============================================================================
// WORKFLOW FUNCTIONS
// =============================================================================

/**
 * Get all available workflow templates
 */
export function getWorkflowTemplates(): WorkflowTemplate[] {
    return WORKFLOW_TEMPLATES;
}

/**
 * Get workflow templates by category
 */
export function getWorkflowsByCategory(category: 'clinical' | 'administrative' | 'billing'): WorkflowTemplate[] {
    return WORKFLOW_TEMPLATES.filter(w => w.category === category);
}

/**
 * Get a workflow template by ID
 */
export function getWorkflowById(id: string): WorkflowTemplate | undefined {
    return WORKFLOW_TEMPLATES.find(w => w.id === id);
}

/**
 * Search workflows by name, description, or tags
 */
export function searchWorkflows(query: string): WorkflowTemplate[] {
    const lowerQuery = query.toLowerCase();
    return WORKFLOW_TEMPLATES.filter(w =>
        w.name.toLowerCase().includes(lowerQuery) ||
        w.description.toLowerCase().includes(lowerQuery) ||
        w.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Resolve input mapping from context and previous step results
 */
function resolveInputMapping(
    mapping: Record<string, string>,
    context: MCPContext,
    initialInputs: Record<string, any>,
    stepResults: WorkflowStepResult[]
): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, path] of Object.entries(mapping)) {
        let value: any;

        if (path.startsWith('input.')) {
            // Get from initial inputs
            const inputKey = path.slice(6);
            value = initialInputs[inputKey];
        } else if (path.startsWith('context.')) {
            // Get from context
            const contextKey = path.slice(8);
            value = (context as any)[contextKey];
        } else if (path.startsWith('steps[')) {
            // Get from previous step results
            const match = path.match(/steps\[(\d+)\]\.(.+)/);
            if (match) {
                const stepIndex = parseInt(match[1], 10);
                const resultPath = match[2];
                const stepResult = stepResults[stepIndex];
                if (stepResult && stepResult.success) {
                    // Navigate the path (e.g., "result.data.patientId")
                    value = resultPath.split('.').reduce((obj, key) => obj?.[key], stepResult as any);
                }
            }
        }

        if (value !== undefined) {
            resolved[key] = value;
        }
    }

    return resolved;
}

/**
 * Execute a workflow template
 */
export async function executeWorkflow(
    workflowId: string,
    context: MCPContext,
    initialInputs: Record<string, any>
): Promise<WorkflowResult> {
    const startTime = Date.now();
    const workflow = getWorkflowById(workflowId);

    if (!workflow) {
        return {
            workflowId,
            success: false,
            completedSteps: 0,
            totalSteps: 0,
            stepResults: [],
            aggregatedData: {},
            totalExecutionTimeMs: Date.now() - startTime,
            error: `Workflow '${workflowId}' not found`,
        };
    }

    logger.info({
        event: 'workflow_started',
        workflowId,
        workflowName: workflow.name,
        stepCount: workflow.steps.length,
        agentId: context.agentId,
    });

    const stepResults: WorkflowStepResult[] = [];
    const aggregatedData: Record<string, any> = { ...initialInputs };
    let success = true;

    for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepStartTime = Date.now();

        // Resolve input mapping
        const resolvedInputs = step.inputMapping
            ? resolveInputMapping(step.inputMapping, context, initialInputs, stepResults)
            : initialInputs;

        // Check if tool exists
        const tool = registry.getToolByName(step.toolName);
        if (!tool) {
            if (step.optional) {
                stepResults.push({
                    stepIndex: i,
                    toolName: step.toolName,
                    success: false,
                    result: { success: false, data: null, error: `Tool '${step.toolName}' not found` },
                    executionTimeMs: 0,
                    skipped: true,
                    skipReason: 'Tool not found',
                });
                continue;
            }

            logger.error({
                event: 'workflow_step_failed',
                workflowId,
                stepIndex: i,
                toolName: step.toolName,
                error: `Tool '${step.toolName}' not found`,
            });

            success = false;
            stepResults.push({
                stepIndex: i,
                toolName: step.toolName,
                success: false,
                result: { success: false, data: null, error: `Tool '${step.toolName}' not found` },
                executionTimeMs: Date.now() - stepStartTime,
            });
            break;
        }

        // Execute the tool
        try {
            const response = await registry.executeTool({
                tool: step.toolName,
                input: resolvedInputs,
                context,
            });

            stepResults.push({
                stepIndex: i,
                toolName: step.toolName,
                success: response.success,
                result: response.result,
                executionTimeMs: response.executionTimeMs,
            });

            // Aggregate data from successful steps
            if (response.success && response.result.data) {
                aggregatedData[`step${i}_${step.toolName}`] = response.result.data;
            }

            // Handle step failure
            if (!response.success && !step.optional) {
                logger.warn({
                    event: 'workflow_step_failed',
                    workflowId,
                    stepIndex: i,
                    toolName: step.toolName,
                    error: response.result.error,
                });
                success = false;
                break;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (step.optional) {
                stepResults.push({
                    stepIndex: i,
                    toolName: step.toolName,
                    success: false,
                    result: { success: false, data: null, error: errorMessage },
                    executionTimeMs: Date.now() - stepStartTime,
                    skipped: true,
                    skipReason: errorMessage,
                });
                continue;
            }

            logger.error({
                event: 'workflow_step_error',
                workflowId,
                stepIndex: i,
                toolName: step.toolName,
                error: errorMessage,
            });

            success = false;
            stepResults.push({
                stepIndex: i,
                toolName: step.toolName,
                success: false,
                result: { success: false, data: null, error: errorMessage },
                executionTimeMs: Date.now() - stepStartTime,
            });
            break;
        }
    }

    const totalExecutionTimeMs = Date.now() - startTime;
    const completedSteps = stepResults.filter(r => r.success).length;

    logger.info({
        event: 'workflow_completed',
        workflowId,
        success,
        completedSteps,
        totalSteps: workflow.steps.length,
        totalExecutionTimeMs,
        agentId: context.agentId,
    });

    return {
        workflowId,
        success,
        completedSteps,
        totalSteps: workflow.steps.length,
        stepResults,
        aggregatedData,
        totalExecutionTimeMs,
    };
}

/**
 * Get workflow schemas for agent discovery
 */
export function getWorkflowSchemas(): Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    steps: Array<{
        toolName: string;
        description: string;
        optional?: boolean;
    }>;
    requiredInputs?: string[];
    tags?: string[];
}> {
    return WORKFLOW_TEMPLATES.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        category: w.category,
        steps: w.steps.map(s => ({
            toolName: s.toolName,
            description: s.description,
            optional: s.optional,
        })),
        requiredInputs: w.requiredInputs,
        tags: w.tags,
    }));
}
