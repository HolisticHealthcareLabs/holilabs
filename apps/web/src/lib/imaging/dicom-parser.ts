/**
 * DICOM Parser Utility
 * Extracts metadata from DICOM medical imaging files
 *
 * Uses dcmjs library to parse DICOM files and extract:
 * - Patient information (anonymized for HIPAA)
 * - Study metadata (modality, body part, date)
 * - Series information (sequence details)
 * - Image acquisition parameters
 * - Equipment information
 */

import * as dcmjs from 'dcmjs';

export interface DicomMetadata {
  // Study-level metadata
  study: {
    studyInstanceUID: string;
    studyDate?: string;
    studyTime?: string;
    studyDescription?: string;
    accessionNumber?: string;
    studyID?: string;
  };

  // Series-level metadata
  series: {
    seriesInstanceUID: string;
    seriesNumber?: number;
    seriesDescription?: string;
    modality: string;
    bodyPartExamined?: string;
    laterality?: string; // Left, Right, Bilateral
    patientPosition?: string; // HFS (Head First-Supine), etc.
    protocolName?: string;
  };

  // Image acquisition parameters
  acquisition?: {
    sliceThickness?: number;
    pixelSpacing?: number[];
    imageOrientationPatient?: number[];
    contrastBolusAgent?: string;
    kvp?: number; // X-Ray tube voltage
    exposureTime?: number;
    xRayTubeCurrent?: number;
    repetitionTime?: number; // MRI
    echoTime?: number; // MRI
    imagingFrequency?: number; // MRI
    fieldOfViewDimensions?: number[];
  };

  // Equipment information
  equipment?: {
    manufacturer?: string;
    manufacturerModelName?: string;
    stationName?: string;
    softwareVersions?: string;
    institutionName?: string;
    institutionalDepartmentName?: string;
  };

  // Image dimensions
  image?: {
    rows?: number;
    columns?: number;
    bitsAllocated?: number;
    bitsStored?: number;
    numberOfFrames?: number;
    photometricInterpretation?: string;
  };

  // Patient demographics (HIPAA-compliant - only clinical metadata)
  patient?: {
    patientSex?: string;
    patientAge?: string;
    patientSize?: number; // Height in meters
    patientWeight?: number; // Weight in kg
  };

  // Raw DICOM tags (for advanced use cases)
  rawTags?: Record<string, any>;
}

/**
 * Parse DICOM file buffer and extract metadata
 */
