/**
 * Demo Data Generator
 * Creates realistic sample patients for demo mode
 * FREE - No external services needed
 */

export interface DemoPatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  ageBand: string;
  region: string;
  isPalliativeCare: boolean;
  hasSpecialNeeds: boolean;
  isActive: boolean;
  // Medical info for demo
  conditions: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  lastVisit: Date;
  nextAppointment?: Date;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DemoAppointment {
  id: string;
  patientId: string;
  patientName: string;
  date: Date;
  reason: string;
  type: 'IN_PERSON' | 'VIDEO' | 'PHONE';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

const FIRST_NAMES = {
  MALE: ['Juan', 'Carlos', 'José', 'Pedro', 'Luis', 'Miguel', 'Antonio', 'Francisco'],
  FEMALE: ['María', 'Ana', 'Carmen', 'Isabel', 'Rosa', 'Elena', 'Patricia', 'Sofia'],
};

const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez'];

const CONDITIONS = [
  'Hypertension',
  'Type 2 Diabetes',
  'Hyperlipidemia',
  'Asthma',
  'COPD',
  'Arthritis',
  'Anxiety',
  'Depression',
  'Hypothyroidism',
  'Chronic Pain',
];

const MEDICATIONS = [
  { name: 'Metformin', dosage: '500mg', frequency: '2x daily' },
  { name: 'Lisinopril', dosage: '10mg', frequency: '1x daily' },
  { name: 'Atorvastatin', dosage: '20mg', frequency: '1x daily' },
  { name: 'Albuterol', dosage: '90mcg', frequency: 'As needed' },
  { name: 'Omeprazole', dosage: '20mg', frequency: '1x daily' },
  { name: 'Levothyroxine', dosage: '75mcg', frequency: '1x daily' },
  { name: 'Gabapentin', dosage: '300mg', frequency: '3x daily' },
];

const VISIT_REASONS = [
  'Annual physical',
  'Follow-up visit',
  'Medication review',
  'Lab result discussion',
  'Blood pressure check',
  'Diabetes management',
  'Pain management',
  'Respiratory symptoms',
];

/**
 * Generate a realistic demo patient
 */
export function generateDemoPatient(index: number): DemoPatient {
  const gender = Math.random() > 0.5 ? 'FEMALE' : 'MALE';
  const firstName = FIRST_NAMES[gender][Math.floor(Math.random() * FIRST_NAMES[gender].length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

  const age = 30 + Math.floor(Math.random() * 50); // 30-80 years old
  const dateOfBirth = new Date();
  dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);

  // Risk level based on age and conditions
  const numConditions = Math.floor(Math.random() * 4);
  const conditions = CONDITIONS.sort(() => 0.5 - Math.random()).slice(0, numConditions);
  const riskLevel = age > 65 || numConditions >= 3 ? 'HIGH' : numConditions >= 2 ? 'MEDIUM' : 'LOW';

  // Medications based on conditions
  const medications = MEDICATIONS.sort(() => 0.5 - Math.random()).slice(0, numConditions);

  // Last visit (1-90 days ago)
  const lastVisit = new Date();
  lastVisit.setDate(lastVisit.getDate() - Math.floor(Math.random() * 90));

  // Next appointment (some patients have upcoming appointments)
  const hasUpcoming = Math.random() > 0.5;
  const nextAppointment = hasUpcoming ? new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) : undefined;

  return {
    id: `demo-patient-${index}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.com`,
    phone: `+55 11 ${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 9000) + 1000}`,
    dateOfBirth,
    gender,
    ageBand: age < 40 ? '30-40' : age < 50 ? '40-50' : age < 60 ? '50-60' : age < 70 ? '60-70' : '70+',
    region: 'São Paulo',
    isPalliativeCare: riskLevel === 'HIGH' && Math.random() > 0.7,
    hasSpecialNeeds: Math.random() > 0.8,
    isActive: true,
    conditions,
    medications,
    lastVisit,
    nextAppointment,
    riskLevel,
  };
}

/**
 * Generate multiple demo patients
 */
export function generateDemoPatients(count: number = 10): DemoPatient[] {
  return Array.from({ length: count }, (_, i) => generateDemoPatient(i));
}

/**
 * Generate demo appointments
 */
export function generateDemoAppointments(patients: DemoPatient[]): DemoAppointment[] {
  const appointments: DemoAppointment[] = [];

  patients.forEach((patient, index) => {
    // Some patients have upcoming appointments
    if (patient.nextAppointment) {
      appointments.push({
        id: `demo-appt-${index}`,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        date: patient.nextAppointment,
        reason: VISIT_REASONS[Math.floor(Math.random() * VISIT_REASONS.length)],
        type: Math.random() > 0.7 ? 'VIDEO' : 'IN_PERSON',
        status: 'SCHEDULED',
      });
    }

    // Add some completed appointments
    if (Math.random() > 0.5) {
      const completedDate = new Date(patient.lastVisit);
      appointments.push({
        id: `demo-appt-completed-${index}`,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        date: completedDate,
        reason: VISIT_REASONS[Math.floor(Math.random() * VISIT_REASONS.length)],
        type: 'IN_PERSON',
        status: 'COMPLETED',
      });
    }
  });

  return appointments.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get demo statistics
 */
export function getDemoStats(patients: DemoPatient[]) {
  return {
    totalPatients: patients.length,
    activePatients: patients.filter(p => p.isActive).length,
    highRiskPatients: patients.filter(p => p.riskLevel === 'HIGH').length,
    palliativeCarePatients: patients.filter(p => p.isPalliativeCare).length,
    patientsWithUpcomingAppointments: patients.filter(p => p.nextAppointment).length,
    averageAge: Math.round(patients.reduce((sum, p) => {
      const age = new Date().getFullYear() - p.dateOfBirth.getFullYear();
      return sum + age;
    }, 0) / patients.length),
  };
}

/**
 * Check if demo mode is enabled
 */
export function isDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('demo_mode') === 'true';
}

/**
 * Toggle demo mode
 */
export function toggleDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const currentMode = isDemoModeEnabled();
  const newMode = !currentMode;
  localStorage.setItem('demo_mode', newMode.toString());
  return newMode;
}

/**
 * Enable demo mode
 */
export function enableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('demo_mode', 'true');
}

/**
 * Disable demo mode
 */
export function disableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('demo_mode', 'false');
}
