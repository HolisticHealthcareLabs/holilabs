import { checkAttestation } from '../doac-attestation';

describe('DOAC Attestation Gate', () => {
  // TEST 2: Labs >72h require attestation
  test('DOAC-Stale-001: Renal labs >72h require attestation', () => {
    const result = checkAttestation({
      medication: 'apixaban',
      labTimestamp: new Date(Date.now() - 73 * 60 * 60 * 1000) // 73 hours ago
    });

    expect(result.required).toBe(true);
    expect(result.reason).toBe('STALE_RENAL_LABS');
    expect(result.staleSince).toBe(73);
    expect(result.threshold).toBe(72);
  });

  test('DOAC-Fresh-001: Renal labs <72h do not require attestation', () => {
    const result = checkAttestation({
      medication: 'apixaban',
      labTimestamp: new Date(Date.now() - 71 * 60 * 60 * 1000) // 71 hours ago
    });

    expect(result.required).toBe(false);
  });

  test('DOAC-Missing-001: Missing labs require attestation', () => {
    const result = checkAttestation({
      medication: 'apixaban',
      labTimestamp: undefined
    });

    expect(result.required).toBe(true);
    expect(result.reason).toBe('MISSING_LABS');
  });
});
