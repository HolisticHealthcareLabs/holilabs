/**
 * Prevention Screening Workflow
 *
 * Evaluates a patient for preventive care gaps and health maintenance opportunities.
 * Runs vital checks, lab reviews, and preventive care recommendations in parallel
 * after gathering initial patient context.
 *
 * Steps:
 * 1. gather-context (sequential) - Load patient demographics and history
 * 2-4. [PARALLEL] check-vitals, check-labs, check-preventive - Evaluate gaps
 *
 * Outputs:
 * - patientContext: Patient demographics and medical history
 * - vitalAlerts: Vital sign abnormalities
 * - labAlerts: Out-of-range lab values
 * - preventiveGaps: Missing screenings and preventive care
 */

import type { WorkflowTemplate } from '../types';

export const preventionScreeningWorkflow: WorkflowTemplate = {
  id: 'prevention-screening',
  name: 'Prevention Screening Workflow',
  description: 'Evaluate patient for preventive care gaps and health maintenance opportunities',
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
      required: false,
      description: 'Optional encounter context',
    },
  },

  steps: [
    {
      id: 'gather-context',
      tool: 'get-patient-context',
      description: 'Load patient demographics, medical history, and current health status',
      inputMapping: {
        patientId: '{{patientId}}',
      },
      timeout: 5000,
    },
    {
      id: 'check-vitals',
      tool: 'check-vital-alerts',
      description: 'Evaluate vital signs for abnormalities and alert thresholds',
      inputMapping: {
        patientId: '{{patientId}}',
      },
      dependsOn: ['gather-context'],
      optional: true,
      timeout: 3000,
    },
    {
      id: 'check-labs',
      tool: 'check-lab-alerts',
      description: 'Review lab values for out-of-range results and clinical significance',
      inputMapping: {
        patientId: '{{patientId}}',
      },
      dependsOn: ['gather-context'],
      optional: true,
      timeout: 3000,
    },
    {
      id: 'check-preventive',
      tool: 'get-preventive-care',
      description: 'Identify overdue screenings and preventive care recommendations',
      inputMapping: {
        patientId: '{{patientId}}',
      },
      dependsOn: ['gather-context'],
      optional: true,
      timeout: 3000,
    },
  ],

  outputMapping: {
    patientContext: '{{gather-context.result}}',
    vitalAlerts: '{{check-vitals.result}}',
    labAlerts: '{{check-labs.result}}',
    preventiveGaps: '{{check-preventive.result}}',
  },

  parallelGroups: [['check-vitals', 'check-labs', 'check-preventive']],
};
