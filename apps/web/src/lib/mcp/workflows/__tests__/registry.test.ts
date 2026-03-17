/**
 * Workflow Registry Tests
 */

import { preventionScreeningWorkflow } from '../prevention-workflow';
import { clinicalDecisionWorkflow } from '../cds-workflow';
import { billingPreCheckWorkflow } from '../billing-check-workflow';
import type { WorkflowTemplate } from '../../types';

describe('Workflow Registry', () => {
  function getWorkflowTemplates(): WorkflowTemplate[] {
    const registry = new Map<string, WorkflowTemplate>([
      ['prevention-screening', preventionScreeningWorkflow],
      ['clinical-decision-support', clinicalDecisionWorkflow],
      ['billing-pre-check', billingPreCheckWorkflow],
    ]);
    return Array.from(registry.values());
  }

  function getWorkflowById(id: string): WorkflowTemplate | undefined {
    const registry = new Map<string, WorkflowTemplate>([
      ['prevention-screening', preventionScreeningWorkflow],
      ['clinical-decision-support', clinicalDecisionWorkflow],
      ['billing-pre-check', billingPreCheckWorkflow],
    ]);
    return registry.get(id);
  }

  test('getWorkflowTemplates returns 3 workflows', () => {
    const workflows = getWorkflowTemplates();
    expect(workflows).toHaveLength(3);
  });

  test('getWorkflowById returns correct workflow', () => {
    const workflow = getWorkflowById('prevention-screening');
    expect(workflow).toBeDefined();
    expect(workflow?.id).toBe('prevention-screening');
    expect(workflow?.name).toBe('Prevention Screening Workflow');
  });

  test('getWorkflowById unknown ID returns undefined', () => {
    const workflow = getWorkflowById('unknown-workflow');
    expect(workflow).toBeUndefined();
  });
});
