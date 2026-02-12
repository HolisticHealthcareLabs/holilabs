import tussData from '../../../../../data/master/tuss.json';

export interface TUSSCode {
  code: string;
  description: string;
  category: string;
  baseRateBOB: number;
  baseRateBRL: number | null;
  applicableSeverities: string[];
}

const codeMap = new Map<string, TUSSCode>();
for (const entry of tussData.codes) {
  codeMap.set(entry.code, entry as TUSSCode);
}

export function getTUSSByCode(code: string): TUSSCode | undefined {
  return codeMap.get(code);
}

export function getTUSSBySeverity(severity: string): TUSSCode[] {
  return tussData.codes.filter(
    (c: { applicableSeverities: string[] }) => c.applicableSeverities.includes(severity)
  ) as TUSSCode[];
}

export function formatRate(code: TUSSCode): string {
  if (code.baseRateBRL && code.baseRateBRL > 0) {
    return `R$ ${code.baseRateBRL.toLocaleString('pt-BR')}`;
  }
  if (code.baseRateBOB > 0) {
    return `Bs. ${code.baseRateBOB.toLocaleString('es-BO')}`;
  }
  return '—';
}

export function getAllCodes(): TUSSCode[] {
  return tussData.codes as TUSSCode[];
}
