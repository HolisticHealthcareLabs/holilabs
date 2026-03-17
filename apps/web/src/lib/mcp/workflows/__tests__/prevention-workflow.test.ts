/**
 * Prevention Screening Workflow Tests
 */

import { preventionScreeningWorkflow } from '../prevention-workflow';

describe('Prevention Screening Workflow', () => {
  test('workflow has required steps', () => {
    expect(preventionScreeningWorkflow.steps).toHaveLength(4);
    expect(preventionScreeningWorkflow.steps[0].id).toBe('gather-context');
    expect(preventionScreeningWorkflow.steps[1].id).toBe('check-vitals');
    expect(preventionScreeningWorkflow.steps[2].id).toBe('check-labs');
    expect(preventionScreeningWorkflow.steps[3].id).toBe('check-preventive');
  });

  test('parallel groups valid', () => {
    expect(preventionScreeningWorkflow.parallelGroups).toHaveLength(1);
    expect(preventionScreeningWorkflow.parallelGroups?.[0]).toEqual([
      'check-vitals',
      'check-labs',
      'check-preventive',
    ]);
  });

  test('dependsOn references valid', () => {
    const stepIds = new Set(preventionScreeningWorkflow.steps.map(s => s.id));
    preventionScreeningWorkflow.steps.forEach(step => {
      if (step.dependsOn) {
        step.dependsOn.forEach(dep => {
          expect(stepIds.has(dep)).toBe(true);
        });
      }
    });
  });

  test('optional steps marked correctly', () => {
    const optionalSteps = preventionScreeningWorkflow.steps.filter(s => s.optional);
    expect(optionalSteps).toHaveLength(3);
    expect(optionalSteps.map(s => s.id)).toEqual(['check-vitals', 'check-labs', 'check-preventive']);
  });

  test('output mapping references valid steps', () => {
    const stepIds = new Set(preventionScreeningWorkflow.steps.map(s => s.id));
    Object.values(preventionScreeningWorkflow.outputMapping).forEach(value => {
      if (typeof value === 'string' && value.includes('{{')) {
        const stepId = value.split('.')[0].replace('{{', '').trim();
        expect(stepIds.has(stepId)).toBe(true);
      }
    });
  });
});
