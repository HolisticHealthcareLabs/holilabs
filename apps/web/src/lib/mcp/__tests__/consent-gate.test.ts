export {};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    consent: {
      findFirst: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');
const { verifyConsentForAgentAccess, ConsentDeniedError } = require('../consent-gate');

describe('verifyConsentForAgentAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes when active consent exists', async () => {
    (prisma.consent.findFirst as jest.Mock).mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-1',
      type: 'DATA_RESEARCH',
      isActive: true,
      revokedAt: null,
    });

    await expect(
      verifyConsentForAgentAccess('patient-1', 'DATA_RESEARCH'),
    ).resolves.toBeUndefined();

    expect(prisma.consent.findFirst).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        type: 'DATA_RESEARCH',
        isActive: true,
        revokedAt: null,
      },
    });
  });

  it('throws ConsentDeniedError when no consent record exists', async () => {
    (prisma.consent.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      verifyConsentForAgentAccess('patient-2', 'DATA_RESEARCH'),
    ).rejects.toThrow(ConsentDeniedError);

    await expect(
      verifyConsentForAgentAccess('patient-2', 'DATA_RESEARCH'),
    ).rejects.toThrow('Consent not granted: DATA_RESEARCH for patient patient-2');
  });

  it('throws ConsentDeniedError when consent is revoked (findFirst returns null)', async () => {
    (prisma.consent.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      verifyConsentForAgentAccess('patient-3', 'DATA_RESEARCH'),
    ).rejects.toThrow(ConsentDeniedError);
  });

  it('throws ConsentDeniedError when consent is inactive (findFirst returns null)', async () => {
    (prisma.consent.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      verifyConsentForAgentAccess('patient-4', 'GENERAL_CONSULTATION'),
    ).rejects.toThrow(ConsentDeniedError);
  });

  it('queries with the correct consent type', async () => {
    (prisma.consent.findFirst as jest.Mock).mockResolvedValue({
      id: 'consent-5',
      patientId: 'patient-5',
      type: 'TELEHEALTH',
      isActive: true,
      revokedAt: null,
    });

    await verifyConsentForAgentAccess('patient-5', 'TELEHEALTH');

    expect(prisma.consent.findFirst).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-5',
        type: 'TELEHEALTH',
        isActive: true,
        revokedAt: null,
      },
    });
  });
});

describe('ConsentDeniedError', () => {
  it('has correct name and properties', () => {
    const error = new ConsentDeniedError('patient-x', 'DATA_RESEARCH');
    expect(error.name).toBe('ConsentDeniedError');
    expect(error.patientId).toBe('patient-x');
    expect(error.consentType).toBe('DATA_RESEARCH');
    expect(error.message).toBe('Consent not granted: DATA_RESEARCH for patient patient-x');
  });

  it('is an instance of Error', () => {
    const error = new ConsentDeniedError('p1', 'TELEHEALTH');
    expect(error).toBeInstanceOf(Error);
  });
});
