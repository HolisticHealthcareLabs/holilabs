'use client';

/**
 * Patient Hover Card
 * Shows patient quick info on hover
 * FREE - No external libraries needed
 *
 * Features:
 * - Patient demographics
 * - Active conditions
 * - Recent vitals
 * - Next appointment
 * - Smooth animations
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientHoverCardProps {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone?: string;
    email?: string;
    conditions?: string[];
    lastVisit?: string;
    nextAppointment?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  children: React.ReactNode;
}

export default function PatientHoverCard({ patient, children }: PatientHoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getRiskBadge = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'HIGH':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">High Risk</span>;
      case 'MEDIUM':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Medium Risk</span>;
      case 'LOW':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Low Risk</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={(e) => {
        setIsHovered(true);
        setMousePosition({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
    >
      {children}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-5 w-80 pointer-events-none"
            style={{
              left: mousePosition.x + 20,
              top: mousePosition.y - 50,
            }}
          >
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {calculateAge(patient.dateOfBirth)} years old
                  </p>
                </div>
                {getRiskBadge(patient.riskLevel)}
              </div>
            </div>

            {/* Contact Info */}
            {(patient.phone || patient.email) && (
              <div className="mb-4 space-y-2">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700 truncate">{patient.email}</span>
                  </div>
                )}
              </div>
            )}

            {/* Active Conditions */}
            {patient.conditions && patient.conditions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Active Conditions
                </p>
                <div className="flex flex-wrap gap-1">
                  {patient.conditions.slice(0, 3).map((condition, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
                    >
                      {condition}
                    </span>
                  ))}
                  {patient.conditions.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      +{patient.conditions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Visit Info */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              {patient.lastVisit && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Last Visit:</span>
                  <span className="font-semibold text-gray-900">{patient.lastVisit}</span>
                </div>
              )}
              {patient.nextAppointment && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Next Appointment:</span>
                  <span className="font-semibold text-blue-600">{patient.nextAppointment}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
