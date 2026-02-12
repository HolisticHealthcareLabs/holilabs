export type AttestationResult = {
  required: boolean;
  reason?: string;
  staleSince?: number; // hours
  threshold?: number; // hours
};

export function checkAttestation(patient: { labTimestamp?: Date | string; medication?: string }): AttestationResult {
  if (!patient.labTimestamp) {
    return { required: true, reason: 'MISSING_LABS' };
  }

  const now = new Date();
  const labDate = new Date(patient.labTimestamp);
  const diffMs = now.getTime() - labDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Renal function threshold: 72 hours for DOACs
  if (diffHours > 72) {
    return {
      required: true,
      reason: 'STALE_RENAL_LABS',
      staleSince: Math.floor(diffHours),
      threshold: 72
    };
  }

  return { required: false };
}
