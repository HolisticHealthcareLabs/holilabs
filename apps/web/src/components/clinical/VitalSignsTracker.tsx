'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * VitalSignsTracker Component
 *
 * Phase 3: Clinical Workflows
 * Hospital-grade vital signs tracking with trending, validation, and alerts
 */

export interface VitalSigns {
  id?: string;
  recordedAt: Date;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  painLevel?: number;
  notes?: string;
}

export interface VitalSignsTrackerProps {
  patientId?: string;
  currentVitals?: Partial<VitalSigns>;
  vitalHistory?: VitalSigns[];
  onSave?: (vitals: Partial<VitalSigns>) => void;
  readOnly?: boolean;
  showHistory?: boolean;
  className?: string;
}

// Normal ranges for vital signs
const VITAL_RANGES = {
  bloodPressureSystolic: { min: 90, max: 120, critical: { min: 70, max: 180 } },
  bloodPressureDiastolic: { min: 60, max: 80, critical: { min: 40, max: 110 } },
  heartRate: { min: 60, max: 100, critical: { min: 40, max: 150 } },
  temperature: { min: 36.1, max: 37.2, critical: { min: 35, max: 39 } },
  respiratoryRate: { min: 12, max: 20, critical: { min: 8, max: 30 } },
  oxygenSaturation: { min: 95, max: 100, critical: { min: 90, max: 100 } },
  bmi: { min: 18.5, max: 24.9, critical: { min: 15, max: 40 } },
  painLevel: { min: 0, max: 3, critical: { min: 0, max: 10 } },
};

