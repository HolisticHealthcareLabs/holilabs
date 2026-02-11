import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGovernanceEventRequest } from '../src/lib/governance/shared-types';

const validBase = {
  sessionId: 'sess-123',
  ruleId: 'RULE-1',
  country: 'BR',
  siteId: 'site-a',
  unit: 'ICU',
  protocolVersion: 'v1',
  protocolMode: 'DETERMINISTIC_100',
  actorRole: 'CLINICIAN',
  timestamp: '2026-01-01T10:00:00.000Z',
} as const;

test('accepts a valid override payload', () => {
  const result = validateGovernanceEventRequest({
    type: 'OVERRIDE',
    ...validBase,
    reason: 'BENEFIT_OUTWEIGHS_RISK',
    userId: 'user-1',
  });

  assert.equal(result.success, true);
  if (result.success && result.data.type === 'OVERRIDE') {
    assert.equal(result.data.type, 'OVERRIDE');
    assert.equal(result.data.reason, 'BENEFIT_OUTWEIGHS_RISK');
  }
});

test('rejects payload with missing required dimensions', () => {
  const result = validateGovernanceEventRequest({
    type: 'BLOCKED',
    ...validBase,
    siteId: '',
    severity: 'HARD_BLOCK',
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const fields = result.errors.map((error) => error.field);
    assert.equal(fields.includes('siteId'), true);
  }
});

test('rejects payload with invalid enum values', () => {
  const result = validateGovernanceEventRequest({
    type: 'FLAGGED',
    ...validBase,
    protocolMode: 'FREE_FORM_MODE',
    severity: 'SOFT_NUDGE',
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const protocolModeError = result.errors.find((error) => error.field === 'protocolMode');
    assert.ok(protocolModeError);
    assert.deepEqual(protocolModeError.allowedValues, ['DETERMINISTIC_100', 'HYBRID_70_30', 'UNKNOWN']);
  }
});

test('rejects override payload without reason code', () => {
  const result = validateGovernanceEventRequest({
    type: 'OVERRIDE',
    ...validBase,
    reason: '',
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const reasonError = result.errors.find((error) => error.field === 'reason');
    assert.ok(reasonError);
  }
});
