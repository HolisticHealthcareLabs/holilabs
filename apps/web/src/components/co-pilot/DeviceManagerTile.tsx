'use client';

/**
 * Device Manager Tile
 * Comprehensive device and permission management interface
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import CommandCenterTile from './CommandCenterTile';
import { permissionManager, type DeviceSession } from '@/lib/qr/permission-manager';
import type { PermissionScope } from '@/lib/qr/types';

interface DeviceManagerTileProps {
  tileId?: string;
}

export default function DeviceManagerTile({
  tileId = 'device-manager-tile',
}: DeviceManagerTileProps) {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);

  // Load devices on mount
  useEffect(() => {
    loadDevices();

    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadDevices();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadDevices = () => {
    const allDevices = permissionManager.getAllDevices();
    setDevices(allDevices);
  };

  const handleRevokeDevice = (deviceId: string) => {
    permissionManager.revokeAllPermissions(deviceId);
    loadDevices();
    setShowRevokeConfirm(null);
    setSelectedDevice(null);
  };

  const handleTogglePermission = (deviceId: string, permission: PermissionScope) => {
    const currentPermissions = permissionManager.getDevicePermissions(deviceId);
    const hasPermission = currentPermissions.includes(permission);

    if (hasPermission) {
      const newPermissions = currentPermissions.filter((p) => p !== permission);
      permissionManager.updateDevicePermissions(deviceId, newPermissions);
    } else {
      permissionManager.updateDevicePermissions(deviceId, [
        ...currentPermissions,
        permission,
      ]);
    }

    loadDevices();
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'MOBILE_IOS':
      case 'MOBILE_ANDROID':
        return DevicePhoneMobileIcon;
      case 'TABLET':
        return DeviceTabletIcon;
      default:
        return ComputerDesktopIcon;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const isDeviceExpired = (device: DeviceSession) => {
    return Date.now() > device.expiresAt;
  };

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const permissionLabels: Record<PermissionScope, string> = {
    READ_PATIENT_DATA: 'Read Patient Data',
    WRITE_NOTES: 'Write Notes',
    VIEW_TRANSCRIPT: 'View Transcript',
    CONTROL_RECORDING: 'Control Recording',
    ACCESS_DIAGNOSIS: 'Access Diagnosis',
    VIEW_MEDICATIONS: 'View Medications',
    EDIT_SOAP_NOTES: 'Edit SOAP Notes',
    FULL_ACCESS: 'Full Access',
  };

  const selectedDeviceData = devices.find((d) => d.deviceId === selectedDevice);

  return (
    <CommandCenterTile
      id={tileId}
      title="Connected Devices"
      subtitle={`${devices.length} device${devices.length !== 1 ? 's' : ''}`}
      icon={<ShieldCheckIcon className="w-6 h-6 text-blue-600" />}
      size="large"
      variant="glass"
      isDraggable={true}
    >
      <div className="space-y-4">
        {devices.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm mb-2">No connected devices</p>
            <p className="text-gray-400 text-xs">
              Scan a QR code to pair a device
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Device List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Active Devices
              </h3>
              <AnimatePresence>
                {devices.map((device) => {
                  const DeviceIcon = getDeviceIcon(device.deviceType);
                  const isExpired = isDeviceExpired(device);
                  const isSelected = selectedDevice === device.deviceId;

                  return (
                    <motion.button
                      key={device.deviceId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDevice(device.deviceId)}
                      className={`w-full p-4 rounded-xl border-2 transition text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${isExpired ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Device Icon */}
                        <motion.div
                          whileHover={!isExpired ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}}
                          transition={{ duration: 0.5 }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isExpired
                              ? 'bg-gray-100'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                          }`}
                        >
                          <DeviceIcon
                            className={`w-5 h-5 ${
                              isExpired ? 'text-gray-400' : 'text-white'
                            }`}
                          />
                        </motion.div>

                        {/* Device Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {device.deviceType.replace('_', ' ')}
                            </span>
                            {isExpired ? (
                              <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 0] }}
                                transition={{ duration: 0.5, repeat: 2 }}
                              >
                                <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                              </motion.div>
                            ) : (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                              </motion.div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <ClockIcon className="w-3 h-3" />
                            <span>
                              {isExpired ? 'Expired' : getTimeRemaining(device.expiresAt)}
                            </span>
                            <span>•</span>
                            <span>{formatTimestamp(device.lastActive)}</span>
                          </div>

                          <div className="text-xs text-gray-400 mt-1">
                            {device.permissions.length} permission
                            {device.permissions.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Device Details & Permissions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Device Permissions
              </h3>

              {selectedDeviceData ? (
                <div className="space-y-4">
                  {/* Permission Toggles */}
                  <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
                    <div className="space-y-3">
                      {Object.entries(permissionLabels).map(([key, label]) => {
                        const permission = key as PermissionScope;
                        const hasPermission =
                          selectedDeviceData.permissions.includes(permission);

                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Object.keys(permissionLabels).indexOf(key) * 0.05 }}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-700">{label}</span>
                            <motion.button
                              onClick={() =>
                                handleTogglePermission(
                                  selectedDeviceData.deviceId,
                                  permission
                                )
                              }
                              disabled={isDeviceExpired(selectedDeviceData)}
                              whileHover={{ scale: isDeviceExpired(selectedDeviceData) ? 1 : 1.05 }}
                              whileTap={{ scale: isDeviceExpired(selectedDeviceData) ? 1 : 0.95 }}
                              className={`relative w-11 h-6 rounded-full transition disabled:opacity-50 ${
                                hasPermission ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                            >
                              <motion.div
                                animate={{ x: hasPermission ? 20 : 2 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                              />
                              {hasPermission && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="absolute inset-0 bg-blue-400 rounded-full opacity-50"
                                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                                />
                              )}
                            </motion.button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Device Actions */}
                  <div className="space-y-2">
                    {showRevokeConfirm === selectedDeviceData.deviceId ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                      >
                        <motion.p
                          animate={{ x: [0, -2, 2, -2, 0] }}
                          transition={{ duration: 0.4 }}
                          className="text-sm text-red-800 mb-3"
                        >
                          Revoke all permissions for this device?
                        </motion.p>
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleRevokeDevice(selectedDeviceData.deviceId)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                          >
                            Revoke
                          </motion.button>
                          <motion.button
                            onClick={() => setShowRevokeConfirm(null)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition"
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button
                        onClick={() =>
                          setShowRevokeConfirm(selectedDeviceData.deviceId)
                        }
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-300 text-red-700 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                      >
                        <motion.div
                          whileHover={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.4 }}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </motion.div>
                        Revoke All Permissions
                      </motion.button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-gray-50 rounded-xl border-2 border-gray-200 text-center">
                  <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Select a device to manage permissions
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CommandCenterTile>
  );
}
