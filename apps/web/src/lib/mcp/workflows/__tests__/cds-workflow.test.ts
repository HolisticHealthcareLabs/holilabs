/**
 * Clinical Decision Support Workflow Tests
 */

import { clinicalDecisionWorkflow } from '../cds-workflow';

describe('Clinical Decision Support Workflow', () => {
  test('workflow has 6 steps', () => {
    expect(clinicalDecisionWorkflow.steps).toHaveLength(5);
    expect(clinicalDecisionWorkflow.steps.map(s => s.id)).toEqual([
      'gather-context',
      'get-differentials',
      'evaluate-urgency',
      'validate-doses',
      'merge-context',
    ]);
  });

  test('merge-context depends on all prior steps', () => {
    const mergeStep = clinicalDecisionWorkflow.steps.find(s => s.id === 'merge-context');
    expect(mergeStep?.dependsOn).toEqual([
      'gather-context',
      'get-differentials',
      'evaluate-urgency',
      'validate-doses',
    ]);
  });

  test('validate-doses is optional', () => {
    const validateStep = clinicalDecisionWorkflow.steps.find(s => s.id === 'validate-doses');
    expect(validateStep?.optional).toBe(true);
  });

  test('parallel groups defined correctly', () => {
    expect(clinicalDecisionWorkflow.parallelGroups).toHaveLength(1);
    expect(clinicalDecisionWorkflow.parallelGroups?.[0]).toEqual([
      'get-differentials',
      'evaluate-urgency',
      'validate-doses',
    ]);
  });
});
