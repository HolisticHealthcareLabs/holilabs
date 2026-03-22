/**
 * Workflow Module - Re-exports from workflows directory
 *
 * This file provides a single import path for all workflow functionality.
 */

export {
  getWorkflowTemplates,
  getWorkflowById,
  getWorkflowsByCategory,
  searchWorkflows,
  getWorkflowSchemas,
  executeWorkflow,
  WORKFLOW_TEMPLATES,
  preventionScreeningWorkflow,
  clinicalDecisionWorkflow,
  billingPreCheckWorkflow,
  type WorkflowTemplate,
} from './workflows/index';

export type { WorkflowStep, WorkflowResult } from './types';
