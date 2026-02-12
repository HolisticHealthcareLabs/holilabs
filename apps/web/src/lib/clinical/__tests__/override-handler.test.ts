import { handleOverride } from '../safety-override-handler';
import * as LoggerModule from '../safety-audit-logger';

// Mock the logger
jest.mock('../safety-audit-logger', () => ({
  logSafetyEvent: jest.fn().mockResolvedValue(undefined)
}));

describe('Safety Override Handler', () => {
  // TEST 3: Override without reason code is rejected
  test('DOAC-Override-001: Override without reason code returns error', async () => {
    await expect(handleOverride({
      ruleId: 'DOAC-CrCl-001',
      severity: 'BLOCK',
      reasonCode: undefined, // missing
      actor: 'dr-123',
      patientId: 'p-456'
    })).rejects.toThrow('reasonCode is required');
  });

  // TEST 4: Valid override emits governance event
  test('DOAC-Override-002: Valid override emits OVERRIDE_SUBMITTED event', async () => {
    const logSpy = LoggerModule.logSafetyEvent;

    await handleOverride({
      ruleId: 'DOAC-CrCl-001',
      severity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-elena-123',
      patientId: 'p-456'
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'DOAC-CrCl-001',
        overrideReason: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
        userId: 'dr-elena-123',
        patientId: 'p-456',
        action: 'PASSED'
      })
    );
  });
});
