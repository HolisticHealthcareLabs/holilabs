export function stripSyntheticDigits(input: string): string {
  // Remove digits commonly appended by Synthea (e.g., "Nannette779" -> "Nannette")
  // Keep other punctuation intact.
  return (input || '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
}

export function formatPatientDisplayName(firstName?: string, lastName?: string): string {
  const first = stripSyntheticDigits(firstName || '');
  const last = stripSyntheticDigits(lastName || '');
  return `${first} ${last}`.trim();
}

export function getInitials(firstName?: string, lastName?: string): string {
  const first = stripSyntheticDigits(firstName || '');
  const last = stripSyntheticDigits(lastName || '');
  const a = first.charAt(0).toUpperCase();
  const b = last.charAt(0).toUpperCase();
  return `${a}${b}`.trim() || 'U';
}


