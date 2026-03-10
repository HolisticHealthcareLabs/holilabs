export interface TenantStampedRecord {
  organizationId: string;
}

export interface ClinicalPatientRecord extends TenantStampedRecord {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth: string;
}

export interface ClinicalEncounterRecord extends TenantStampedRecord {
  id: string;
  patientId: string;
  occurredAt: string;
  summary: string;
}

export type ClinicalEscalationStatus = 'OPEN' | 'BREACHED' | 'RESOLVED';

export interface ClinicalEscalationRecord extends TenantStampedRecord {
  id: string;
  patientId: string;
  status: ClinicalEscalationStatus;
  createdAt: string;
  reason: string;
}
