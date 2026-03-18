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
 * Get workflows by category
 */
export function getWorkflowsByCategory(category: string): WorkflowTemplate[] {
  return Array.from(WORKFLOW_REGISTRY.values()).filter(w => w.category === category);
}

/**
 * Search workflows by name or description
 */
export function searchWorkflows(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(WORKFLOW_REGISTRY.values()).filter(w =>
    w.name.toLowerCase().includes(lowerQuery) ||
    w.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get JSON schemas for all workflow templates
 */
export function getWorkflowSchemas() {
  const schemas: Record<string, any> = {};
  for (const [id, template] of WORKFLOW_REGISTRY.entries()) {
    schemas[id] = {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      version: template.version,
      requiredInputs: template.requiredInputs,
      steps: template.steps.map(s => ({
        id: s.id,
        tool: s.tool,
        description: s.description,
        timeout: s.timeout,
      })),
    };
  }
  return schemas;
}

/**
 * Execute a workflow (basic implementation)
 */
export async function executeWorkflow(
  workflowId: string,
  inputs: Record<string, any>
): Promise<any> {
  const workflow = getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Return workflow data with execution metadata
  return {
    workflowId,
    status: 'executed',
    inputs,
    stepsCount: workflow.steps.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export all workflow template objects
 */
export const WORKFLOW_TEMPLATES = Array.from(WORKFLOW_REGISTRY.values());

/**
 * Export individual workflow templates
 */
export { preventionScreeningWorkflow, clinicalDecisionWorkflow, billingPreCheckWorkflow };

/**
 * Export workflow types
 */
export type { WorkflowTemplate };
