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
          <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </div>
        );
      case 'AUTO_VERIFIED':
        return (
          <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Auto-Verified</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </div>
        );
      case 'IN_REVIEW':
        return (
          <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>In Review</span>
          </div>
        );
      case 'MANUAL_REVIEW':
        return (
          <div className="flex items-center space-x-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            <span>Manual Review</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </div>
        );
      case 'EXPIRED':
        return (
          <div className="flex items-center space-x-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
            <Calendar className="w-3 h-3" />
            <span>Expired</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="bg-green-100 rounded-lg p-2">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {formatCredentialType(credential.credentialType)}
            </h3>
            {/* Decorative - low contrast intentional for credential number metadata */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">#{credential.credentialNumber}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <FileText className="w-4 h-4 mr-2 text-gray-400" />
          <span>{credential.issuingAuthority}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            {credential.issuingCountry}
            {credential.issuingState && `, ${credential.issuingState}`}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-800">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            This credential expires soon. Please renew and update your records.
          </p>
        </div>
      )}

      {/* Verification info */}
      {credential.verificationStatus === 'VERIFIED' && credential.verificationSource && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-green-800">
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </button>
        )}
        {onVerify && credential.verificationStatus === 'PENDING' && (
          <button
            onClick={() => onVerify(credential.id)}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
          >
            <Shield className="w-4 h-4 mr-2" />
            Verify Now
          </button>
        )}
      </div>
    </div>
  );
};
