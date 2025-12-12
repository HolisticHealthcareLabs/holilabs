/**
 * Common Constants for Medical Validation
 */

// ============================================================================
// FIELD LIMITS
// ============================================================================

export const PATIENT_FIELD_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 }, // RFC 5322
  phone: { min: 10, max: 20 }, // E.164 format
  address: { max: 500 },
};

export const CLINICAL_FIELD_LIMITS = {
  chiefComplaint: { max: 500 },
  soapSection: { max: 10000 }, // Each SOAP section
  medicationName: { max: 200 },
  dosage: { max: 50 },
  instructions: { max: 1000 },

  // Codes
  icd10: { length: [3, 7] }, // e.g., "J06" or "J06.9"
  cpt: { length: 5 }, // Always 5 digits
};

export const AUDIO_LIMITS = {
  size: { min: 1024, max: 100 * 1024 * 1024 }, // 1KB - 100MB
  duration: { min: 10, max: 60 * 60 }, // 10 seconds - 1 hour
};

// ============================================================================
// VITAL SIGNS RANGES (WHO/AHA Standards)
// ============================================================================

export const VITAL_SIGNS_RANGES = {
  // Blood Pressure (mmHg)
  systolicBP: { min: 50, max: 250 },
  diastolicBP: { min: 30, max: 200 },

  // Heart Rate (bpm)
  heartRate: { min: 30, max: 250 },

  // Temperature (°C)
  temperature: { min: 35.0, max: 42.0 },

  // Respiratory Rate (breaths/min)
  respiratoryRate: { min: 8, max: 60 },

  // Oxygen Saturation (%)
  spo2: { min: 70, max: 100 },

  // Weight (kg)
  weight: { min: 0.5, max: 500 },

  // Height (cm)
  height: { min: 40, max: 250 },
};
