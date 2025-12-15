'use client';

/**
 * Quick Actions Tile
 * Frequently used clinical actions
 */

import { motion } from 'framer-motion';
import {
  ClipboardDocumentIcon,
  BeakerIcon,
  CameraIcon,
  DocumentDuplicateIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import CommandCenterTile from './CommandCenterTile';

interface QuickActionsTileProps {
  patientId?: string;
  tileId?: string;
  onAction?: (action: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  requiresPatient: boolean;
}

export default function QuickActionsTile({
  patientId,
  tileId = 'quick-actions-tile',
  onAction,
}: QuickActionsTileProps) {
  const actions: QuickAction[] = [
    {
      id: 'order-lab',
      label: 'Order Labs',
      icon: BeakerIcon,
      color: 'from-purple-500 to-indigo-500',
      requiresPatient: true,
    },
    {
      id: 'write-prescription',
      label: 'Prescription',
      icon: ClipboardDocumentIcon,
      color: 'from-blue-500 to-cyan-500',
      requiresPatient: true,
    },
    {
      id: 'take-photo',
      label: 'Take Photo',
      icon: CameraIcon,
      color: 'from-green-500 to-emerald-500',
      requiresPatient: true,
    },
    {
      id: 'referral',
      label: 'Referral',
      icon: DocumentDuplicateIcon,
      color: 'from-amber-500 to-orange-500',
      requiresPatient: true,
    },
    {
      id: 'call-patient',
      label: 'Call Patient',
      icon: PhoneIcon,
      color: 'from-red-500 to-pink-500',
      requiresPatient: true,
    },
    {
      id: 'send-message',
      label: 'Send Message',
      icon: EnvelopeIcon,
      color: 'from-indigo-500 to-purple-500',
      requiresPatient: true,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: CalendarIcon,
      color: 'from-cyan-500 to-blue-500',
      requiresPatient: true,
    },
    {
      id: 'print',
      label: 'Print',
      icon: PrinterIcon,
      color: 'from-gray-500 to-slate-500',
      requiresPatient: false,
    },
  ];

  const handleAction = (actionId: string) => {
    if (onAction) {
      onAction(actionId);
    } else {
      console.log('Quick action:', actionId);
      // Handle action default behavior
    }
  };

  return (
    <CommandCenterTile
      id={tileId}
      title="Quick Actions"
      subtitle={`${actions.length} actions available`}
      icon={<ClipboardDocumentIcon className="w-6 h-6 text-blue-600" />}
      size="medium"
      variant="default"
      isDraggable={true}
    >
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const isDisabled = action.requiresPatient && !patientId;

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={!isDisabled ? { scale: 1.05, y: -2 } : undefined}
              whileTap={!isDisabled ? { scale: 0.95 } : undefined}
              onClick={() => !isDisabled && handleAction(action.id)}
              disabled={isDisabled}
              className={`p-4 rounded-xl transition text-left group relative overflow-hidden ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed bg-gray-50'
                  : 'hover:shadow-xl bg-white border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Gradient Background on Hover */}
              {!isDisabled && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.15 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute inset-0 bg-gradient-to-br ${action.color}`}
                />
              )}

              {/* Icon */}
              <div className="relative">
                <motion.div
                  whileHover={!isDisabled ? { rotate: [0, -10, 10, -10, 0], scale: 1.15 } : undefined}
                  transition={{ duration: 0.5 }}
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-md ${
                    isDisabled ? 'opacity-50' : 'group-hover:shadow-lg'
                  }`}
                >
                  <action.icon className="w-5 h-5 text-white" />
                </motion.div>

                {/* Label */}
                <motion.div
                  whileHover={!isDisabled ? { x: 2 } : undefined}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-medium text-gray-900"
                >
                  {action.label}
                </motion.div>
              </div>

              {/* Disabled Indicator */}
              {isDisabled && (
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute top-2 right-2"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {!patientId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs text-amber-700 text-center font-medium"
          >
            Select a patient to enable patient-specific actions
          </motion.p>
        </motion.div>
      )}
    </CommandCenterTile>
  );
}
