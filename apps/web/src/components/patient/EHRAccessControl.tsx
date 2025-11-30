'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  verified: boolean;
}

interface AccessPermission {
  id: string;
  doctorId: string;
  doctorName: string;
  grantedAt: Date;
  expiresAt: Date | null;
  scope: 'visit' | 'ongoing';
  dataTypes: string[];
  status: 'active' | 'revoked' | 'expired';
}

interface EHRAccessControlProps {
  patientId: string;
  onAccessGranted?: (doctorId: string, permission: AccessPermission) => void;
  onAccessRevoked?: (permissionId: string) => void;
}

export function EHRAccessControl({
  patientId,
  onAccessGranted,
  onAccessRevoked,
}: EHRAccessControlProps) {
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [isGranting, setIsGranting] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [accessScope, setAccessScope] = useState<'visit' | 'ongoing'>('visit');
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([
    'lab_results',
    'vital_signs',
    'medications',
    'diagnoses',
  ]);

  const availableDataTypes = [
    { id: 'lab_results', name: 'Lab Results', icon: '/icons/diagnostics (1).svg' },
    { id: 'vital_signs', name: 'Vital Signs', icon: '/icons/health (1).svg' },
    { id: 'medications', name: 'Medications', icon: '/icons/rx (1).svg' },
    { id: 'diagnoses', name: 'Diagnoses', icon: '/icons/stethoscope (1).svg' },
    { id: 'imaging', name: 'Imaging Reports', icon: '/icons/diagnostics (1).svg' },
    { id: 'allergies', name: 'Allergies', icon: '/icons/health-worker_form (1).svg' },
  ];

  useEffect(() => {
    loadPermissions();
  }, [patientId]);

  const loadPermissions = async () => {
    try {
      const response = await fetch(`/api/ehr/permissions?patientId=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedDoctor) return;

    try {
      const expiresAt = accessScope === 'visit'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        : null; // No expiration for ongoing

      const response = await fetch('/api/ehr/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          doctorId: selectedDoctor.id,
          scope: accessScope,
          dataTypes: selectedDataTypes,
          expiresAt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newPermission = data.permission;
        setPermissions([newPermission, ...permissions]);
        if (onAccessGranted) {
          onAccessGranted(selectedDoctor.id, newPermission);
        }
        setIsGranting(false);
        setSelectedDoctor(null);
      }
    } catch (error) {
      console.error('Error granting access:', error);
      alert('Failed to grant access. Please try again.');
    }
  };

  const handleRevokeAccess = async (permissionId: string) => {
    if (!confirm('Are you sure you want to revoke access? The doctor will no longer be able to view your medical records.')) {
      return;
    }

    try {
      const response = await fetch(`/api/ehr/permissions/${permissionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPermissions(permissions.map(p =>
          p.id === permissionId ? { ...p, status: 'revoked' as const } : p
        ));
        if (onAccessRevoked) {
          onAccessRevoked(permissionId);
        }
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Failed to revoke access. Please try again.');
    }
  };

  const toggleDataType = (dataTypeId: string) => {
    if (selectedDataTypes.includes(dataTypeId)) {
      setSelectedDataTypes(selectedDataTypes.filter(id => id !== dataTypeId));
    } else {
      setSelectedDataTypes([...selectedDataTypes, dataTypeId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-600/20 flex items-center justify-center">
            <Image
              src="/icons/health-worker_form (1).svg"
              alt="Privacy"
              width={24}
              height={24}
              className="dark:invert"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              EHR Access Control
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Manage who can access your medical records
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsGranting(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg flex items-center gap-2"
        >
          <span>+</span>
          Grant Access
        </button>
      </div>

      {/* Active Permissions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Active Permissions
        </h3>
        {permissions.filter(p => p.status === 'active').length === 0 ? (
          <div className="text-center py-8 text-gray-700 dark:text-gray-200">
            <p>No active permissions. Grant access to your doctors to enable Smart Diagnosis features.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {permissions.filter(p => p.status === 'active').map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {permission.doctorName}
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      {permission.scope === 'visit' ? 'Visit Only' : 'Ongoing'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    Access to: {permission.dataTypes.map(dt =>
                      availableDataTypes.find(adt => adt.id === dt)?.name
                    ).join(', ')}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {permission.expiresAt
                      ? `Expires ${new Date(permission.expiresAt).toLocaleDateString()}`
                      : 'No expiration'}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeAccess(permission.id)}
                  className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoked/Expired Permissions */}
      {permissions.filter(p => p.status !== 'active').length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Revoked & Expired Permissions
          </h3>
          <div className="space-y-2">
            {permissions.filter(p => p.status !== 'active').map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {permission.doctorName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {permission.status === 'revoked' ? 'Revoked' : 'Expired'}
                  </div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {new Date(permission.grantedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      <AnimatePresence>
        {isGranting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Grant EHR Access
              </h3>

              {/* Doctor Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Doctor
                </label>
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {selectedDoctor ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {selectedDoctor.name}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          {selectedDoctor.specialty}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDoctor(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-700 dark:text-gray-200 text-sm">
                      Doctor will be automatically selected from current consultation
                    </div>
                  )}
                </div>
              </div>

              {/* Access Scope */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Access Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAccessScope('visit')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      accessScope === 'visit'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      This Visit Only
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Access expires after 24 hours
                    </div>
                  </button>
                  <button
                    onClick={() => setAccessScope('ongoing')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      accessScope === 'ongoing'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      Ongoing Access
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Until manually revoked
                    </div>
                  </button>
                </div>
              </div>

              {/* Data Types */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Data to Share
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableDataTypes.map((dataType) => (
                    <button
                      key={dataType.id}
                      onClick={() => toggleDataType(dataType.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedDataTypes.includes(dataType.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Image
                          src={dataType.icon}
                          alt={dataType.name}
                          width={16}
                          height={16}
                          className="dark:invert"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {dataType.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
                <div className="text-xs text-yellow-800 dark:text-yellow-400">
                  <strong>Privacy Notice:</strong> You can revoke access at any time. All access events are logged for your security.
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsGranting(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantAccess}
                  disabled={selectedDataTypes.length === 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Grant Access
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
