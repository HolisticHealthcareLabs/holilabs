/**
 * Synthetic demo data (NON-PHI).
 *
 * Used to make the product feel "alive" when running locally or in demo mode
 * without requiring Postgres/Meilisearch/etc.
 */

export const DEMO_CLINICIAN_ID = 'demo-clinician-id' as const;
export const DEMO_CLINICIAN_EMAIL = 'demo-clinician@holilabs.xyz' as const;

export function isDemoClinician(userId?: string | null, email?: string | null) {
  return userId === DEMO_CLINICIAN_ID || email === DEMO_CLINICIAN_EMAIL;
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

