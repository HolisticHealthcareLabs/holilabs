'use client';

/**
 * Vitals Monitoring Tile
 * Real-time patient vital signs display
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import CommandCenterTile from './CommandCenterTile';

interface Vital {
  name: string;
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
  trend: 'up' | 'down' | 'stable';
  icon: string;
}

interface VitalsTileProps {
  patientId?: string;
  tileId?: string;
}

export default function VitalsTile({
  patientId,
  tileId = 'vitals-tile',
}: VitalsTileProps) {
  const [vitals, setVitals] = useState<Vital[]>([
    {
      name: 'Heart Rate',
      value: 72,
      unit: 'bpm',
      normalRange: { min: 60, max: 100 },
      trend: 'stable',
      icon: '❤️',
    },
    {
      name: 'Blood Pressure',
      value: 120,
      unit: 'mmHg',
      normalRange: { min: 90, max: 140 },
      trend: 'stable',
      icon: '🩺',
    },
    {
      name: 'Temperature',
      value: 98.6,
      unit: '°F',
      normalRange: { min: 97.0, max: 99.0 },
      trend: 'stable',
      icon: '🌡️',
    },
    {
      name: 'SpO2',
      value: 98,
      unit: '%',
      normalRange: { min: 95, max: 100 },
      trend: 'stable',
      icon: '💨',
    },
  ]);

  const [isMonitoring, setIsMonitoring] = useState(false);

  // Simulate real-time vitals updates
  useEffect(() => {
    if (!isMonitoring || !patientId) return;

    const interval = setInterval(() => {
      setVitals((prev) =>
        prev.map((vital) => {
          const variation = (Math.random() - 0.5) * 4;
          const newValue = Number((vital.value + variation).toFixed(1));

          const trend =
            newValue > vital.value ? 'up' :
            newValue < vital.value ? 'down' : 'stable';

          return {
            ...vital,
            value: newValue,
            trend,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isMonitoring, patientId]);

  const getVitalStatus = (vital: Vital): 'normal' | 'warning' | 'critical' => {
    if (vital.value < vital.normalRange.min || vital.value > vital.normalRange.max) {
      return 'critical';
    }
    if (
      vital.value < vital.normalRange.min * 1.1 ||
      vital.value > vital.normalRange.max * 0.9
    ) {
      return 'warning';
    }
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <CommandCenterTile
      id={tileId}
      title="Vital Signs"
      subtitle={isMonitoring ? 'Live monitoring' : patientId ? 'Ready' : 'No patient'}
      icon={<HeartIcon className="w-6 h-6 text-red-600" />}
      size="medium"
      variant="glass"
      isDraggable={true}
      isActive={isMonitoring}
    >
      <div className="space-y-4">
        {/* Vitals Grid */}
        <div className="grid grid-cols-2 gap-3">
          {vitals.map((vital, index) => {
            const status = getVitalStatus(vital);
            return (
              <motion.div
                key={vital.name}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className={`p-4 rounded-xl border-2 transition relative overflow-hidden ${getStatusColor(status)}`}
              >
                {/* Critical pulse effect */}
                {status === 'critical' && (
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 0 0 rgba(239, 68, 68, 0.4)',
                        '0 0 0 8px rgba(239, 68, 68, 0)',
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl"
                  />
                )}

                <div className="flex items-start justify-between mb-2 relative z-10">
                  <motion.span
                    animate={status === 'critical' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-2xl"
                  >
                    {vital.icon}
                  </motion.span>
                  {vital.trend !== 'stable' && (
                    <motion.div
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{ scale: 1, rotate: vital.trend === 'up' ? 0 : 180 }}
                      transition={{ type: 'spring', damping: 15 }}
                    >
                      <ArrowTrendingUpIcon className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>

                <div className="text-sm font-medium mb-1 relative z-10">{vital.name}</div>
                <div className="flex items-baseline gap-1 relative z-10">
                  <motion.span
                    key={vital.value}
                    initial={{ scale: 1.3, color: status === 'critical' ? '#dc2626' : '#3b82f6' }}
                    animate={{ scale: 1, color: 'inherit' }}
                    transition={{ duration: 0.4 }}
                    className="text-2xl font-bold"
                  >
                    {vital.value}
                  </motion.span>
                  <span className="text-sm opacity-70">{vital.unit}</span>
                </div>

                <div className="text-xs opacity-60 mt-1 relative z-10">
                  Normal: {vital.normalRange.min}-{vital.normalRange.max}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Monitoring Control */}
        <div className="flex gap-3">
          <motion.button
            onClick={() => setIsMonitoring(!isMonitoring)}
            disabled={!patientId}
            whileHover={patientId ? { scale: 1.02 } : undefined}
            whileTap={patientId ? { scale: 0.98 } : undefined}
            animate={isMonitoring ? {
              boxShadow: [
                '0 4px 20px rgba(239, 68, 68, 0.3)',
                '0 4px 30px rgba(239, 68, 68, 0.5)',
                '0 4px 20px rgba(239, 68, 68, 0.3)',
              ],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
              isMonitoring
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {isMonitoring && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              )}
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </span>
          </motion.button>
        </div>

        {!patientId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-amber-600 text-center font-medium"
          >
            Select a patient to monitor vitals
          </motion.p>
        )}
      </div>
    </CommandCenterTile>
  );
}
