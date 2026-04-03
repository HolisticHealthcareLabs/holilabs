/**
 * Synthetic demo data (NON-PHI).
 *
 * Used to make the product feel "alive" when running locally or in demo mode
 * without requiring Postgres/Meilisearch/etc.
 */

export const DEMO_CLINICIAN_ID = 'demo-clinician-id' as const;
export const DEMO_CLINICIAN_EMAIL = 'demo-clinician@holilabs.xyz' as const;

const EPHEMERAL_EMAIL_RE = /^demo-[a-f0-9]+@holilabs\.xyz$/;

export function isDemoClinician(userId?: string | null, email?: string | null) {
  return (
    userId === DEMO_CLINICIAN_ID ||
    email === DEMO_CLINICIAN_EMAIL ||
    (typeof email === 'string' && EPHEMERAL_EMAIL_RE.test(email))
  );
}

export type SyntheticPatient = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string; // ISO
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  isActive: boolean;
  isPalliativeCare: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type SyntheticNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string; // ISO
};

export type SyntheticTelemetryEvent = {
  id: string;
  time: string; // "HH:MM:SS"
  level: 'INFO' | 'WARN' | 'CRITICAL';
  title: string;
  message: string;
  tags: string[];
  userId: string;
  isDeterminstic?: boolean;
};

