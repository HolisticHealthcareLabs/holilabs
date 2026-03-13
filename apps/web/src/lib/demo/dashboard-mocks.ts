export type DemoCountryCode = 'BR' | 'MX' | 'CO' | 'US';
export type DemoClaimStatus = 'submitted' | 'approved' | 'denied' | 'pending_review' | 'resubmitted';
export type DemoEscalationStatus = 'OPEN' | 'BREACHED' | 'RESOLVED';

export interface DemoAppointment {
  id: string;
  time: string;
  patientName: string;
  initials: string;
  age: number;
  sex: 'M' | 'F';
  chiefComplaint: string;
  status: 'Finished' | 'Pending Signature' | 'In Progress' | 'Arrived' | 'Scheduled';
}

export interface DemoBillingCode {
  code: string;
  standard: 'CBHPM' | 'TUSS' | 'CPT' | 'CUPS';
  description: string;
  unitValue: number;
  currency: string;
}

export interface DemoClaim {
  id: string;
  patientName: string;
  encounterDate: string;
  provider: string;
  status: DemoClaimStatus;
  billingCodes: DemoBillingCode[];
  totalValue: number;
  currency: string;
  payer: string;
  country: DemoCountryCode;
  denialReason?: string;
  cdiFlags: number;
}

export interface DemoEscalationRecord {
  id: string;
  organizationId: string;
  status: DemoEscalationStatus;
  reason: string;
  channel: string | null;
  attempt: number;
  slaDeadline: string;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  scheduledReminder: { templateName: string; channel: string };
  patient: { id: string; firstName: string; lastName: string } | null;
  resolvedByUser: { id: string; firstName: string; lastName: string } | null;
}

export const DEMO_APPOINTMENTS: DemoAppointment[] = [
  {
    id: 'P002',
    time: '08:00 AM',
    patientName: 'Maria Santos',
    initials: 'MS',
    age: 53,
    sex: 'F',
    chiefComplaint: 'Follow-up: HTN + CKD Stage 3 (eGFR trending)',
    status: 'Finished',
  },
  {
    id: 'P003',
    time: '08:30 AM',
    patientName: "James O'Brien",
    initials: 'JO',
    age: 80,
    sex: 'M',
    chiefComplaint: 'Chest tightness 5 days, bilateral ankle edema',
    status: 'Pending Signature',
  },
  {
    id: 'P004',
    time: '09:00 AM',
    patientName: 'Sofia Reyes',
    initials: 'SR',
    age: 41,
    sex: 'F',
    chiefComplaint: 'Annual cardiology review, lipid panel results',
    status: 'In Progress',
  },
  {
    id: 'P001',
    time: '09:30 AM',
    patientName: 'Robert Chen',
    initials: 'RC',
    age: 67,
    sex: 'M',
    chiefComplaint: 'Warfarin INR check, atrial fibrillation management',
    status: 'Arrived',
  },
  {
    id: 'apt-005',
    time: '10:00 AM',
    patientName: 'Juliana Costa Lima',
    initials: 'JL',
    age: 38,
    sex: 'F',
    chiefComplaint: 'New patient: palpitations and exercise intolerance',
    status: 'Scheduled',
  },
  {
    id: 'apt-006',
    time: '10:30 AM',
    patientName: 'Fernando Augusto Vieira',
    initials: 'FV',
    age: 63,
    sex: 'M',
    chiefComplaint: 'Post-stent follow-up, dual antiplatelet review',
    status: 'Scheduled',
  },
];

export const DEMO_CLAIMS: DemoClaim[] = [
  {
    id: 'CLM-001',
    patientName: "James O'Brien",
    encounterDate: '2026-03-05',
    provider: 'Dr. Ricardo Silva',
    status: 'pending_review',
    billingCodes: [
      { code: '10101012', standard: 'CBHPM', description: 'Consulta em consultorio (alta complexidade)', unitValue: 350, currency: 'BRL' },
      { code: '40302270', standard: 'TUSS', description: 'Eletrocardiograma (ECG)', unitValue: 85, currency: 'BRL' },
      { code: '40304361', standard: 'TUSS', description: 'Peptideo natriuretico tipo B (BNP)', unitValue: 120, currency: 'BRL' },
    ],
    totalValue: 555,
    currency: 'BRL',
    payer: 'Unimed',
    country: 'BR',
    cdiFlags: 2,
  },
  {
    id: 'CLM-002',
    patientName: 'Maria Santos',
    encounterDate: '2026-03-04',
    provider: 'Dr. Ricardo Silva',
    status: 'approved',
    billingCodes: [
      { code: '10101012', standard: 'CBHPM', description: 'Consulta em consultorio (complexidade media)', unitValue: 250, currency: 'BRL' },
      { code: '40301630', standard: 'TUSS', description: 'Hemoglobina glicada (HbA1c)', unitValue: 42, currency: 'BRL' },
    ],
    totalValue: 292,
    currency: 'BRL',
    payer: 'Bradesco Saude',
    country: 'BR',
    cdiFlags: 0,
  },
  {
    id: 'CLM-003',
    patientName: 'Sofia Reyes',
    encounterDate: '2026-03-03',
    provider: 'Dr. Ricardo Silva',
    status: 'denied',
    billingCodes: [
      { code: '10101012', standard: 'CBHPM', description: 'Consulta em consultorio (alta complexidade)', unitValue: 350, currency: 'BRL' },
      { code: '40301010', standard: 'TUSS', description: 'Perfil lipidico completo', unitValue: 65, currency: 'BRL' },
    ],
    totalValue: 415,
    currency: 'BRL',
    payer: 'SulAmerica',
    country: 'BR',
    denialReason: 'Insufficient documentation: physical exam details do not support high-complexity consultation level. Missing cardiovascular risk score.',
    cdiFlags: 3,
  },
  {
    id: 'CLM-004',
    patientName: 'Robert Chen',
    encounterDate: '2026-03-05',
    provider: 'Dr. Ricardo Silva',
    status: 'submitted',
    billingCodes: [
      { code: '10101012', standard: 'CBHPM', description: 'Consulta em consultorio (complexidade media)', unitValue: 250, currency: 'BRL' },
      { code: '40304507', standard: 'TUSS', description: 'Tempo de protrombina (INR)', unitValue: 35, currency: 'BRL' },
    ],
    totalValue: 285,
    currency: 'BRL',
    payer: 'Amil',
    country: 'BR',
    cdiFlags: 0,
  },
  {
    id: 'CLM-005',
    patientName: 'Fernando Augusto Vieira',
    encounterDate: '2026-03-02',
    provider: 'Dr. Ricardo Silva',
    status: 'approved',
    billingCodes: [
      { code: '10101012', standard: 'CBHPM', description: 'Consulta em consultorio (complexidade media)', unitValue: 250, currency: 'BRL' },
    ],
    totalValue: 250,
    currency: 'BRL',
    payer: 'Unimed',
    country: 'BR',
    cdiFlags: 0,
  },
];

