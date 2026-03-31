'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Calendar,
  MapPin,
  Shield,
  Eye,
} from 'lucide-react';

interface CredentialCardProps {
  credential: {
    id: string;
    credentialType: string;
    credentialNumber: string;
    issuingAuthority: string;
    issuingCountry: string;
    issuingState?: string;
    issuedDate: string;
    expirationDate?: string;
    neverExpires: boolean;
    verificationStatus: string;
    verifiedAt?: string;
    autoVerified: boolean;
    manualVerified: boolean;
    verificationSource?: string;
  };
  onView?: (id: string) => void;
  onVerify?: (id: string) => void;
}

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onView,
  onVerify,
}) => {
  // Format credential type
  const formatCredentialType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (credential.verificationStatus) {
      case 'VERIFIED':
        return (
          <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-success)', borderRadius: 'var(--radius-full)' }}>
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </div>
        );
      case 'AUTO_VERIFIED':
        return (
          <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-success)', borderRadius: 'var(--radius-full)' }}>
            <CheckCircle2 className="w-3 h-3" />
            <span>Auto-Verified</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-warning)', borderRadius: 'var(--radius-full)' }}>
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </div>
        );
      case 'IN_REVIEW':
        return (
          <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-accent)', borderRadius: 'var(--radius-full)' }}>
            <Clock className="w-3 h-3" />
            <span>In Review</span>
          </div>
        );
      case 'MANUAL_REVIEW':
        return (
          <div className="flex items-center space-x-1 bg-orange-100 text-orange-800 px-3 py-1 text-xs font-medium" style={{ borderRadius: 'var(--radius-full)' }}>
            <AlertTriangle className="w-3 h-3" />
            <span>Manual Review</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-danger)', borderRadius: 'var(--radius-full)' }}>
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </div>
        );
      case 'EXPIRED':
        return (
          <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-tertiary)', borderRadius: 'var(--radius-full)' }}>
            <Calendar className="w-3 h-3" />
            <span>Expired</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-tertiary)', borderRadius: 'var(--radius-full)' }}>
            <Clock className="w-3 h-3" />
            <span>Unknown</span>
          </div>
        );
    }
  };

  // Check if expiring soon (within 90 days)
  const isExpiringSoon = () => {
    if (!credential.expirationDate || credential.neverExpires) return false;
    const expirationDate = new Date(credential.expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration > 0 && daysUntilExpiration <= 90;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="p-2" style={{ backgroundColor: 'var(--surface-success)', borderRadius: 'var(--radius-lg)' }}>
            <Shield className="w-5 h-5" style={{ color: 'var(--text-success)' }} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCredentialType(credential.credentialType)}
            </h3>
            {/* Decorative - low contrast intentional for credential number metadata */}
            <p className="text-sm dark:text-gray-400 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>#{credential.credentialNumber}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          <FileText className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
          <span>{credential.issuingAuthority}</span>
        </div>
        <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          <MapPin className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
          <span>
            {credential.issuingCountry}
            {credential.issuingState && `, ${credential.issuingState}`}
          </span>
        </div>
        <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Calendar className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
          <span>
            Issued: {formatDate(credential.issuedDate)}
            {credential.expirationDate && !credential.neverExpires && (
              <span className="ml-2">
                • Expires: {formatDate(credential.expirationDate)}
              </span>
            )}
            {credential.neverExpires && <span className="ml-2">• Never Expires</span>}
          </span>
        </div>
      </div>

      {/* Warning for expiring soon */}
      {isExpiringSoon() && (
        <div className="p-3 mb-4" style={{ backgroundColor: 'var(--surface-warning)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-xs text-yellow-800">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            This credential expires soon. Please renew and update your records.
          </p>
        </div>
      )}

      {/* Verification info */}
      {credential.verificationStatus === 'VERIFIED' && credential.verificationSource && (
        <div className="p-3 mb-4" style={{ backgroundColor: 'var(--surface-success)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-xs" style={{ color: 'var(--text-success)' }}>
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Verified via {credential.verificationSource}
            {credential.verifiedAt && (
              <span className="ml-1">on {formatDate(credential.verifiedAt)}</span>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 mt-4">
        {onView && (
          <button
            onClick={() => onView(credential.id)}
            className="flex-1 px-3 py-2 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center"
            style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </button>
        )}
        {onVerify && credential.verificationStatus === 'PENDING' && (
          <button
            onClick={() => onVerify(credential.id)}
            className="flex-1 px-3 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <Shield className="w-4 h-4 mr-2" />
            Verify Now
          </button>
        )}
      </div>
    </div>
  );
};