function isoMinutesAgo(mins: number) {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

export function getSyntheticPatients(): SyntheticPatient[] {
  // NOTE: intentionally generic names + data. Avoid realistic identifiers.
  return [
    {
      id: 'pt_demo_001',
      firstName: 'Aline',
      lastName: 'Santos',
      mrn: 'HL-10001',
      dateOfBirth: '1987-04-12T00:00:00.000Z',
      gender: 'FEMALE',
      isActive: true,
      isPalliativeCare: false,
      createdAt: isoMinutesAgo(60 * 24 * 14),
      updatedAt: isoMinutesAgo(120),
    },
    {
      id: 'pt_demo_002',
      firstName: 'Bruno',
      lastName: 'Almeida',
      mrn: 'HL-10002',
      dateOfBirth: '1975-09-23T00:00:00.000Z',
      gender: 'MALE',
      isActive: true,
      isPalliativeCare: false,
      createdAt: isoMinutesAgo(60 * 24 * 9),
      updatedAt: isoMinutesAgo(35),
    },
    {
      id: 'pt_demo_003',
      firstName: 'Camila',
      lastName: 'Rocha',
      mrn: 'HL-10003',
      dateOfBirth: '1992-01-05T00:00:00.000Z',
      gender: 'FEMALE',
      isActive: true,
      isPalliativeCare: false,
      createdAt: isoMinutesAgo(60 * 24 * 4),
      updatedAt: isoMinutesAgo(15),
    },
    {
      id: 'pt_demo_004',
      firstName: 'Diego',
      lastName: 'Ferreira',
      mrn: 'HL-10004',
      dateOfBirth: '1961-06-30T00:00:00.000Z',
      gender: 'MALE',
      isActive: true,
      isPalliativeCare: true,
      createdAt: isoMinutesAgo(60 * 24 * 21),
      updatedAt: isoMinutesAgo(240),
    },
    {
      id: 'pt_demo_005',
      firstName: 'Elisa',
      lastName: 'Moura',
      mrn: 'HL-10005',
      dateOfBirth: '2001-11-18T00:00:00.000Z',
      gender: 'FEMALE',
      isActive: false,
      isPalliativeCare: false,
      createdAt: isoMinutesAgo(60 * 24 * 45),
      updatedAt: isoMinutesAgo(60 * 24 * 10),
    },
  ];
}

export type SyntheticPrescription = {
  id: string;
  medications: Array<{ name: string; dose: string; frequency: string; route?: string }>;
  instructions: string | null;
  diagnosis: string | null;
  status: 'PENDING' | 'SIGNED' | 'SENT' | 'FILLED' | 'CANCELLED';
  signedAt: string | null;
  createdAt: string;
  prescriptionHash: string;
  patient: { id: string; firstName: string; lastName: string; dateOfBirth?: string };
  clinician: { id: string; firstName: string; lastName: string; licenseNumber: string };
};

export function getSyntheticPrescriptions(clinicianId: string): SyntheticPrescription[] {
  return [
    {
      id: 'rx_demo_001',
      medications: [
        { name: 'Losartana 50 mg', dose: '50 mg', frequency: '1x/day', route: 'oral' },
        { name: 'Hidroclorotiazida 25 mg', dose: '25 mg', frequency: '1x/day', route: 'oral' },
      ],
      instructions: 'Take in the morning with water. Monitor blood pressure weekly.',
      diagnosis: 'I10 — Essential hypertension',
      status: 'SIGNED',
      signedAt: isoMinutesAgo(60 * 24 * 2),
      createdAt: isoMinutesAgo(60 * 24 * 2),
      prescriptionHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      patient: { id: 'pt_demo_001', firstName: 'Aline', lastName: 'Santos', dateOfBirth: '1987-04-12T00:00:00.000Z' },
      clinician: { id: clinicianId, firstName: 'Dr. Demo', lastName: 'Clinician', licenseNumber: 'CRM-SP-000000' },
    },
    {
      id: 'rx_demo_002',
      medications: [
        { name: 'Metformina 850 mg', dose: '850 mg', frequency: '2x/day', route: 'oral' },
      ],
      instructions: 'Take with meals. Report any gastrointestinal discomfort.',
      diagnosis: 'E11 — Type 2 diabetes mellitus',
      status: 'SENT',
      signedAt: isoMinutesAgo(60 * 24),
      createdAt: isoMinutesAgo(60 * 24),
      prescriptionHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      patient: { id: 'pt_demo_002', firstName: 'Bruno', lastName: 'Almeida', dateOfBirth: '1975-09-23T00:00:00.000Z' },
      clinician: { id: clinicianId, firstName: 'Dr. Demo', lastName: 'Clinician', licenseNumber: 'CRM-SP-000000' },
    },
    {
      id: 'rx_demo_003',
      medications: [
        { name: 'Amoxicilina 500 mg', dose: '500 mg', frequency: '3x/day (8/8h)', route: 'oral' },
      ],
      instructions: 'Complete full 7-day course even if symptoms improve.',
      diagnosis: 'J06.9 — Upper respiratory infection',
      status: 'FILLED',
      signedAt: isoMinutesAgo(60 * 24 * 7),
      createdAt: isoMinutesAgo(60 * 24 * 7),
      prescriptionHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      patient: { id: 'pt_demo_003', firstName: 'Camila', lastName: 'Rocha', dateOfBirth: '1992-01-05T00:00:00.000Z' },
      clinician: { id: clinicianId, firstName: 'Dr. Demo', lastName: 'Clinician', licenseNumber: 'CRM-SP-000000' },
    },
    {
      id: 'rx_demo_004',
      medications: [
        { name: 'Morfina 10 mg', dose: '10 mg', frequency: '4/4h PRN', route: 'oral' },
        { name: 'Ondansetrona 4 mg', dose: '4 mg', frequency: 'PRN (nausea)', route: 'sublingual' },
      ],
      instructions: 'Palliative care protocol. Assess pain scale before each dose.',
      diagnosis: 'C34 — Malignant neoplasm of bronchus and lung',
      status: 'SIGNED',
      signedAt: isoMinutesAgo(60 * 8),
      createdAt: isoMinutesAgo(60 * 8),
      prescriptionHash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
      patient: { id: 'pt_demo_004', firstName: 'Diego', lastName: 'Ferreira', dateOfBirth: '1961-06-30T00:00:00.000Z' },
      clinician: { id: clinicianId, firstName: 'Dr. Demo', lastName: 'Clinician', licenseNumber: 'CRM-SP-000000' },
    },
    {
      id: 'rx_demo_005',
      medications: [
        { name: 'Ibuprofeno 400 mg', dose: '400 mg', frequency: '3x/day', route: 'oral' },
      ],
      instructions: 'Take after meals for 5 days. Do not exceed recommended dose.',
      diagnosis: 'M54.5 — Low back pain',
      status: 'PENDING',
      signedAt: null,
      createdAt: isoMinutesAgo(30),
      prescriptionHash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
      patient: { id: 'pt_demo_003', firstName: 'Camila', lastName: 'Rocha', dateOfBirth: '1992-01-05T00:00:00.000Z' },
      clinician: { id: clinicianId, firstName: 'Dr. Demo', lastName: 'Clinician', licenseNumber: 'CRM-SP-000000' },
    },
  ];
}

export function getSyntheticNotifications(): SyntheticNotification[] {
  return [
    {
      id: 'nt_demo_001',
      type: 'NEW_MESSAGE',
      title: 'New message',
      message: 'Lab results follow-up requested for HL-10003.',
      actionUrl: '/dashboard',
      actionLabel: 'View',
      isRead: false,
      priority: 'HIGH',
      createdAt: isoMinutesAgo(6),
    },
    {
      id: 'nt_demo_002',
      type: 'APPOINTMENT_REMINDER',
      title: 'Upcoming consult',
      message: 'Agenda updated: next consult in 45 minutes.',
      actionUrl: '/dashboard/agenda',
      actionLabel: 'Open agenda',
      isRead: false,
      priority: 'NORMAL',
      createdAt: isoMinutesAgo(22),
    },
    {
      id: 'nt_demo_003',
      type: 'SYSTEM',
      title: 'Policy sync',
      message: 'Assurance ruleset refreshed successfully.',
      actionUrl: '/dashboard/governance',
      actionLabel: 'Governance',
      isRead: true,
      priority: 'LOW',
      createdAt: isoMinutesAgo(180),
    },
  ];
}

export function getSyntheticTelemetryEvents(): SyntheticTelemetryEvent[] {
  const now = new Date();
  const hhmmss = (d: Date) => d.toTimeString().slice(0, 8);
  const mk = (minsAgo: number) => {
    const d = new Date(Date.now() - minsAgo * 60_000);
    return hhmmss(d);
  };

  return [
    {
      id: 'evt_9a1',
      time: mk(1),
      level: 'INFO',
      title: 'CDS Nudge Applied',
      message: 'Adjusted order set to align with renal dosing guideline.',
      tags: ['cds', 'safety', 'dose-check'],
      userId: DEMO_CLINICIAN_ID,
      isDeterminstic: true,
    },
    {
      id: 'evt_9a2',
      time: mk(3),
      level: 'WARN',
      title: 'Missing Allergy Field',
      message: 'Medication order submitted without allergy confirmation; prompted clinician review.',
      tags: ['guardrail', 'compliance'],
      userId: DEMO_CLINICIAN_ID,
    },
    {
      id: 'evt_9a3',
      time: mk(6),
      level: 'CRITICAL',
      title: 'Hard Brake Triggered',
      message: 'Blocked contraindicated medication due to high-risk interaction.',
      tags: ['hard-brake', 'interaction', 'critical'],
      userId: DEMO_CLINICIAN_ID,
      isDeterminstic: true,
    },
    {
      id: 'evt_9a4',
      time: mk(10),
      level: 'INFO',
      title: 'De-ID Vault Check',
      message: 'Validated tokenization policy for outbound document export.',
      tags: ['privacy', 'deid', 'audit'],
      userId: DEMO_CLINICIAN_ID,
    },
  ];
}

