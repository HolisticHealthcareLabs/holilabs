/**
 * Workflow Registry
 *
 * Central registry for all workflow templates.
 * Provides access to pre-defined workflows for orchestration.
 */

import type { WorkflowTemplate } from '../types';
import { preventionScreeningWorkflow } from './prevention-workflow';
import { clinicalDecisionWorkflow } from './cds-workflow';
import { billingPreCheckWorkflow } from './billing-check-workflow';

/**
 * Central registry of all workflow templates
 */
const WORKFLOW_REGISTRY = new Map<string, WorkflowTemplate>([
  ['prevention-screening', preventionScreeningWorkflow],
  ['clinical-decision-support', clinicalDecisionWorkflow],
  ['billing-pre-check', billingPreCheckWorkflow],
]);

/**
 * Get all registered workflow templates
 */
export function getWorkflowTemplates(): WorkflowTemplate[] {
  return Array.from(WORKFLOW_REGISTRY.values());
}

/**
 * Get a workflow template by ID
 */
export function getWorkflowById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_REGISTRY.get(id);
}

/**
 * Export workflow templates
 */
export { preventionScreeningWorkflow, clinicalDecisionWorkflow, billingPreCheckWorkflow };
