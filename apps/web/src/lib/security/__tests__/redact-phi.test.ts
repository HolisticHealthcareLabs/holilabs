import { redactPHI, redactObject } from '../redact-phi';

describe('redactPHI', () => {
  it('redacts CPF with dots and dash', () => {
    expect(redactPHI('CPF: 123.456.789-09')).toBe('CPF: [CPF_REDACTED]');
  });

  it('redacts CPF without formatting', () => {
    expect(redactPHI('CPF: 12345678909')).toBe('CPF: [CPF_REDACTED]');
  });

  it('redacts CNS (15 digits)', () => {
    expect(redactPHI('CNS: 123456789012345')).toBe('CNS: [CNS_REDACTED]');
  });

  it('redacts RG with dots and dash', () => {
    expect(redactPHI('RG: 12.345.678-9')).toBe('RG: [RG_REDACTED]');
  });

  it('redacts RG with X check digit', () => {
    expect(redactPHI('RG: 12.345.678-X')).toBe('RG: [RG_REDACTED]');
  });

  it('redacts email addresses', () => {
    expect(redactPHI('contact: maria@clinic.com.br')).toBe('contact: [EMAIL_REDACTED]');
  });

  it('redacts Brazilian phone with country code', () => {
    expect(redactPHI('tel: +55 (11) 98765-4321')).toBe('tel: [PHONE_REDACTED]');
  });

  it('redacts Brazilian phone without country code', () => {
    expect(redactPHI('tel: (11) 98765-4321')).toBe('tel: [PHONE_REDACTED]');
  });

  it('redacts phone without parentheses', () => {
    expect(redactPHI('tel: 11 98765-4321')).toBe('tel: [PHONE_REDACTED]');
  });

  it('passes through non-PHI strings unchanged', () => {
    const safe = 'Tool executed successfully in 42ms';
    expect(redactPHI(safe)).toBe(safe);
  });

  it('redacts multiple PHI values in one string', () => {
    const input = 'Patient 123.456.789-09 email joao@example.com';
    const result = redactPHI(input);
    expect(result).toContain('[CPF_REDACTED]');
    expect(result).toContain('[EMAIL_REDACTED]');
    expect(result).not.toContain('123.456.789-09');
    expect(result).not.toContain('joao@example.com');
  });
});

describe('redactObject', () => {
  it('redacts sensitive keys in flat objects', () => {
    const obj = { cpf: '12345678909', event: 'login' };
    const result = redactObject(obj) as Record<string, unknown>;
    expect(result.cpf).toBe('[REDACTED]');
    expect(result.event).toBe('login');
  });

  it('redacts sensitive keys case-insensitively', () => {
    const obj = { Email: 'maria@clinic.com', Phone: '5511987654321' };
    const result = redactObject(obj) as Record<string, unknown>;
    expect(result.Email).toBe('[REDACTED]');
    expect(result.Phone).toBe('[REDACTED]');
  });

  it('redacts PHI in string values of non-sensitive keys', () => {
    const obj = { message: 'Patient CPF 123.456.789-09 found' };
    const result = redactObject(obj) as Record<string, unknown>;
    expect(result.message).toBe('Patient CPF [CPF_REDACTED] found');
  });

  it('handles nested objects', () => {
    const obj = {
      event: 'audit',
      patient: {
        name: 'Maria Silva',
        cpf: '12345678909',
        contact: {
          email: 'maria@example.com',
        },
      },
    };
    const result = redactObject(obj) as any;
    expect(result.patient.name).toBe('[REDACTED]');
    expect(result.patient.cpf).toBe('[REDACTED]');
    expect(result.patient.contact.email).toBe('[REDACTED]');
  });

  it('handles arrays', () => {
    const arr = [{ cpf: '12345678909' }, { email: 'a@b.com' }];
    const result = redactObject(arr) as any[];
    expect(result[0].cpf).toBe('[REDACTED]');
    expect(result[1].email).toBe('[REDACTED]');
  });

  it('returns primitives unchanged', () => {
    expect(redactObject(42)).toBe(42);
    expect(redactObject(true)).toBe(true);
    expect(redactObject(null)).toBe(null);
    expect(redactObject(undefined)).toBe(undefined);
  });

  it('redacts string inputs directly', () => {
    expect(redactObject('email: test@example.com')).toBe('email: [EMAIL_REDACTED]');
  });

  it('is a pure function with no side effects', () => {
    const original = { cpf: '12345678909', safe: 'ok' };
    const frozen = Object.freeze(original);
    const result = redactObject(frozen) as Record<string, unknown>;
    expect(result.cpf).toBe('[REDACTED]');
    expect(frozen.cpf).toBe('12345678909');
  });

  it('redacts password and token keys', () => {
    const obj = { password: 'secret123', token: 'abc-xyz', action: 'login' };
    const result = redactObject(obj) as Record<string, unknown>;
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.action).toBe('login');
  });

  it('redacts address and birthDate keys', () => {
    const obj = { address: 'Rua ABC 123', birthDate: '1990-01-15' };
    const result = redactObject(obj) as Record<string, unknown>;
    expect(result.address).toBe('[REDACTED]');
    expect(result.birthDate).toBe('[REDACTED]');
  });
});
