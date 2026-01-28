/**
 * Product Enhancement Workflows
 *
 * Pre-defined orchestration workflows for common clinical operations.
 * Use with /api/agent/orchestrate endpoint.
 *
 * Placeholders use {paramName} syntax and are replaced at runtime.
 */

export interface WorkflowTool {
  tool: string;
  args: Record<string, string>;
  id?: string;
}

export interface Workflow {
  name: string;
  description: string;
  mode: 'parallel' | 'sequential';
  tools: WorkflowTool[];
  requiredParams: string[];
}

/**
 * Pre-defined product enhancement workflows
 */
export const PRODUCT_ENHANCEMENT_WORKFLOWS: Record<string, Workflow> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PATIENT ASSESSMENT - Complete patient evaluation in parallel
  // ═══════════════════════════════════════════════════════════════════════════
  'patient-assessment': {
    name: 'Complete Patient Assessment',
    description: 'Fetch patient data, check vitals, labs, and preventive care status in parallel',
    mode: 'parallel',
    requiredParams: ['patientId'],
    tools: [
      { tool: 'get-patient', args: { id: '{patientId}' }, id: 'patient-data' },
      { tool: 'get-patient-medications', args: { id: '{patientId}' }, id: 'medications' },
      { tool: 'get-patient-allergies', args: { id: '{patientId}' }, id: 'allergies' },
      { tool: 'get-patient-diagnoses', args: { id: '{patientId}' }, id: 'diagnoses' },
      { tool: 'get-preventive-care', args: { patientId: '{patientId}' }, id: 'preventive-care' },
      { tool: 'decision-support', args: { patientId: '{patientId}' }, id: 'decision-support' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDICATION SAFETY CHECK - Drug interactions + allergies in parallel
  // ═══════════════════════════════════════════════════════════════════════════
  'medication-check': {
    name: 'Medication Safety Check',
    description: 'Check drug interactions and allergy contraindications for a medication',
    mode: 'parallel',
    requiredParams: ['patientId', 'medications'],
    tools: [
      { tool: 'check-drug-interactions', args: { medications: '{medications}' }, id: 'interactions' },
      { tool: 'check-allergies', args: { patientId: '{patientId}' }, id: 'allergies' },
      { tool: 'get-patient-allergies', args: { id: '{patientId}' }, id: 'patient-allergies' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVENTION PROTOCOL - Full prevention workflow
  // ═══════════════════════════════════════════════════════════════════════════
  'prevention-protocol': {
    name: 'Prevention Protocol Workflow',
    description: 'Get prevention status, screening reminders, and lab alerts for a patient',
    mode: 'parallel',
    requiredParams: ['patientId'],
    tools: [
      { tool: 'get-prevention-hub', args: { patientId: '{patientId}' }, id: 'prevention-hub' },
      { tool: 'get-preventive-care', args: { patientId: '{patientId}' }, id: 'preventive-care' },
      { tool: 'get-lab-alerts', args: { patientId: '{patientId}' }, id: 'lab-alerts' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM COMMUNICATION WORKFLOW - Send form then notify (sequential)
  // ═══════════════════════════════════════════════════════════════════════════
  'form-workflow': {
    name: 'Form Communication Workflow',
    description: 'Send a form to patient and notify them (sequential - notification after form sent)',
    mode: 'sequential',
    requiredParams: ['patientId', 'templateId'],
    tools: [
      { tool: 'send-form', args: { patientId: '{patientId}', templateId: '{templateId}' }, id: 'form-sent' },
      { tool: 'send-reminder', args: { patientId: '{patientId}', type: 'form' }, id: 'reminder-sent' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLINICAL ALERTS - All alert types in parallel
  // ═══════════════════════════════════════════════════════════════════════════
  'clinical-alerts': {
    name: 'Clinical Alerts Check',
    description: 'Check all clinical alert types in parallel',
    mode: 'parallel',
    requiredParams: ['patientId'],
    tools: [
      { tool: 'check-vital-alerts', args: { patientId: '{patientId}' }, id: 'vital-alerts' },
      { tool: 'check-lab-alerts', args: { patientId: '{patientId}' }, id: 'lab-alerts' },
      { tool: 'decision-support', args: { patientId: '{patientId}' }, id: 'decision-support' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSIS WORKFLOW - Symptoms + drug check
  // ═══════════════════════════════════════════════════════════════════════════
  'diagnosis-workflow': {
    name: 'Diagnosis Workflow',
    description: 'Diagnose symptoms and check drug interactions for treatment',
    mode: 'sequential',
    requiredParams: ['symptoms', 'medications'],
    tools: [
      { tool: 'diagnose-symptoms', args: { symptoms: '{symptoms}' }, id: 'diagnosis' },
      { tool: 'check-drug-interactions', args: { medications: '{medications}' }, id: 'drug-check' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GOVERNANCE OVERVIEW - Stats and recent logs
  // ═══════════════════════════════════════════════════════════════════════════
  'governance-overview': {
    name: 'Governance Overview',
    description: 'Get governance statistics and recent audit logs',
    mode: 'parallel',
    requiredParams: [],
    tools: [
      { tool: 'get-governance-stats', args: {}, id: 'stats' },
      { tool: 'get-governance-logs', args: {}, id: 'logs' },
    ],
  },
};

/**
 * Get a workflow by name
 */
export function getWorkflow(name: string): Workflow | undefined {
  return PRODUCT_ENHANCEMENT_WORKFLOWS[name];
}

/**
 * Get all available workflows
 */
export function listWorkflows(): Array<{ name: string; description: string; requiredParams: string[] }> {
  return Object.entries(PRODUCT_ENHANCEMENT_WORKFLOWS).map(([key, workflow]) => ({
    name: key,
    description: workflow.description,
    requiredParams: workflow.requiredParams,
  }));
}

/**
 * Substitute placeholders in workflow tools with actual parameters
 */
export function hydrateWorkflow(
  workflow: Workflow,
  params: Record<string, unknown>
): Array<{ tool: string; arguments: Record<string, unknown>; id?: string }> {
  // Check required params
  for (const param of workflow.requiredParams) {
    if (!(param in params)) {
      throw new Error(`Missing required parameter: ${param}`);
    }
  }

  return workflow.tools.map((tool) => {
    const hydratedArgs: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(tool.args)) {
      if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        const paramName = value.slice(1, -1);
        hydratedArgs[key] = params[paramName];
      } else {
        hydratedArgs[key] = value;
      }
    }

    return {
      tool: tool.tool,
      arguments: hydratedArgs,
      id: tool.id,
    };
  });
}
