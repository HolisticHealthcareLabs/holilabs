-- Add recording consent fields to patients table
-- Two-party consent states: CA, CT, FL, IL, MD, MA, MT, NV, NH, PA, WA

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS recording_consent_given BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_consent_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS recording_consent_method TEXT,
ADD COLUMN IF NOT EXISTS recording_consent_state TEXT,
ADD COLUMN IF NOT EXISTS recording_consent_withdrawn_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS recording_consent_language TEXT,
ADD COLUMN IF NOT EXISTS recording_consent_version TEXT,
ADD COLUMN IF NOT EXISTS recording_consent_signature TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_recording_consent ON patients(recording_consent_given, recording_consent_state);

-- Add comment for documentation
COMMENT ON COLUMN patients.recording_consent_given IS 'Two-party consent state compliance (CA, CT, FL, IL, MD, MA, MT, NV, NH, PA, WA)';
