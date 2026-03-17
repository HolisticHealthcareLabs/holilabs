/**
 * Billing Pre-Check Workflow Tests
 */

import { billingPreCheckWorkflow } from '../billing-check-workflow';

describe('Billing Pre-Check Workflow', () => {
  test('workflow has 4 steps', () => {
    expect(billingPreCheckWorkflow.steps).toHaveLength(4);
    expect(billingPreCheckWorkflow.steps.map(s => s.id)).toEqual([
      'get-patient-insurance',
      'check-icd-match',
      'check-tuss-codes',
      'check-quantity-limits',
    ]);
  });

  test('all checks depend on insurance context', () => {
    const checks = billingPreCheckWorkflow.steps.filter(
      s => ['check-icd-match', 'check-tuss-codes', 'check-quantity-limits'].includes(s.id)
    );
    checks.forEach(check => {
      expect(check.dependsOn).toContain('get-patient-insurance');
    });
  });

  test('parallel group contains 3 checks', () => {
    expect(billingPreCheckWorkflow.parallelGroups).toHaveLength(1);
    expect(billingPreCheckWorkflow.parallelGroups?.[0]).toHaveLength(3);
    expect(billingPreCheckWorkflow.parallelGroups?.[0]).toEqual([
      'check-icd-match',
      'check-tuss-codes',
      'check-quantity-limits',
    ]);
  });

  test('workflow category is billing', () => {
    expect(billingPreCheckWorkflow.category).toBe('billing');
  });
});
