/**
 * QR Code Types and Interfaces
 * For device pairing and permission sharing between clinician devices
 */

export type QRCodePurpose = 'DEVICE_PAIRING' | 'PERMISSION_SHARE' | 'SESSION_SYNC' | 'DATA_TRANSFER';

export type DeviceType = 'DESKTOP' | 'MOBILE_IOS' | 'MOBILE_ANDROID' | 'TABLET';

export type PermissionScope =
  | 'READ_PATIENT_DATA'
  | 'WRITE_NOTES'
  | 'VIEW_TRANSCRIPT'
  | 'CONTROL_RECORDING'
  | 'ACCESS_DIAGNOSIS'
  | 'VIEW_MEDICATIONS'
  | 'EDIT_SOAP_NOTES'
  | 'FULL_ACCESS';

/**
 * Base QR code data structure
 */
export interface QRCodeData {
  version: string; // Protocol version (e.g., '1.0.0')
  purpose: QRCodePurpose;
  timestamp: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  signature?: string; // Optional cryptographic signature
}

/**
 * Device pairing QR code payload
 */
export interface DevicePairingQR extends QRCodeData {
  purpose: 'DEVICE_PAIRING';
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  deviceId: string;
  deviceType: DeviceType;
  pairingCode: string; // 6-digit verification code
}

/**
 * Permission sharing QR code payload
 */
export interface PermissionShareQR extends QRCodeData {
  purpose: 'PERMISSION_SHARE';
  sessionId: string;
  userId: string;
  permissions: PermissionScope[];
  deviceId: string;
  requiresConfirmation: boolean;
}

/**
 * Session sync QR code payload
 */
export interface SessionSyncQR extends QRCodeData {
  purpose: 'SESSION_SYNC';
  sessionId: string;
  patientId?: string;
  clinicalDataHash?: string; // Hash of current clinical data for verification
  syncMode: 'FULL' | 'INCREMENTAL';
}

/**
 * Data transfer QR code payload
 */
export interface DataTransferQR extends QRCodeData {
  purpose: 'DATA_TRANSFER';
  dataType: 'TRANSCRIPT' | 'SOAP_NOTE' | 'DIAGNOSIS' | 'LAB_RESULTS';
  dataId: string;
  encryptionKey?: string;
  compressionEnabled: boolean;
}

/**
 * Union type of all QR code payloads
 */
export type QRPayload = DevicePairingQR | PermissionShareQR | SessionSyncQR | DataTransferQR;

/**
 * QR code scan result
 */
export interface QRScanResult {
  rawData: string;
  payload: QRPayload | null;
  isValid: boolean;
  error?: string;
  scannedAt: number;
  format: string;
}

/**
 * QR code generation options
 */
export interface QRGenerateOptions {
  size?: number; // Size in pixels (default: 256)
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // Default: 'M'
  margin?: number; // Margin in modules (default: 4)
  colorDark?: string; // Dark color (default: '#000000')
  colorLight?: string; // Light color (default: '#ffffff')
  includeMargin?: boolean;
}

/**
 * QR code scanner configuration
 */
export interface QRScannerConfig {
  fps?: number; // Frames per second (default: 10)
  qrbox?: number | { width: number; height: number }; // Scanning box size
  aspectRatio?: number; // Camera aspect ratio (default: 1.0)
  disableFlip?: boolean; // Disable horizontal flip
  videoConstraints?: MediaTrackConstraints;
}

/**
 * Device pairing state
 */
export interface DevicePairingState {
  status: 'IDLE' | 'GENERATING' | 'WAITING' | 'PAIRED' | 'ERROR' | 'EXPIRED';
  qrCodeDataUrl?: string;
  pairingCode?: string;
  pairedDeviceId?: string;
  pairedDeviceType?: DeviceType;
  expiresAt?: number;
  error?: string;
}

/**
 * Permission grant result
 */
export interface PermissionGrantResult {
  success: boolean;
  grantedPermissions: PermissionScope[];
  deniedPermissions: PermissionScope[];
  sessionId: string;
  expiresAt: number;
  error?: string;
}

/**
 * QR code validation result
 */
export interface QRValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isSignatureValid?: boolean;
  errors: string[];
  warnings: string[];
}
