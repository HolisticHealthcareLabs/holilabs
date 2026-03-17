/**
 * PHI Redaction — Pure synchronous regex-based redactor for log sanitization.
 *
 * Strips CPF, CNS, RG, email, phone, and sensitive object keys
 * before any string reaches application logs.
 */

const PHI_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // CPF: 000.000.000-00 or 00000000000
  { pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, replacement: '[CPF_REDACTED]' },
  // CNS: 15 digits
  { pattern: /\b\d{15}\b/g, replacement: '[CNS_REDACTED]' },
  // RG: XX.XXX.XXX-X or similar digit patterns
  { pattern: /\b\d{2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g, replacement: '[RG_REDACTED]' },
  // Email
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  // Phone: Brazilian format +55 (XX) XXXXX-XXXX or variations
  { pattern: /\+?55\s*\(?\d{2}\)?\s*\d{4,5}-?\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
  // Generic phone patterns (XX) XXXXX-XXXX
  { pattern: /\(?\d{2,3}\)?\s*\d{4,5}-\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
];

const SENSITIVE_KEYS = new Set([
  'cpf', 'cns', 'rg', 'email', 'phone', 'telefone', 'celular',
  'nome', 'name', 'fullname', 'firstname', 'lastname',
  'address', 'endereco', 'birthdate', 'datanascimento',
  'passwordhash', 'password', 'token', 'secret',
]);

export function redactPHI(input: string): string {
  let result = input;
  for (const { pattern, replacement } of PHI_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function redactObject(obj: unknown): unknown {
  if (typeof obj === 'string') return redactPHI(obj);
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactObject(value);
      }
    }
    return result;
  }
  return obj;
}