export const DEMO_ESCALATIONS: DemoEscalationRecord[] = [
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-001',
    status: 'BREACHED',
    reason: 'Troponin results pending > 4h',
    channel: 'In-App',
    attempt: 2,
    slaDeadline: new Date(Date.now() - 2 * 3600000).toISOString(),
    resolvedAt: null,
    resolution: null,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Critical Lab Follow-up', channel: 'SMS + In-App' },
    patient: { id: 'P003', firstName: 'James', lastName: "O'Brien" },
    resolvedByUser: null,
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-002',
    status: 'OPEN',
    reason: 'INR out of therapeutic range',
    channel: 'SMS',
    attempt: 1,
    slaDeadline: new Date(Date.now() + 1.5 * 3600000).toISOString(),
    resolvedAt: null,
    resolution: null,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Anticoagulation Alert', channel: 'SMS' },
    patient: { id: 'P003', firstName: 'James', lastName: "O'Brien" },
    resolvedByUser: null,
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-003',
    status: 'OPEN',
    reason: 'eGFR trending below 40',
    channel: 'In-App',
    attempt: 1,
    slaDeadline: new Date(Date.now() + 6 * 3600000).toISOString(),
    resolvedAt: null,
    resolution: null,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Renal Function Decline', channel: 'In-App' },
    patient: { id: 'P008', firstName: 'Carlos', lastName: 'Eduardo Mendes' },
    resolvedByUser: null,
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'esc-005',
    status: 'RESOLVED',
    reason: 'BP above 160/95 for 3 consecutive readings',
    channel: 'Phone',
    attempt: 2,
    slaDeadline: new Date(Date.now() - 48 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    resolution: 'Patient seen in urgent visit. Lisinopril increased to 20 mg. Follow-up in 72h.',
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    scheduledReminder: { templateName: 'Hypertensive Urgency', channel: 'Phone + In-App' },
    patient: { id: 'P001', firstName: 'Robert', lastName: 'Chen' },
    resolvedByUser: { id: 'U001', firstName: 'Ricardo', lastName: 'Silva' },
  },
];

export function getDemoBillingStats(country: DemoCountryCode) {
  const all = DEMO_CLAIMS.filter((claim) => claim.country === country);
  const approved = all.filter((claim) => claim.status === 'approved');
  const denied = all.filter((claim) => claim.status === 'denied');
  const pending = all.filter((claim) => claim.status === 'pending_review' || claim.status === 'submitted');

  return {
    totalClaims: all.length,
    approvalRate: all.length > 0 ? Math.round((approved.length / all.length) * 100) : 0,
    deniedCount: denied.length,
    pendingCount: pending.length,
    totalBilled: all.reduce((sum, claim) => sum + claim.totalValue, 0),
    totalApproved: approved.reduce((sum, claim) => sum + claim.totalValue, 0),
    cdiAlerts: all.reduce((sum, claim) => sum + claim.cdiFlags, 0),
    currency: all[0]?.currency ?? 'BRL',
  };
}

export function getDemoAnalyticsData() {
  const uniquePatients = Array.from(new Set(DEMO_APPOINTMENTS.map((item) => item.patientName)));
  const activePatients = DEMO_APPOINTMENTS.filter((item) =>
    item.status === 'Finished' || item.status === 'Pending Signature' || item.status === 'In Progress' || item.status === 'Arrived'
  ).length;
  const consultationCount = DEMO_APPOINTMENTS.length;
  const prescriptionCount = 4;
  const revenue = getDemoBillingStats('BR').totalBilled;

  return {
    totalPatients: uniquePatients.length,
    activePatients,
    totalConsultations: consultationCount,
    totalPrescriptions: prescriptionCount,
    revenue,
    avgConsultationTime: 32,
  };
}
