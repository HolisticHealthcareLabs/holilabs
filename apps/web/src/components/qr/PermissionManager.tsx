'use client';

/**
 * Permission Manager UI Component
 * Displays and manages device permissions and sessions
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { permissionManager, type DeviceSession } from '@/lib/qr/permission-manager';
import type { PermissionScope } from '@/lib/qr/types';

const PERMISSION_LABELS: Record<PermissionScope, { label: string; description: string }> = {
  READ_PATIENT_DATA: {
    label: 'Read Patient Data',
    description: 'View patient demographics and medical history',
  },
  WRITE_NOTES: {
    label: 'Write Notes',
    description: 'Create and edit clinical notes',
  },
  VIEW_TRANSCRIPT: {
    label: 'View Transcript',
    description: 'Access live transcription of consultations',
  },
  CONTROL_RECORDING: {
    label: 'Control Recording',
    description: 'Start and stop audio recording',
  },
  ACCESS_DIAGNOSIS: {
    label: 'Access Diagnosis',
    description: 'View AI-generated diagnosis suggestions',
  },
  VIEW_MEDICATIONS: {
    label: 'View Medications',
    description: 'Access patient medication list',
  },
  EDIT_SOAP_NOTES: {
    label: 'Edit SOAP Notes',
    description: 'Modify SOAP note sections',
  },
  FULL_ACCESS: {
    label: 'Full Access',
    description: 'Complete control over all features',
  },
};

interface PermissionManagerProps {
  onClose?: () => void;
}

export default function PermissionManagerComponent({ onClose }: PermissionManagerProps) {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = () => {
    const pairedDevices = permissionManager.getPairedDevices();
    setDevices(pairedDevices);
  };

  const handleRevokeDevice = (deviceId: string) => {
    permissionManager.revokeDevicePermissions(deviceId);
    loadDevices();
    if (selectedDevice === deviceId) {
      setSelectedDevice(null);
    }
  };

  const handleTogglePermission = (deviceId: string, permission: PermissionScope) => {
    const currentPermissions = permissionManager.getDevicePermissions(deviceId);
    const hasPermission = currentPermissions.includes(permission);

    const newPermissions = hasPermission
      ? currentPermissions.filter((p) => p !== permission)
      : [...currentPermissions, permission];

    permissionManager.updateDevicePermissions(deviceId, newPermissions);
    loadDevices();
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'DESKTOP':
        return <ComputerDesktopIcon className="w-6 h-6" />;
      case 'MOBILE_IOS':
      case 'MOBILE_ANDROID':
      case 'TABLET':
        return <DevicePhoneMobileIcon className="w-6 h-6" />;
      default:
        return <DevicePhoneMobileIcon className="w-6 h-6" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedDeviceData = devices.find((d) => d.deviceId === selectedDevice);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-4xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Permission Manager</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {devices.length} device{devices.length !== 1 ? 's' : ''} connected
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/50 transition"
            >
              <XCircleIcon className="w-6 h-6 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[600px]">
        {/* Device List */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-2">
            {devices.length === 0 ? (
              <div className="text-center py-12">
                <DevicePhoneMobileIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">No devices connected</p>
                {/* Decorative - low contrast intentional for helper text */}
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Scan a QR code to pair a device</p>
              </div>
            ) : (
              <AnimatePresence>
                {devices.map((device) => (
                  <motion.button
                    key={device.deviceId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => setSelectedDevice(device.deviceId)}
                    className={`w-full p-4 rounded-xl text-left transition ${
                      selectedDevice === device.deviceId
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedDevice === device.deviceId
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {device.deviceType.replace(/_/g, ' ')}
                        </p>
                        {/* Decorative - low contrast intentional for device ID */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {device.deviceId.substring(0, 16)}...
                        </p>
                        {/* Decorative - low contrast intentional for timestamp */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Paired {formatDate(device.pairedAt)}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Permission Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedDeviceData ? (
            <div className="p-6">
              {/* Device Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Device Information</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-900">
                      {selectedDeviceData.deviceType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Paired:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedDeviceData.pairedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Active:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedDeviceData.lastActive)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
                <div className="space-y-3">
                  {Object.entries(PERMISSION_LABELS).map(([permission, { label, description }]) => {
                    const hasPermission = selectedDeviceData.permissions.includes(
                      permission as PermissionScope
                    );

                    return (
                      <motion.div
                        key={permission}
                        layout
                        className={`p-4 rounded-xl border-2 transition ${
                          hasPermission
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {hasPermission ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircleIcon className="w-5 h-5 text-gray-400" />
                              )}
                              <h4 className="font-semibold text-gray-900">{label}</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">{description}</p>
                          </div>
                          <button
                            onClick={() =>
                              handleTogglePermission(
                                selectedDeviceData.deviceId,
                                permission as PermissionScope
                              )
                            }
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                              hasPermission
                                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                            }`}
                          >
                            {hasPermission ? 'Revoke' : 'Grant'}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleRevokeDevice(selectedDeviceData.deviceId)}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  <TrashIcon className="w-5 h-5" />
                  Remove Device
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center p-6">
              <div>
                <ShieldCheckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Select a device to manage permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
