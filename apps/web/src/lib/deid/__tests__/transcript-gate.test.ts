jest.mock('@/lib/presidio', () => ({
  anonymizePatientData: jest.fn(async (text: string) => text.replace('John Doe', '<PERSON>').replace('john@example.com', '<EMAIL>')),
}));

describe('deidentifyTranscriptOrThrow', () => {
  let deidentifyTranscriptOrThrow: (rawText: string) => Promise<string>;
  const prev = process.env.REQUIRE_DEIDENTIFICATION;

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('@/lib/deid/transcript-gate');
    deidentifyTranscriptOrThrow = mod.deidentifyTranscriptOrThrow;
  });

  afterEach(() => {
    process.env.REQUIRE_DEIDENTIFICATION = prev;
  });

  it('redacts PHI-like content when Presidio succeeds', async () => {
    process.env.REQUIRE_DEIDENTIFICATION = 'true';
    const raw = 'Patient John Doe can be reached at john@example.com.';
    const safe = await deidentifyTranscriptOrThrow(raw);
    expect(safe).not.toContain('John Doe');
    expect(safe).not.toContain('john@example.com');
    expect(safe).toContain('<PERSON>');
    expect(safe).toContain('<EMAIL>');
  });

  it('fails closed when strict and Presidio throws', async () => {
    process.env.REQUIRE_DEIDENTIFICATION = 'true';
    const { anonymizePatientData } = require('@/lib/presidio');
    anonymizePatientData.mockImplementationOnce(async () => {
      throw new Error('presidio down');
    });
    await expect(deidentifyTranscriptOrThrow('hello')).rejects.toThrow(/De-identification required/);
  });

  it('fails open only when strict=false (development override)', async () => {
    process.env.REQUIRE_DEIDENTIFICATION = 'false';
    const { anonymizePatientData } = require('@/lib/presidio');
    anonymizePatientData.mockImplementationOnce(async () => {
      throw new Error('presidio down');
    });
    await expect(deidentifyTranscriptOrThrow('hello world')).resolves.toBe('hello world');
  });
});


