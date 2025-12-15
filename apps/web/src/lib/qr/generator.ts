/**
 * QR Code Generator
 * Industry-grade QR code generation for device pairing and permission sharing
 */

import QRCode from 'qrcode';
import type {
  QRPayload,
  QRGenerateOptions,
  DevicePairingQR,
  PermissionShareQR,
  SessionSyncQR,
  DataTransferQR,
  PermissionScope,
  DeviceType,
  QRValidationResult,
} from './types';

const DEFAULT_EXPIRY_MINUTES = 5;
const DEFAULT_QR_SIZE = 256;
const PROTOCOL_VERSION = '1.0.0';

/**
 * Generate a 6-digit pairing code
 */
function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate QR code payload
 */
export function validateQRPayload(payload: QRPayload): QRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check version
  if (!payload.version || payload.version !== PROTOCOL_VERSION) {
    errors.push(`Invalid protocol version: ${payload.version}`);
  }

  // Check timestamp
  const now = Date.now();
  if (!payload.timestamp || payload.timestamp > now + 60000) {
    errors.push('Invalid timestamp');
  }

  // Check expiry
  const isExpired = payload.expiresAt <= now;
  if (isExpired) {
    errors.push('QR code has expired');
  }

  // Check if expiring soon (within 30 seconds)
  if (payload.expiresAt - now < 30000) {
    warnings.push('QR code will expire soon');
  }

  // Purpose-specific validation
  switch (payload.purpose) {
    case 'DEVICE_PAIRING': {
      const data = payload as DevicePairingQR;
      if (!data.sessionId || !data.userId || !data.pairingCode) {
        errors.push('Missing required device pairing fields');
      }
      if (data.pairingCode.length !== 6) {
        errors.push('Invalid pairing code format');
      }
      break;
    }
    case 'PERMISSION_SHARE': {
      const data = payload as PermissionShareQR;
      if (!data.sessionId || !data.permissions || data.permissions.length === 0) {
        errors.push('Missing required permission fields');
      }
      break;
    }
    case 'SESSION_SYNC': {
      const data = payload as SessionSyncQR;
      if (!data.sessionId || !data.syncMode) {
        errors.push('Missing required session sync fields');
      }
      break;
    }
    case 'DATA_TRANSFER': {
      const data = payload as DataTransferQR;
      if (!data.dataType || !data.dataId) {
        errors.push('Missing required data transfer fields');
      }
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    isExpired,
    errors,
    warnings,
  };
}

/**
 * Create device pairing QR code
 */
export async function createDevicePairingQR(
  userId: string,
  userEmail: string,
  userName: string,
  deviceId: string,
  deviceType: DeviceType,
  options?: QRGenerateOptions
): Promise<{ dataUrl: string; payload: DevicePairingQR; pairingCode: string }> {
  const now = Date.now();
  const pairingCode = generatePairingCode();
  const sessionId = generateSessionId();

  const payload: DevicePairingQR = {
    version: PROTOCOL_VERSION,
    purpose: 'DEVICE_PAIRING',
    timestamp: now,
    expiresAt: now + DEFAULT_EXPIRY_MINUTES * 60 * 1000,
    sessionId,
    userId,
    userEmail,
    userName,
    deviceId,
    deviceType,
    pairingCode,
  };

  const dataUrl = await generateQRCode(payload, options);

  return { dataUrl, payload, pairingCode };
}

/**
 * Create permission sharing QR code
 */
export async function createPermissionShareQR(
  userId: string,
  sessionId: string,
  deviceId: string,
  permissions: PermissionScope[],
  requiresConfirmation: boolean = true,
  options?: QRGenerateOptions
): Promise<{ dataUrl: string; payload: PermissionShareQR }> {
  const now = Date.now();

  const payload: PermissionShareQR = {
    version: PROTOCOL_VERSION,
    purpose: 'PERMISSION_SHARE',
    timestamp: now,
    expiresAt: now + DEFAULT_EXPIRY_MINUTES * 60 * 1000,
    sessionId,
    userId,
    permissions,
    deviceId,
    requiresConfirmation,
  };

  const dataUrl = await generateQRCode(payload, options);

  return { dataUrl, payload };
}

/**
 * Create session sync QR code
 */
export async function createSessionSyncQR(
  sessionId: string,
  syncMode: 'FULL' | 'INCREMENTAL',
  patientId?: string,
  clinicalDataHash?: string,
  options?: QRGenerateOptions
): Promise<{ dataUrl: string; payload: SessionSyncQR }> {
  const now = Date.now();

  const payload: SessionSyncQR = {
    version: PROTOCOL_VERSION,
    purpose: 'SESSION_SYNC',
    timestamp: now,
    expiresAt: now + DEFAULT_EXPIRY_MINUTES * 60 * 1000,
    sessionId,
    patientId,
    clinicalDataHash,
    syncMode,
  };

  const dataUrl = await generateQRCode(payload, options);

  return { dataUrl, payload };
}

/**
 * Create data transfer QR code
 */
export async function createDataTransferQR(
  dataType: 'TRANSCRIPT' | 'SOAP_NOTE' | 'DIAGNOSIS' | 'LAB_RESULTS',
  dataId: string,
  encryptionKey?: string,
  compressionEnabled: boolean = false,
  options?: QRGenerateOptions
): Promise<{ dataUrl: string; payload: DataTransferQR }> {
  const now = Date.now();

  const payload: DataTransferQR = {
    version: PROTOCOL_VERSION,
    purpose: 'DATA_TRANSFER',
    timestamp: now,
    expiresAt: now + DEFAULT_EXPIRY_MINUTES * 60 * 1000,
    dataType,
    dataId,
    encryptionKey,
    compressionEnabled,
  };

  const dataUrl = await generateQRCode(payload, options);

  return { dataUrl, payload };
}

/**
 * Generate QR code from payload
 */
async function generateQRCode(
  payload: QRPayload,
  options?: QRGenerateOptions
): Promise<string> {
  const jsonString = JSON.stringify(payload);

  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    type: 'image/png',
    margin: options?.margin || 4,
    width: options?.size || DEFAULT_QR_SIZE,
    color: {
      dark: options?.colorDark || '#000000',
      light: options?.colorLight || '#ffffff',
    },
  };

  try {
    const dataUrl = await QRCode.toDataURL(jsonString, qrOptions);
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('QR code generation failed');
  }
}

/**
 * Parse QR code data
 */
export function parseQRData(rawData: string): QRPayload | null {
  try {
    const payload = JSON.parse(rawData) as QRPayload;
    return payload;
  } catch (error) {
    console.error('Failed to parse QR data:', error);
    return null;
  }
}

/**
 * Check if QR code is expired
 */
export function isQRExpired(payload: QRPayload): boolean {
  return payload.expiresAt <= Date.now();
}

/**
 * Get time until expiry in seconds
 */
export function getTimeUntilExpiry(payload: QRPayload): number {
  const remainingMs = payload.expiresAt - Date.now();
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Refresh QR code (generate new one with same data but updated timestamps)
 */
export async function refreshQRCode(
  payload: QRPayload,
  options?: QRGenerateOptions
): Promise<{ dataUrl: string; payload: QRPayload }> {
  const now = Date.now();
  const newPayload: QRPayload = {
    ...payload,
    timestamp: now,
    expiresAt: now + DEFAULT_EXPIRY_MINUTES * 60 * 1000,
  };

  const dataUrl = await generateQRCode(newPayload, options);

  return { dataUrl, payload: newPayload };
}