export function VitalSignsTracker({
  patientId,
  currentVitals = {},
  vitalHistory = [],
  onSave,
  readOnly = false,
  showHistory = true,
  className = '',
}: VitalSignsTrackerProps) {
  const [vitals, setVitals] = useState<Partial<VitalSigns>>(currentVitals);
  const [isEditing, setIsEditing] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [selectedVital, setSelectedVital] = useState<keyof VitalSigns | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  // Calculate BMI when weight and height change
  useEffect(() => {
    if (vitals.weight && vitals.height) {
      const heightInMeters = vitals.height / 100;
      const bmi = vitals.weight / (heightInMeters * heightInMeters);
      setVitals((prev) => ({ ...prev, bmi: Math.round(bmi * 10) / 10 }));
    }
  }, [vitals.weight, vitals.height]);

  // Check for abnormal values and generate alerts
  useEffect(() => {
    const newAlerts: string[] = [];

    if (vitals.bloodPressureSystolic !== undefined) {
      const value = vitals.bloodPressureSystolic;
      if (value < VITAL_RANGES.bloodPressureSystolic.critical.min || value > VITAL_RANGES.bloodPressureSystolic.critical.max) {
        newAlerts.push(`⚠️ CRÍTICO: Presión sistólica ${value} mmHg fuera de rango seguro`);
      } else if (value < VITAL_RANGES.bloodPressureSystolic.min || value > VITAL_RANGES.bloodPressureSystolic.max) {
        newAlerts.push(`⚡ ALERTA: Presión sistólica ${value} mmHg fuera de rango normal`);
      }
    }

    if (vitals.heartRate !== undefined) {
      const value = vitals.heartRate;
      if (value < VITAL_RANGES.heartRate.critical.min || value > VITAL_RANGES.heartRate.critical.max) {
        newAlerts.push(`⚠️ CRÍTICO: Frecuencia cardíaca ${value} lpm fuera de rango seguro`);
      } else if (value < VITAL_RANGES.heartRate.min || value > VITAL_RANGES.heartRate.max) {
        newAlerts.push(`⚡ ALERTA: Frecuencia cardíaca ${value} lpm fuera de rango normal`);
      }
    }

    if (vitals.temperature !== undefined) {
      const value = vitals.temperature;
      if (value < VITAL_RANGES.temperature.critical.min || value > VITAL_RANGES.temperature.critical.max) {
        newAlerts.push(`⚠️ CRÍTICO: Temperatura ${value}°C fuera de rango seguro`);
      } else if (value < VITAL_RANGES.temperature.min || value > VITAL_RANGES.temperature.max) {
        newAlerts.push(`⚡ ALERTA: Temperatura ${value}°C fuera de rango normal`);
      }
    }

    if (vitals.oxygenSaturation !== undefined) {
      const value = vitals.oxygenSaturation;
      if (value < VITAL_RANGES.oxygenSaturation.critical.min) {
        newAlerts.push(`⚠️ CRÍTICO: Saturación de oxígeno ${value}% crítica`);
      } else if (value < VITAL_RANGES.oxygenSaturation.min) {
        newAlerts.push(`⚡ ALERTA: Saturación de oxígeno ${value}% baja`);
      }
    }

    setAlerts(newAlerts);
  }, [vitals]);

  const handleChange = (field: keyof VitalSigns, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) || value === '') {
      setVitals((prev) => ({
        ...prev,
        [field]: value === '' ? undefined : numValue,
      }));
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...vitals, recordedAt: new Date() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setVitals(currentVitals);
    setIsEditing(false);
  };

  const getVitalStatus = (field: keyof VitalSigns, value: number | undefined) => {
    if (value === undefined) return 'normal';
    const range = VITAL_RANGES[field as keyof typeof VITAL_RANGES];
    if (!range) return 'normal';

    if (value < range.critical.min || value > range.critical.max) return 'critical';
    if (value < range.min || value > range.max) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const calculateTrend = (field: keyof VitalSigns) => {
    if (vitalHistory.length < 2) return 'stable';

    const recentValues = vitalHistory
      .slice(-5)
      .map(v => v[field] as number)
      .filter(v => v !== undefined);

    if (recentValues.length < 2) return 'stable';

    const recent = recentValues[recentValues.length - 1];
    const previous = recentValues[recentValues.length - 2];
    const diff = ((recent - previous) / previous) * 100;

    if (Math.abs(diff) < 5) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '↗';
      case 'decreasing':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">❤️</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Signos Vitales</h2>
            {/* Decorative - low contrast intentional for subtitle */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Seguimiento y tendencias
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {showHistory && (
            <button
              onClick={() => setShowTrending(!showTrending)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {showTrending ? '📊 Ocultar Gráfica' : '📈 Ver Tendencias'}
            </button>
          )}
          {!readOnly && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Registrar Vitales
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-sm font-medium ${
                    alert.includes('CRÍTICO')
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}
                >
                  {alert}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vital Signs Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Blood Pressure */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Presión Arterial (mmHg)</span>
              {vitalHistory.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getTrendIcon(calculateTrend('bloodPressureSystolic'))}
                </span>
              )}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={vitals.bloodPressureSystolic || ''}
                onChange={(e) => handleChange('bloodPressureSystolic', e.target.value)}
                placeholder="Sistólica"
                disabled={readOnly || !isEditing}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  getStatusColor(getVitalStatus('bloodPressureSystolic', vitals.bloodPressureSystolic))
                } ${readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <input
                type="number"
                value={vitals.bloodPressureDiastolic || ''}
                onChange={(e) => handleChange('bloodPressureDiastolic', e.target.value)}
                placeholder="Diastólica"
                disabled={readOnly || !isEditing}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  getStatusColor(getVitalStatus('bloodPressureDiastolic', vitals.bloodPressureDiastolic))
                } ${readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {/* Heart Rate */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Frecuencia Cardíaca (lpm)</span>
              {vitalHistory.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getTrendIcon(calculateTrend('heartRate'))}
                </span>
              )}
            </label>
            <input
              type="number"
              value={vitals.heartRate || ''}
              onChange={(e) => handleChange('heartRate', e.target.value)}
              placeholder="60-100"
              disabled={readOnly || !isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                getStatusColor(getVitalStatus('heartRate', vitals.heartRate))
              } ${readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Temperatura (°C)</span>
              {vitalHistory.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getTrendIcon(calculateTrend('temperature'))}
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              value={vitals.temperature || ''}
              onChange={(e) => handleChange('temperature', e.target.value)}
              placeholder="36.5"
              disabled={readOnly || !isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                getStatusColor(getVitalStatus('temperature', vitals.temperature))
              } ${readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Respiratory Rate */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Frecuencia Respiratoria (rpm)</span>
              {vitalHistory.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getTrendIcon(calculateTrend('respiratoryRate'))}
                </span>
              )}
            </label>
            <input
              type="number"
              value={vitals.respiratoryRate || ''}
              onChange={(e) => handleChange('respiratoryRate', e.target.value)}
              placeholder="12-20"
              disabled={readOnly || !isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                getStatusColor(getVitalStatus('respiratoryRate', vitals.respiratoryRate))
              } ${readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Oxygen Saturation */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Saturación de O₂ (%)</span>
              {vitalHistory.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getTrendIcon(calculateTrend('oxygenSaturation'))}
                </span>
              )}
            </label>
            <input
              type="number"
              value={vitals.oxygenSaturation || ''}
              onChange={(e) => handleChange('oxygenSaturation', e.target.value)}
              placeholder="95-100"
              disabled={readOnly || !isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                getStatusColor(getVitalStatus('oxygenSaturation', vitals.oxygenSaturation))
              } ${readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Peso (kg)</span>
              {vitalHistory.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getTrendIcon(calculateTrend('weight'))}
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              value={vitals.weight || ''}
              onChange={(e) => handleChange('weight', e.target.value)}
              placeholder="70.0"
              disabled={readOnly || !isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          {/* Height */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Altura (cm)
            </label>
            <input
              type="number"
              value={vitals.height || ''}
              onChange={(e) => handleChange('height', e.target.value)}
              placeholder="170"
              disabled={readOnly || !isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          {/* BMI (auto-calculated) */}
          {vitals.bmi && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                IMC
              </label>
              <div className={`px-3 py-2 border rounded-lg ${getStatusColor(getVitalStatus('bmi', vitals.bmi))}`}>
                <span className="font-bold">{vitals.bmi}</span>
                <span className="text-xs ml-2">
                  {vitals.bmi < 18.5 && 'Bajo peso'}
                  {vitals.bmi >= 18.5 && vitals.bmi < 25 && 'Normal'}
                  {vitals.bmi >= 25 && vitals.bmi < 30 && 'Sobrepeso'}
                  {vitals.bmi >= 30 && 'Obesidad'}
                </span>
              </div>
            </div>
          )}

          {/* Pain Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nivel de Dolor (0-10)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={vitals.painLevel || ''}
              onChange={(e) => handleChange('painLevel', e.target.value)}
              placeholder="0-10"
              disabled={readOnly || !isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                getStatusColor(getVitalStatus('painLevel', vitals.painLevel))
              } ${readOnly || !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        {/* Notes */}
        {isEditing && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas Clínicas
            </label>
            <textarea
              value={vitals.notes || ''}
              onChange={(e) => setVitals((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Observaciones sobre los signos vitales..."
              rows={3}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}

        {/* Action Buttons */}
        {isEditing && !readOnly && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Guardar Vitales
            </button>
          </div>
        )}
      </div>

      {/* History / Trending */}
      <AnimatePresence>
        {showTrending && vitalHistory.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Historial de Signos Vitales
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {vitalHistory.slice(-10).reverse().map((record, index) => (
                <div
                  key={record.id || index}
                  className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {new Date(record.recordedAt).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {record.bloodPressureSystolic && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">PA: </span>
                        <span className="font-medium">{record.bloodPressureSystolic}/{record.bloodPressureDiastolic}</span>
                      </div>
                    )}
                    {record.heartRate && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">FC: </span>
                        <span className="font-medium">{record.heartRate} lpm</span>
                      </div>
                    )}
                    {record.temperature && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Temp: </span>
                        <span className="font-medium">{record.temperature}°C</span>
                      </div>
                    )}
                    {record.oxygenSaturation && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">SpO₂: </span>
                        <span className="font-medium">{record.oxygenSaturation}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
