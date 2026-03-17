/**
 * Clinical Decision Support Workflow
 *
 * Comprehensive diagnostic and treatment evaluation with drug interaction validation.
 * Gathers context, evaluates differentials and urgency in parallel, validates dosing,
 * then merges all evidence for final recommendation.
 *
 * Steps:
 * 1. gather-context (sequential) - Load patient data and context
 * 2-4. [PARALLEL] get-differentials, evaluate-urgency, validate-doses - Parallel analysis
 * 5. merge-context (sequential) - Consolidate findings into final recommendation
 *
 * Dependencies:
 * - merge-context depends on ALL prior steps before finalizing
 *
 * Outputs:
 * - patientContext: Clinical context and history
 * - differentials: List of diagnostic possibilities ranked by probability
 * - urgencyLevel: Triage level (RED/AMBER/GREEN)
 * - dosageValidation: Drug interactions and dose appropriateness
 * - finalRecommendation: Consolidated clinical recommendation
 */

import type { WorkflowTemplate } from '../types';

export const clinicalDecisionWorkflow: WorkflowTemplate = {
  id: 'clinical-decision-support',
  name: 'Clinical Decision Support Workflow',
  description: 'Comprehensive diagnostic and treatment evaluation with drug interaction validation',
  category: 'clinical',
  version: '1.0.0',

  requiredInputs: {
    patientId: {
      type: 'string',
      format: 'uuid',
      required: true,
      description: 'Unique patient identifier',
    },
    encounterId: {
      type: 'string',
      format: 'uuid',
      required: true,
      description: 'Encounter context for clinical assessment',
    },
    chief_complaint: {
      type: 'string',
      required: false,
      description: 'Patient chief complaint or presenting symptom',
    },
  },

  steps: [
    {
      id: 'gather-context',
      tool: 'get-patient-context',
      description: 'Load patient demographics, allergies, medications, and medical history',
      inputMapping: {
        patientId: '{{patientId}}',
      },
      timeout: 5000,
    },
    {
      id: 'get-differentials',
      tool: 'get-differential-diagnoses',
      description: 'Generate differential diagnosis list ranked by probability given presenting symptoms',
      inputMapping: {
        patientId: '{{patientId}}',
        encounterId: '{{encounterId}}',
        chiefComplaint: '{{chief_complaint}}',
      },
      dependsOn: ['gather-context'],
      optional: true,
      timeout: 4000,
    },
    {
      id: 'evaluate-urgency',
      tool: 'evaluate-clinical-urgency',
      description: 'Assess clinical urgency level (RED/AMBER/GREEN) based on vital signs and symptoms',
      inputMapping: {
        patientId: '{{patientId}}',
        encounterId: '{{encounterId}}',
      },
      dependsOn: ['gather-context'],
      optional: true,
      timeout: 3000,
    },
    {
      id: 'validate-doses',
      tool: 'validate-medication-doses',
      description: 'Check drug interactions, contraindications, and dose appropriateness',
      inputMapping: {
        patientId: '{{patientId}}',
      },
      dependsOn: ['gather-context'],
      optional: true,
      timeout: 3000,
    },
    {
      id: 'merge-context',
      tool: 'merge-clinical-evidence',
      description: 'Consolidate all evidence streams into final clinical recommendation',
      inputMapping: {
        patientId: '{{patientId}}',
        context: '{{gather-context.result}}',
        differentials: '{{get-differentials.result}}',
        urgency: '{{evaluate-urgency.result}}',
        dosageCheck: '{{validate-doses.result}}',
      },
      dependsOn: ['gather-context', 'get-differentials', 'evaluate-urgency', 'validate-doses'],
      timeout: 5000,
    },
  ],

  outputMapping: {
    patientContext: '{{gather-context.result}}',
    differentials: '{{get-differentials.result}}',
    urgencyLevel: '{{evaluate-urgency.result}}',
    dosageValidation: '{{validate-doses.result}}',
    finalRecommendation: '{{merge-context.result}}',
  },

  parallelGroups: [['get-differentials', 'evaluate-urgency', 'validate-doses']],
};
