/**
 * Billing Pre-Check Workflow
 *
 * Validates billing compliance before prescription submission.
 * Ensures ICD-10 diagnosis matches prescribed medication, TUSS codes are valid,
 * and quantity limits are not exceeded.
 *
 * Steps:
 * 1. get-patient-insurance (sequential) - Fetch insurance and coverage info
 * 2-4. [PARALLEL] check-icd-match, check-tuss-codes, check-quantity-limits - Billing checks
 *
 * Outputs:
 * - insuranceContext: Patient insurance and coverage details
 * - icdMatch: ICD-10 to medication alignment validation
 * - tussValidation: TUSS code existence and validity
 * - quantityCheck: Prescription quantity compliance
 */

import type { WorkflowTemplate } from '../types';

export const billingPreCheckWorkflow: WorkflowTemplate = {
  id: 'billing-pre-check',
  name: 'Billing Pre-Check Workflow',
  description: 'Validates billing compliance and coverage before prescription submission',
  category: 'billing',
  version: '1.0.0',

  requiredInputs: {
    patientId: {
      type: 'string',
      format: 'uuid',
      required: true,
      description: 'Unique patient identifier',
    },
    prescriptionData: {
      type: 'object',
      required: true,
      description: 'Prescription details to validate',
    },
  },

  steps: [
    {
      id: 'get-patient-insurance',
      tool: 'get-patient-insurance',
      description: 'Retrieve patient insurance coverage, deductible, and copay information',
      inputMapping: {
        patientId: '{{patientId}}',
      },
      timeout: 4000,
    },
    {
      id: 'check-icd-match',
      tool: 'check-icd-medication-match',
      description: 'Verify ICD-10 diagnosis code matches prescribed medication (prevents glosas)',
      inputMapping: {
        patientId: '{{patientId}}',
        prescriptionData: '{{prescriptionData}}',
        insuranceContext: '{{get-patient-insurance.result}}',
      },
      dependsOn: ['get-patient-insurance'],
      optional: true,
      timeout: 3000,
    },
    {
      id: 'check-tuss-codes',
      tool: 'validate-tuss-codes',
      description: 'Verify TUSS codes exist in master data and are properly formatted',
      inputMapping: {
        prescriptionData: '{{prescriptionData}}',
      },
      dependsOn: ['get-patient-insurance'],
      optional: true,
      timeout: 2000,
    },
    {
      id: 'check-quantity-limits',
      tool: 'check-prescription-quantity-limits',
      description: 'Ensure prescription quantities do not exceed coverage or clinical limits',
      inputMapping: {
        patientId: '{{patientId}}',
        prescriptionData: '{{prescriptionData}}',
        insuranceContext: '{{get-patient-insurance.result}}',
      },
      dependsOn: ['get-patient-insurance'],
      optional: true,
      timeout: 2000,
    },
  ],

  outputMapping: {
    insuranceContext: '{{get-patient-insurance.result}}',
    icdMatch: '{{check-icd-match.result}}',
    tussValidation: '{{check-tuss-codes.result}}',
    quantityCheck: '{{check-quantity-limits.result}}',
  },

  parallelGroups: [['check-icd-match', 'check-tuss-codes', 'check-quantity-limits']],
};
