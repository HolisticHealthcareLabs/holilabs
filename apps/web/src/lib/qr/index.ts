/**
 * QR Code Library
 * Centralized exports for QR code functionality
 */

// Types
export type {
  QRCodePurpose,
  DeviceType,
  PermissionScope,
  QRCodeData,
  DevicePairingQR,
  PermissionShareQR,
  SessionSyncQR,
  DataTransferQR,
  QRPayload,
  QRScanResult,
  QRGenerateOptions,
  QRScannerConfig,
  DevicePairingState,
  PermissionGrantResult,
  QRValidationResult,
} from './types';

// Generator functions
export {
  validateQRPayload,
  createDevicePairingQR,
  createPermissionShareQR,
  createSessionSyncQR,
  createDataTransferQR,
  parseQRData,
  isQRExpired,
  getTimeUntilExpiry,
  refreshQRCode,
} from './generator';
