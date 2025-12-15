/**
 * Permission Manager for QR-based device pairing
 * Handles permission grants, validation, and session management
 */

import type {
  PermissionScope,
  PermissionGrantResult,
  PermissionShareQR,
  DevicePairingQR,
} from './types';

interface PermissionSession {
  sessionId: string;
  userId: string;
  deviceId: string;
  permissions: PermissionScope[];
  grantedAt: number;
  expiresAt: number;
  isActive: boolean;
}

export interface DeviceSession {
  deviceId: string;
  deviceType: 'DESKTOP' | 'MOBILE_IOS' | 'MOBILE_ANDROID' | 'TABLET';
  pairedAt: number;
  lastActive: number;
  expiresAt: number;
  permissions: PermissionScope[];
}

class PermissionManager {
  private static instance: PermissionManager;
  private sessions: Map<string, PermissionSession> = new Map();
  private devices: Map<string, DeviceSession> = new Map();

  private constructor() {
    // Load sessions from localStorage if available
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Grant permissions based on QR code scan
   */
  async grantPermissions(
    qrPayload: PermissionShareQR | DevicePairingQR
  ): Promise<PermissionGrantResult> {
    try {
      // Validate QR code is not expired
      if (qrPayload.expiresAt <= Date.now()) {
        return {
          success: false,
          grantedPermissions: [],
          deniedPermissions: [],
          sessionId: qrPayload.sessionId,
          expiresAt: qrPayload.expiresAt,
          error: 'QR code has expired',
        };
      }

      // Extract permissions based on QR type
      const permissions: PermissionScope[] =
        qrPayload.purpose === 'PERMISSION_SHARE'
          ? qrPayload.permissions
          : ['READ_PATIENT_DATA', 'VIEW_TRANSCRIPT', 'VIEW_MEDICATIONS']; // Default for device pairing

      // Create permission session
      const session: PermissionSession = {
        sessionId: qrPayload.sessionId,
        userId: qrPayload.userId,
        deviceId:
          qrPayload.purpose === 'DEVICE_PAIRING'
            ? qrPayload.deviceId
            : qrPayload.deviceId,
        permissions,
        grantedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        isActive: true,
      };

      // Store session
      this.sessions.set(session.sessionId, session);

      // Register device if it's a pairing QR
      if (qrPayload.purpose === 'DEVICE_PAIRING') {
        const deviceSession: DeviceSession = {
          deviceId: qrPayload.deviceId,
          deviceType: qrPayload.deviceType,
          pairedAt: Date.now(),
          lastActive: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
          permissions,
        };
        this.devices.set(deviceSession.deviceId, deviceSession);
      }

      // Save to storage
      this.saveToStorage();

      return {
        success: true,
        grantedPermissions: permissions,
        deniedPermissions: [],
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      console.error('Failed to grant permissions:', error);
      return {
        success: false,
        grantedPermissions: [],
        deniedPermissions: [],
        sessionId: qrPayload.sessionId,
        expiresAt: qrPayload.expiresAt,
        error: 'Failed to grant permissions',
      };
    }
  }

  /**
   * Check if a device has a specific permission
   */
  hasPermission(deviceId: string, permission: PermissionScope): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    // Check if device has FULL_ACCESS
    if (device.permissions.includes('FULL_ACCESS')) return true;

    // Check specific permission
    return device.permissions.includes(permission);
  }

  /**
   * Get all permissions for a device
   */
  getDevicePermissions(deviceId: string): PermissionScope[] {
    const device = this.devices.get(deviceId);
    return device?.permissions || [];
  }

  /**
   * Revoke permissions for a device
   */
  revokeDevicePermissions(deviceId: string): void {
    this.devices.delete(deviceId);

    // Also remove all sessions for this device
    const sessionsToRemove: string[] = [];
    this.sessions.forEach((session, sessionId) => {
      if (session.deviceId === deviceId) {
        sessionsToRemove.push(sessionId);
      }
    });

    sessionsToRemove.forEach((sessionId) => {
      this.sessions.delete(sessionId);
    });

    this.saveToStorage();
  }

  /**
   * Update device permissions
   */
  updateDevicePermissions(deviceId: string, permissions: PermissionScope[]): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.permissions = permissions;
    device.lastActive = Date.now();

    this.devices.set(deviceId, device);
    this.saveToStorage();

    return true;
  }

  /**
   * Get all paired devices
   */
  getPairedDevices(): DeviceSession[] {
    return Array.from(this.devices.values());
  }

  /**
   * Check if a session is active
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Check if session is expired
    if (session.expiresAt <= Date.now()) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
      this.saveToStorage();
      return false;
    }

    return session.isActive;
  }

  /**
   * Revoke a session
   */
  revokeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
      this.saveToStorage();
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): PermissionSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.isActive);
  }

  /**
   * Clean up expired sessions and inactive devices
   */
  cleanup(): void {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Remove expired sessions
    this.sessions.forEach((session, sessionId) => {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId);
      }
    });

    // Remove inactive devices (no activity for 7 days)
    this.devices.forEach((device, deviceId) => {
      if (now - device.lastActive > 7 * ONE_DAY) {
        this.devices.delete(deviceId);
      }
    });

    this.saveToStorage();
  }

  /**
   * Update device last active timestamp
   */
  updateDeviceActivity(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastActive = Date.now();
      this.devices.set(deviceId, device);
      this.saveToStorage();
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        devices: Array.from(this.devices.entries()),
      };

      localStorage.setItem('qr_permission_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save permissions to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('qr_permission_data');
      if (!stored) return;

      const data = JSON.parse(stored);

      if (data.sessions) {
        this.sessions = new Map(data.sessions);
      }

      if (data.devices) {
        this.devices = new Map(data.devices);
      }

      // Clean up on load
      this.cleanup();
    } catch (error) {
      console.error('Failed to load permissions from storage:', error);
    }
  }

  /**
   * Get all devices (alias for getPairedDevices)
   */
  getAllDevices(): DeviceSession[] {
    return this.getPairedDevices();
  }

  /**
   * Revoke all permissions for a device (alias for revokeDevicePermissions)
   */
  revokeAllPermissions(deviceId: string): void {
    this.revokeDevicePermissions(deviceId);
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.sessions.clear();
    this.devices.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qr_permission_data');
    }
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance();

// Export types
export type { PermissionSession };
