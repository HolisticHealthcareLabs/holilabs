'use client';

import React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';

interface VerifiedBadgeProps {
  verified: boolean;
  verificationCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  verified,
  verificationCount = 0,
  size = 'md',
  showTooltip = true,
}) => {
  if (!verified) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="inline-flex items-center group relative">
      <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full">
        <CheckCircle2 className={`${sizeClasses[size]} text-green-600`} />
        <span className={`font-medium ${textSizeClasses[size]}`}>Verified</span>
        {verificationCount > 0 && (
          <span className={`${textSizeClasses[size]} text-green-600`}>
            ({verificationCount})
          </span>
        )}
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
            {verificationCount > 0
              ? `${verificationCount} credential${verificationCount > 1 ? 's' : ''} verified`
              : 'Credentials verified'}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface VerificationStatusIconProps {
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  size?: 'sm' | 'md' | 'lg';
}

export const VerificationStatusIcon: React.FC<VerificationStatusIconProps> = ({
  status,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (status === 'VERIFIED') {
    return (
      <Shield className={`${sizeClasses[size]} text-green-600 fill-green-100`} />
    );
  }

  if (status === 'PENDING') {
    return (
      <Shield className={`${sizeClasses[size]} text-yellow-600 fill-yellow-100`} />
    );
  }

  return (
    <Shield className={`${sizeClasses[size]} text-gray-400 fill-gray-100`} />
  );
};
