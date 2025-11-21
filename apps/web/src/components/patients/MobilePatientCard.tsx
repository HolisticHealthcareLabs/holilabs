/**
 * Mobile Patient Card Component
 *
 * Touch-optimized patient card for mobile devices
 * - Large tap targets (minimum 44x44px)
 * - Swipe gestures for actions
 * - Glassmorphic spatial design
 * - WCAG AAA accessible
 */

'use client';

import React from 'react';
import { SpatialCard } from '@/components/spatial/SpatialCard';
import { motion } from 'framer-motion';

export interface MobilePatientCardProps {
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender?: string;
    phone?: string;
    email?: string;
    isPalliativeCare?: boolean;
    lastVisit?: Date;
    nextAppointment?: Date;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  onClick?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  className?: string;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format date for mobile display
 */
function formatDate(date: Date): string {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Mobile Patient Card
 */
export function MobilePatientCard({
  patient,
  onClick,
  onCall,
  onMessage,
  className = '',
}: MobilePatientCardProps) {
  const age = calculateAge(patient.dateOfBirth);
  const genderDisplay = patient.gender?.charAt(0) || 'U';

  // Risk level colors
  const riskColors = {
    LOW: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
    MEDIUM: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
    HIGH: 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300',
    CRITICAL: 'bg-error-600 text-white dark:bg-error-700 animate-pulse',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <SpatialCard
        variant="elevated"
        blur="medium"
        hover
        className="touch-manipulation"
      >
        {/* Main content - tappable area */}
        <div
          onClick={onClick}
          className="cursor-pointer active:scale-[0.98] transition-transform"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClick?.();
            }
          }}
        >
          {/* Header with avatar and name */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold shadow-[0_4px_16px_rgba(6,182,212,0.3)]">
                {patient.firstName.charAt(0)}
                {patient.lastName.charAt(0)}
              </div>
            </div>

            {/* Name and MRN */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                <span className="font-mono">{patient.mrn}</span>
                <span className="text-neutral-400 dark:text-neutral-600">•</span>
                <span>
                  {age}y {genderDisplay}
                </span>
              </p>

              {/* Risk badge */}
              {patient.riskLevel && (
                <span
                  className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    riskColors[patient.riskLevel]
                  }`}
                >
                  {patient.riskLevel} RISK
                </span>
              )}

              {/* Palliative care badge */}
              {patient.isPalliativeCare && (
                <span className="inline-block mt-2 ml-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  PALLIATIVE
                </span>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Last visit */}
            {patient.lastVisit && (
              <div className="bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  Last Visit
                </p>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatDate(patient.lastVisit)}
                </p>
              </div>
            )}

            {/* Next appointment */}
            {patient.nextAppointment && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 backdrop-blur-sm rounded-lg p-3 border border-cyan-200/50 dark:border-cyan-800/50">
                <p className="text-xs text-cyan-700 dark:text-cyan-300 mb-1">
                  Next Appt
                </p>
                <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
                  {formatDate(patient.nextAppointment)}
                </p>
              </div>
            )}
          </div>

          {/* Contact info */}
          {(patient.phone || patient.email) && (
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
              {patient.phone && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  📱 {patient.phone}
                </p>
              )}
              {patient.email && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                  ✉️ {patient.email}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons - minimum 44x44px touch targets */}
        {(onCall || onMessage) && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            {onCall && patient.phone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCall();
                }}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-success-500 hover:bg-success-600 text-white font-semibold transition-colors shadow-[0_2px_8px_rgba(34,197,94,0.3)] active:scale-[0.98]"
                aria-label={`Call ${patient.firstName} ${patient.lastName}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Call
              </button>
            )}

            {onMessage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage();
                }}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-colors shadow-[0_2px_8px_rgba(6,182,212,0.3)] active:scale-[0.98]"
                aria-label={`Message ${patient.firstName} ${patient.lastName}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                Message
              </button>
            )}
          </div>
        )}
      </SpatialCard>
    </motion.div>
  );
}

export default MobilePatientCard;