export async function parseDicomFile(buffer: Buffer): Promise<DicomMetadata> {
  try {
    // Parse DICOM file using dcmjs
    const dicomData = dcmjs.data.DicomMessage.readFile(buffer.buffer as ArrayBuffer);
    const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);

    // Extract study-level metadata
    const study = {
      studyInstanceUID: dataset.StudyInstanceUID || '',
      studyDate: dataset.StudyDate,
      studyTime: dataset.StudyTime,
      studyDescription: dataset.StudyDescription,
      accessionNumber: dataset.AccessionNumber,
      studyID: dataset.StudyID,
    };

    // Extract series-level metadata
    const series = {
      seriesInstanceUID: dataset.SeriesInstanceUID || '',
      seriesNumber: dataset.SeriesNumber,
      seriesDescription: dataset.SeriesDescription,
      modality: dataset.Modality || 'UNKNOWN',
      bodyPartExamined: dataset.BodyPartExamined,
      laterality: dataset.Laterality,
      patientPosition: dataset.PatientPosition,
      protocolName: dataset.ProtocolName,
    };

    // Extract image acquisition parameters
    const acquisition = {
      sliceThickness: dataset.SliceThickness,
      pixelSpacing: dataset.PixelSpacing,
      imageOrientationPatient: dataset.ImageOrientationPatient,
      contrastBolusAgent: dataset.ContrastBolusAgent,
      kvp: dataset.KVP,
      exposureTime: dataset.ExposureTime,
      xRayTubeCurrent: dataset.XRayTubeCurrent,
      repetitionTime: dataset.RepetitionTime,
      echoTime: dataset.EchoTime,
      imagingFrequency: dataset.ImagingFrequency,
      fieldOfViewDimensions: dataset.FieldOfViewDimensions,
    };

    // Extract equipment information
    const equipment = {
      manufacturer: dataset.Manufacturer,
      manufacturerModelName: dataset.ManufacturerModelName,
      stationName: dataset.StationName,
      softwareVersions: dataset.SoftwareVersions,
      institutionName: dataset.InstitutionName,
      institutionalDepartmentName: dataset.InstitutionalDepartmentName,
    };

    // Extract image dimensions
    const image = {
      rows: dataset.Rows,
      columns: dataset.Columns,
      bitsAllocated: dataset.BitsAllocated,
      bitsStored: dataset.BitsStored,
      numberOfFrames: dataset.NumberOfFrames,
      photometricInterpretation: dataset.PhotometricInterpretation,
    };

    // Extract HIPAA-compliant patient demographics (clinical only, no PHI)
    const patient = {
      patientSex: dataset.PatientSex,
      patientAge: dataset.PatientAge,
      patientSize: dataset.PatientSize,
      patientWeight: dataset.PatientWeight,
    };

    return {
      study,
      series,
      acquisition: Object.keys(acquisition).length > 0 ? acquisition : undefined,
      equipment: Object.keys(equipment).length > 0 ? equipment : undefined,
      image: Object.keys(image).length > 0 ? image : undefined,
      patient: Object.keys(patient).length > 0 ? patient : undefined,
    };
  } catch (error) {
    throw new Error(`Failed to parse DICOM file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if a file is a valid DICOM file
 */
export function isDicomFile(buffer: Buffer): boolean {
  try {
    // DICOM files start with a 128-byte preamble followed by "DICM"
    if (buffer.length < 132) return false;

    const dicmMarker = buffer.toString('utf8', 128, 132);
    return dicmMarker === 'DICM';
  } catch {
    return false;
  }
}

/**
 * Extract human-readable modality name
 */
export function getModalityName(modalityCode: string): string {
  const modalityNames: Record<string, string> = {
    'CR': 'Computed Radiography',
    'CT': 'Computed Tomography',
    'MR': 'Magnetic Resonance',
    'US': 'Ultrasound',
    'XA': 'X-Ray Angiography',
    'RF': 'Radiofluoroscopy',
    'DX': 'Digital Radiography',
    'MG': 'Mammography',
    'PT': 'Positron Emission Tomography',
    'NM': 'Nuclear Medicine',
    'ES': 'Endoscopy',
    'XC': 'External Camera Photography',
    'SC': 'Secondary Capture',
    'BI': 'Biomagnetic Imaging',
    'CD': 'Color Flow Doppler',
    'DD': 'Duplex Doppler',
    'DG': 'Diaphanography',
    'ECG': 'Electrocardiography',
    'EPS': 'Cardiac Electrophysiology',
    'GM': 'General Microscopy',
    'HD': 'Hemodynamic Waveform',
    'IO': 'Intra-Oral Radiography',
    'IVUS': 'Intravascular Ultrasound',
    'LS': 'Laser Surface Scan',
    'OT': 'Other',
    'PX': 'Panoramic X-Ray',
    'ST': 'Single-Photon Emission Computed Tomography',
    'TG': 'Thermography',
  };

  return modalityNames[modalityCode] || modalityCode;
}

/**
 * Extract searchable body part from DICOM metadata
 * Normalizes variations (e.g., "CHEST", "Chest", "chest" -> "Chest")
 */
export function normalizeBodyPart(bodyPart?: string): string {
  if (!bodyPart) return 'Unknown';

  const normalized = bodyPart.toLowerCase().trim();

  // Common body part mappings
  const bodyPartMap: Record<string, string> = {
    'chest': 'Chest',
    'thorax': 'Chest',
    'abdomen': 'Abdomen',
    'pelvis': 'Pelvis',
    'head': 'Head',
    'brain': 'Brain',
    'skull': 'Head',
    'spine': 'Spine',
    'cspine': 'Cervical Spine',
    'tspine': 'Thoracic Spine',
    'lspine': 'Lumbar Spine',
    'knee': 'Knee',
    'shoulder': 'Shoulder',
    'ankle': 'Ankle',
    'wrist': 'Wrist',
    'hand': 'Hand',
    'foot': 'Foot',
    'hip': 'Hip',
    'elbow': 'Elbow',
    'neck': 'Neck',
  };

  return bodyPartMap[normalized] || bodyPart;
}

/**
 * Generate a summary description from DICOM metadata
 */
export function generateStudyDescription(metadata: DicomMetadata): string {
  const { series, acquisition } = metadata;

  let description = '';

  // Add modality
  if (series.modality) {
    description += getModalityName(series.modality);
  }

  // Add body part
  if (series.bodyPartExamined) {
    description += ` of ${normalizeBodyPart(series.bodyPartExamined)}`;
  }

  // Add laterality if present
  if (series.laterality) {
    description += ` (${series.laterality})`;
  }

  // Add contrast info if present
  if (acquisition?.contrastBolusAgent) {
    description += ' with contrast';
  }

  // Add protocol if present
  if (series.protocolName) {
    description += ` - ${series.protocolName}`;
  }

  return description || 'Medical Imaging Study';
}

/**
 * Sanitize DICOM metadata to remove PHI (Protected Health Information)
 * This ensures HIPAA compliance by removing patient identifiers
 */
export function sanitizeDicomMetadata(metadata: DicomMetadata): DicomMetadata {
  // Remove any potential PHI from equipment information
  const sanitizedEquipment = metadata.equipment ? {
    ...metadata.equipment,
    institutionName: undefined, // Remove institution name
    institutionalDepartmentName: undefined,
  } : undefined;

  return {
    ...metadata,
    equipment: sanitizedEquipment,
    // Keep only clinical demographics, not identifiers
    patient: metadata.patient,
    // Don't include raw tags (may contain PHI)
    rawTags: undefined,
  };
}
