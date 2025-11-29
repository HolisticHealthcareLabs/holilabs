'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  BeakerIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CircleStackIcon, // Using CircleStackIcon as replacement for medications/pills
} from '@heroicons/react/24/outline';
import type { DemoPatient, PreventiveCareFlag } from '@/lib/demo/demo-data-generator';

interface ElectronicHealthRecordProps {
  patient: DemoPatient | any;
  className?: string;
}

export function ElectronicHealthRecord({ patient, className = '' }: ElectronicHealthRecordProps) {
  const preventiveFlags = (patient as DemoPatient).preventiveCareFlags || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Electronic Health Record
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Last Updated: {format(new Date(patient.lastVisit || new Date()), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Preventive Care Flags */}
      {preventiveFlags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 backdrop-blur-xl bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 dark:border-red-500/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Preventive Care Due
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {preventiveFlags.map((flag: PreventiveCareFlag) => (
              <motion.div
                key={flag.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-red-200 dark:border-red-900/30"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{flag.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Due: {format(flag.dueDate, 'MMM d, yyyy')}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    flag.priority === 'HIGH'
                      ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                      : flag.priority === 'MEDIUM'
                        ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                  }`}
                >
                  {flag.priority}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Conditions */}
      {patient.conditions && patient.conditions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 backdrop-blur-xl bg-[oklch(0.95_0.02_200)]/10 dark:bg-[oklch(0.15_0.02_200)]/10 border border-[oklch(0.85_0.05_200)]/20 dark:border-[oklch(0.35_0.05_200)]/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <HeartIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Active Conditions
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {patient.conditions.map((condition: string, idx: number) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-sm font-medium"
              >
                {condition}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Medications */}
      {patient.medications && patient.medications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 backdrop-blur-xl bg-[oklch(0.95_0.02_160)]/10 dark:bg-[oklch(0.15_0.02_160)]/10 border border-[oklch(0.85_0.05_160)]/20 dark:border-[oklch(0.35_0.05_160)]/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <CircleStackIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Current Medications
            </h3>
          </div>
          <div className="space-y-3">
            {patient.medications.map((med: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-800/50"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{med.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {med.dosage} • {med.frequency}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Appointments */}
      {patient.nextAppointment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 backdrop-blur-xl bg-[oklch(0.95_0.02_240)]/10 dark:bg-[oklch(0.15_0.02_240)]/10 border border-[oklch(0.85_0.05_240)]/20 dark:border-[oklch(0.35_0.05_240)]/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Upcoming Appointment
            </h3>
          </div>
          <div className="p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {format(new Date(patient.nextAppointment), 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {format(new Date(patient.nextAppointment), 'h:mm a')}
            </div>
          </div>
        </motion.div>
      )}

      {/* Patient Info Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/20 dark:border-white/10"
      >
        <div className="flex items-center gap-2 mb-4">
          <ClipboardDocumentListIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Patient Summary
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Age</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Gender</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {patient.gender}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Risk Level</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {patient.riskLevel}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Last Visit</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {format(new Date(patient.lastVisit || new Date()), 'MMM d')}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

