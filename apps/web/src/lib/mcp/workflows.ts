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

export type WorkflowStep = {
  name: string;
  toolName: string;
  input: Record<string, any>;
  dependsOn?: string[];
};

export type WorkflowResult = {
  success: boolean;
  steps: Array<{ name: string; success: boolean; data?: any; error?: string }>;
  summary?: string;
};
