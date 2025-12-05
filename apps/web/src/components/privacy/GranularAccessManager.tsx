'use client';

import { useState, useEffect } from 'react';

interface ResourceType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface GranularGrant {
  id: string;
  resourceType: string;
  resourceInfo: ResourceType;
  permissions: {
    canView: boolean;
    canDownload: boolean;
    canShare: boolean;
  };
  purpose: string;
  grantedAt: string;
  expiresAt: string | null;
}

interface Grantee {
  id: string | null;
  email: string | null;
  name: string | null;
  type: string;
}

interface GroupedGrant {
  grantee: Grantee;
  grants: GranularGrant[];
}

const AVAILABLE_RESOURCES: ResourceType[] = [
  {
    id: 'LAB_RESULT',
    name: 'Laboratory Results',
    description: 'Blood tests, urinalysis, and other lab work',
    icon: '🧪',
  },
  {
    id: 'IMAGING_STUDY',
    name: 'Imaging Studies',
    description: 'X-rays, CT scans, MRIs, ultrasounds',
    icon: '🩻',
  },
  {
    id: 'CLINICAL_NOTE',
    name: 'Clinical Notes',
    description: 'Doctor notes, consultation records',
    icon: '📋',
  },
  {
    id: 'MEDICATIONS',
    name: 'Medications',
    description: 'Prescription history and current medications',
    icon: '💊',
  },
  {
    id: 'VITAL_SIGNS',
    name: 'Vital Signs',
    description: 'Blood pressure, heart rate, temperature',
    icon: '❤️',
  },
];

export function GranularAccessManager({ patientId }: { patientId: string }) {
  const [grants, setGrants] = useState<GroupedGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [granteeEmail, setGranteeEmail] = useState('');
  const [granteeName, setGranteeName] = useState('');
  const [canDownload, setCanDownload] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    fetchGrants();
  }, []);

  const fetchGrants = async () => {
    try {
      const response = await fetch(`/api/data-access/granular?patientId=${patientId}`);
      const data = await response.json();
      if (data.success) {
        setGrants(data.grants);
      }
    } catch (error) {
      console.error('Error fetching grants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGrant = async () => {
    if (selectedResources.length === 0 || !granteeEmail) {
      alert('Please select at least one resource and provide grantee email');
      return;
    }

    try {
      const response = await fetch('/api/data-access/granular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          grantedToEmail: granteeEmail,
          grantedToName: granteeName,
          grantedToType: 'EXTERNAL',
          resourceTypes: selectedResources,
          canView: true,
          canDownload,
          canShare,
          purpose,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Access granted successfully');
        setShowForm(false);
        resetForm();
        fetchGrants();
      } else {
        alert(data.error || 'Failed to grant access');
      }
    } catch (error) {
      console.error('Error creating grant:', error);
      alert('Failed to grant access');
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm('Are you sure you want to revoke this access?')) {
      return;
    }

    try {
      const response = await fetch(`/api/data-access/granular?grantId=${grantId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Access revoked successfully');
        fetchGrants();
      } else {
        alert(data.error || 'Failed to revoke access');
      }
    } catch (error) {
      console.error('Error revoking grant:', error);
      alert('Failed to revoke access');
    }
  };

  const resetForm = () => {
    setSelectedResources([]);
    setGranteeEmail('');
    setGranteeName('');
    setCanDownload(false);
    setCanShare(false);
    setPurpose('');
  };

  const toggleResource = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading granular access grants...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Granular Data Access</h3>
          <p className="text-sm text-gray-600">Grant access to specific types of medical data</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Grant Access'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
          <h4 className="font-bold text-gray-800 mb-4">Grant Granular Access</h4>

          {/* Resource Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Resources to Share
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_RESOURCES.map((resource) => (
                <div
                  key={resource.id}
                  onClick={() => toggleResource(resource.id)}
                  className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                    selectedResources.includes(resource.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">{resource.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{resource.name}</div>
                      <div className="text-xs text-gray-600">{resource.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grantee Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grantee Email *
              </label>
              <input
                type="email"
                value={granteeEmail}
                onChange={(e) => setGranteeEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grantee Name
              </label>
              <input
                type="text"
                value={granteeName}
                onChange={(e) => setGranteeName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. John Smith"
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={canDownload}
                  onChange={(e) => setCanDownload(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Can Download</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={canShare}
                  onChange={(e) => setCanShare(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Can Share</span>
              </label>
            </div>
          </div>

          {/* Purpose */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Why is this access needed?"
            />
          </div>

          <button
            onClick={handleCreateGrant}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Grant Access
          </button>
        </div>
      )}

      {/* Existing Grants */}
      {grants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No granular access grants found. Grant access to specific data types above.
        </div>
      ) : (
        <div className="space-y-6">
          {grants.map((group, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-gray-800">
                    {group.grantee.name || group.grantee.email || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600">{group.grantee.email}</div>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  {group.grants.length} resource{group.grants.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.grants.map((grant) => (
                  <div key={grant.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <span className="text-xl mr-2">{grant.resourceInfo.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">
                            {grant.resourceInfo.name}
                          </div>
                          <div className="text-xs text-gray-600 flex gap-2 mt-1">
                            <span>👁️ View</span>
                            {grant.permissions.canDownload && <span>📥 Download</span>}
                            {grant.permissions.canShare && <span>↗️ Share</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeGrant(grant.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
