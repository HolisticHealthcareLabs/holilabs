/**
 * CDSS Test Fixtures
 *
 * Mock patient data for testing clinical decision support rules
 */

export const mockPatients = {
  // Patient with drug interaction (Warfarin + Aspirin)
  withDrugInteraction: {
    id: 'patient-drug-interaction',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1960-01-01'),
    medications: [
      { id: 'med-1', name: 'Warfarin', dose: '5mg', isActive: true },
      { id: 'med-2', name: 'Aspirin', dose: '81mg', isActive: true },
    ],
    vitals: [],
    labResults: [],
    allergies: [],
    diagnoses: [],
  },

  // Patient with sepsis risk (high qSOFA score)
  withSepsisRisk: {
    id: 'patient-sepsis-risk',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: new Date('1970-05-15'),
    medications: [],
    vitals: [
      {
        temperature: 38.5,
        heartRate: 115,
        systolicBP: 95,
        diastolicBP: 60,
        respiratoryRate: 24,
        oxygenSaturation: 92,
        createdAt: new Date(),
      },
    ],
    labResults: [],
    allergies: [],
    diagnoses: [],
  },

  // Patient with hypertension not on meds
  withHypertension: {
    id: 'patient-hypertension',
    firstName: 'Bob',
    lastName: 'Johnson',
    dateOfBirth: new Date('1965-03-20'),
    medications: [],
    vitals: [
      {
        temperature: 36.8,
        heartRate: 75,
        systolicBP: 155,
        diastolicBP: 95,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        createdAt: new Date(),
      },
    ],
    labResults: [],
    allergies: [],
    diagnoses: [],
  },

  // Patient with critical lab results
  withCriticalLabs: {
    id: 'patient-critical-labs',
    firstName: 'Alice',
    lastName: 'Williams',
    dateOfBirth: new Date('1955-08-10'),
    medications: [],
    vitals: [],
    labResults: [
      {
        testName: 'Potassium',
        value: '6.5',
        unit: 'mEq/L',
        referenceRange: '3.5-5.0',
        isAbnormal: true,
        isCritical: true,
        createdAt: new Date(),
      },
    ],
    allergies: [],
    diagnoses: [],
  },

  // Patient with overdue preventive care
  withOverduePreventiveCare: {
    id: 'patient-overdue-preventive',
    firstName: 'Charlie',
    lastName: 'Brown',
    dateOfBirth: new Date('1950-12-25'),
    medications: [],
    vitals: [],
    labResults: [],
    allergies: [],
    diagnoses: [],
    lastVisit: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
  },

  // Patient with polypharmacy (≥10 medications)
  withPolypharmacy: {
    id: 'patient-polypharmacy',
    firstName: 'Diana',
    lastName: 'Davis',
    dateOfBirth: new Date('1945-06-30'),
    medications: [
      { id: 'med-1', name: 'Lisinopril', dose: '10mg', isActive: true },
      { id: 'med-2', name: 'Metformin', dose: '500mg', isActive: true },
      { id: 'med-3', name: 'Atorvastatin', dose: '20mg', isActive: true },
      { id: 'med-4', name: 'Aspirin', dose: '81mg', isActive: true },
      { id: 'med-5', name: 'Omeprazole', dose: '20mg', isActive: true },
      { id: 'med-6', name: 'Levothyroxine', dose: '50mcg', isActive: true },
      { id: 'med-7', name: 'Warfarin', dose: '5mg', isActive: true },
      { id: 'med-8', name: 'Furosemide', dose: '40mg', isActive: true },
      { id: 'med-9', name: 'Albuterol', dose: '90mcg', isActive: true },
      { id: 'med-10', name: 'Gabapentin', dose: '300mg', isActive: true },
    ],
    vitals: [],
    labResults: [],
    allergies: [],
    diagnoses: [],
  },

  // Patient with nephrotoxic drugs but no recent creatinine
  withRenalDosingNeed: {
    id: 'patient-renal-dosing',
    firstName: 'Edward',
    lastName: 'Martinez',
    dateOfBirth: new Date('1958-11-05'),
    medications: [
      { id: 'med-1', name: 'Metformin', dose: '1000mg', isActive: true },
      { id: 'med-2', name: 'Lisinopril', dose: '20mg', isActive: true },
    ],
    vitals: [],
    labResults: [
      {
        testName: 'Creatinine',
        value: '1.5',
        unit: 'mg/dL',
        referenceRange: '0.6-1.2',
        isAbnormal: true,
        isCritical: false,
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
      },
    ],
    allergies: [],
    diagnoses: [],
  },

  // Patient on warfarin without recent INR
  withAnticoagulationNeedMonitoring: {
    id: 'patient-anticoag-monitoring',
    firstName: 'Frank',
    lastName: 'Garcia',
    dateOfBirth: new Date('1962-04-18'),
    medications: [
      { id: 'med-1', name: 'Warfarin', dose: '5mg', isActive: true },
    ],
    vitals: [],
    labResults: [
      {
        testName: 'INR',
        value: '2.5',
        unit: '',
        referenceRange: '2.0-3.5',
        isAbnormal: false,
        isCritical: false,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago (>30 days)
      },
    ],
    allergies: [],
    diagnoses: [],
  },

  // Patient on warfarin with INR out of range (too low)
  withINRTooLow: {
    id: 'patient-inr-low',
    firstName: 'Grace',
    lastName: 'Lee',
    dateOfBirth: new Date('1968-09-22'),
    medications: [
      { id: 'med-1', name: 'Warfarin', dose: '5mg', isActive: true },
    ],
    vitals: [],
    labResults: [
      {
        testName: 'INR',
        value: '1.5',
        unit: '',
        referenceRange: '2.0-3.5',
        isAbnormal: true,
        isCritical: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    ],
    allergies: [],
    diagnoses: [],
  },

  // Patient on warfarin with INR out of range (too high)
  withINRTooHigh: {
    id: 'patient-inr-high',
    firstName: 'Henry',
    lastName: 'Wilson',
    dateOfBirth: new Date('1963-02-14'),
    medications: [
      { id: 'med-1', name: 'Warfarin', dose: '5mg', isActive: true },
    ],
    vitals: [],
    labResults: [
      {
        testName: 'INR',
        value: '4.2',
        unit: '',
        referenceRange: '2.0-3.5',
        isAbnormal: true,
        isCritical: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ],
    allergies: [],
    diagnoses: [],
  },

  // Patient with duplicate statin therapy
  withDuplicateTherapy: {
    id: 'patient-duplicate-therapy',
    firstName: 'Irene',
    lastName: 'Anderson',
    dateOfBirth: new Date('1957-07-08'),
    medications: [
      { id: 'med-1', name: 'Atorvastatin', dose: '20mg', isActive: true },
      { id: 'med-2', name: 'Simvastatin', dose: '40mg', isActive: true },
    ],
    vitals: [],
    labResults: [],
    allergies: [],
    diagnoses: [],
  },

  // Healthy patient (no alerts expected)
  healthy: {
    id: 'patient-healthy',
    firstName: 'Jack',
    lastName: 'Thompson',
    dateOfBirth: new Date('1980-03-12'),
    medications: [],
    vitals: [
      {
        temperature: 36.8,
        heartRate: 72,
        systolicBP: 118,
        diastolicBP: 75,
        respiratoryRate: 16,
        oxygenSaturation: 99,
        createdAt: new Date(),
      },
    ],
    labResults: [
      {
        testName: 'Complete Blood Count',
        value: 'WNL',
        unit: '',
        referenceRange: 'Normal',
        isAbnormal: false,
        isCritical: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ],
    allergies: [],
    diagnoses: [],
    lastVisit: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
  },
};

export const mockClinician = {
  id: 'clinician-1',
  firstName: 'Dr.',
  lastName: 'Smith',
  email: 'dr.smith@holilabs.com',
};
