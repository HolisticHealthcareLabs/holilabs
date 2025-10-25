'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ClinicalDecisionSupport Component
 *
 * Phase 3: Clinical Workflows
 * Hospital-grade clinical decision support with alerts, guidelines, and recommendations
 */

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category:
    | 'drug_interaction'
    | 'contraindication'
    | 'lab_result'
    | 'vital_sign'
    | 'guideline'
    | 'preventive_care'
    | 'follow_up';
  title: string;
  message: string;
  recommendation?: string;
  source?: string;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  dismissible: boolean;
  relatedTo?: string; // medication, problem, lab, etc.
  createdAt: Date;
}

export interface ClinicalGuideline {
  id: string;
  condition: string;
  title: string;
  recommendations: string[];
  evidence: 'high' | 'medium' | 'low';
  source: string;
  lastUpdated: Date;
}

export interface ClinicalDecisionSupportProps {
  patientId?: string;
  patientData?: {
    age?: number;
    gender?: string;
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    vitalSigns?: any;
    labResults?: any[];
  };
  onDismissAlert?: (alertId: string) => void;
  onAcknowledgeAlert?: (alertId: string) => void;
  showGuidelines?: boolean;
  className?: string;
}

// Simulated clinical alerts
const generateAlerts = (patientData: any): Alert[] => {
  const alerts: Alert[] = [];

  // Drug interaction alerts
  if (
    patientData?.medications?.includes('Metformina') &&
    patientData?.medications?.includes('Alcohol')
  ) {
    alerts.push({
      id: 'alert-1',
      type: 'critical',
      category: 'drug_interaction',
      title: 'Interacción Medicamentosa Crítica',
      message: 'Riesgo de acidosis láctica por combinación de Metformina con alcohol',
      recommendation:
        'Educar al paciente sobre riesgo. Considerar monitoreo de función renal y lactato.',
      source: 'Base de Datos de Interacciones Medicamentosas',
      priority: 'high',
      actionRequired: true,
      dismissible: false,
      relatedTo: 'Metformina',
      createdAt: new Date(),
    });
  }

  // Vital signs alerts
  if (patientData?.vitalSigns?.bloodPressureSystolic > 180) {
    alerts.push({
      id: 'alert-2',
      type: 'critical',
      category: 'vital_sign',
      title: 'Crisis Hipertensiva',
      message: `Presión arterial sistólica de ${patientData.vitalSigns.bloodPressureSystolic} mmHg`,
      recommendation:
        'Evaluación inmediata. Considerar tratamiento antihipertensivo urgente. Descartar emergencia hipertensiva.',
      source: 'Guías AHA/ACC 2024',
      priority: 'high',
      actionRequired: true,
      dismissible: false,
      relatedTo: 'Presión Arterial',
      createdAt: new Date(),
    });
  }

  // Age-based preventive care
  if (patientData?.age && patientData.age >= 50 && patientData.gender === 'M') {
    alerts.push({
      id: 'alert-3',
      type: 'info',
      category: 'preventive_care',
      title: 'Detección de Cáncer Colorrectal',
      message: 'Paciente elegible para tamizaje de cáncer colorrectal',
      recommendation:
        'Discutir opciones de tamizaje: colonoscopía cada 10 años o test de sangre oculta en heces anual.',
      source: 'USPSTF Guidelines 2024',
      priority: 'medium',
      actionRequired: false,
      dismissible: true,
      relatedTo: 'Prevención',
      createdAt: new Date(),
    });
  }

  // Condition-based guidelines
  if (patientData?.conditions?.includes('Diabetes tipo 2')) {
    alerts.push({
      id: 'alert-4',
      type: 'info',
      category: 'guideline',
      title: 'Monitoreo de Diabetes',
      message: 'Recomendación de exámenes de control para diabetes tipo 2',
      recommendation:
        'HbA1c cada 3-6 meses, perfil lipídico anual, examen de fondo de ojo anual, microalbuminuria anual.',
      source: 'ADA Standards of Care 2024',
      priority: 'medium',
      actionRequired: false,
      dismissible: true,
      relatedTo: 'Diabetes',
      createdAt: new Date(),
    });
  }

  // Allergy contraindication
  if (
    patientData?.allergies?.includes('Penicilina') &&
    patientData?.medications?.includes('Amoxicilina')
  ) {
    alerts.push({
      id: 'alert-5',
      type: 'critical',
      category: 'contraindication',
      title: 'Contraindicación por Alergia',
      message: 'Amoxicilina prescrita en paciente con alergia a penicilina',
      recommendation:
        'SUSPENDER inmediatamente. Considerar alternativas: azitromicina, fluoroquinolonas, o cefalosporinas de 3ra generación (con precaución).',
      source: 'Sistema de Alertas de Alergias',
      priority: 'high',
      actionRequired: true,
      dismissible: false,
      relatedTo: 'Amoxicilina',
      createdAt: new Date(),
    });
  }

  // Follow-up reminder
  if (patientData?.conditions?.includes('Hipertensión')) {
    alerts.push({
      id: 'alert-6',
      type: 'warning',
      category: 'follow_up',
      title: 'Seguimiento Requerido',
      message: 'Paciente con hipertensión requiere control de presión arterial',
      recommendation: 'Agendar cita de seguimiento en 2-4 semanas para evaluación de tratamiento.',
      source: 'Protocolo de Manejo de Hipertensión',
      priority: 'medium',
      actionRequired: false,
      dismissible: true,
      relatedTo: 'Hipertensión',
      createdAt: new Date(),
    });
  }

  return alerts;
};

// Clinical guidelines database
const CLINICAL_GUIDELINES: ClinicalGuideline[] = [
  {
    id: 'guideline-1',
    condition: 'Hipertensión',
    title: 'Manejo de Hipertensión Arterial (AHA/ACC 2024)',
    recommendations: [
      'Objetivo de PA < 130/80 mmHg para mayoría de pacientes',
      'Modificaciones de estilo de vida: dieta DASH, ejercicio, reducción de sodio',
      'Primera línea: tiazidas, IECAs, ARAs, o bloqueadores de canales de calcio',
      'Monitoreo ambulatorio recomendado para confirmar diagnóstico',
      'Evaluación de daño a órganos blanco (renal, cardíaco, cerebral)',
    ],
    evidence: 'high',
    source: 'American Heart Association / American College of Cardiology',
    lastUpdated: new Date('2024-01-01'),
  },
  {
    id: 'guideline-2',
    condition: 'Diabetes Tipo 2',
    title: 'Estándares de Cuidado en Diabetes (ADA 2024)',
    recommendations: [
      'Objetivo HbA1c < 7% para mayoría de adultos no embarazadas',
      'Metformina como primera línea si no hay contraindicaciones',
      'Considerar agonistas GLP-1 o iSGLT2 en enfermedad cardiovascular o renal',
      'Tamizaje anual de retinopatía, nefropatía y neuropatía',
      'Estatinas para prevención cardiovascular en > 40 años',
    ],
    evidence: 'high',
    source: 'American Diabetes Association',
    lastUpdated: new Date('2024-01-01'),
  },
  {
    id: 'guideline-3',
    condition: 'Infección Respiratoria Alta',
    title: 'Manejo de Infecciones Respiratorias Altas No Complicadas',
    recommendations: [
      'Mayoría son virales: evitar antibióticos innecesarios',
      'Tratamiento sintomático: analgésicos, antipiréticos, hidratación',
      'Antibióticos solo si sospecha bacteriana: > 10 días de síntomas, fiebre alta persistente',
      'Educación al paciente sobre curso natural de enfermedad (7-10 días)',
      'Signos de alarma: disnea, fiebre > 39°C persistente, dolor torácico',
    ],
    evidence: 'high',
    source: 'CDC Guidelines / IDSA',
    lastUpdated: new Date('2024-01-01'),
  },
];

const ALERT_COLORS = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-800 dark:text-red-300',
    icon: '🚨',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-300',
    icon: '⚠️',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'ℹ️',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-300',
    icon: '✓',
  },
};

export function ClinicalDecisionSupport({
  patientId,
  patientData,
  onDismissAlert,
  onAcknowledgeAlert,
  showGuidelines = true,
  className = '',
}: ClinicalDecisionSupportProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [selectedGuideline, setSelectedGuideline] = useState<ClinicalGuideline | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Generate alerts based on patient data
  useEffect(() => {
    if (patientData) {
      const generatedAlerts = generateAlerts(patientData);
      setAlerts(generatedAlerts);
    }
  }, [patientData]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
    if (onDismissAlert) {
      onDismissAlert(alertId);
    }
  };

  const handleAcknowledge = (alertId: string) => {
    if (onAcknowledgeAlert) {
      onAcknowledgeAlert(alertId);
    }
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));
  const criticalAlerts = visibleAlerts.filter((a) => a.type === 'critical');
  const warningAlerts = visibleAlerts.filter((a) => a.type === 'warning');
  const infoAlerts = visibleAlerts.filter((a) => a.type === 'info');

  const relevantGuidelines = CLINICAL_GUIDELINES.filter((guideline) =>
    patientData?.conditions?.some((condition) =>
      guideline.condition.toLowerCase().includes(condition.toLowerCase())
    )
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alerts Summary */}
      {visibleAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Alertas Clínicas
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {criticalAlerts.length} críticas • {warningAlerts.length} advertencias •{' '}
                  {infoAlerts.length} informativas
                </p>
              </div>
            </div>
            {visibleAlerts.length > 3 && (
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {showAllAlerts ? 'Mostrar menos' : `Ver todas (${visibleAlerts.length})`}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(showAllAlerts ? visibleAlerts : visibleAlerts.slice(0, 3)).map((alert) => {
              const colors = ALERT_COLORS[alert.type];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 border-2 rounded-lg ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{colors.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`font-bold ${colors.text}`}>{alert.title}</h3>
                            {alert.actionRequired && (
                              <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded-full">
                                Acción Requerida
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                alert.priority === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                  : alert.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                              }`}
                            >
                              {alert.priority === 'high' && 'Alta'}
                              {alert.priority === 'medium' && 'Media'}
                              {alert.priority === 'low' && 'Baja'}
                            </span>
                          </div>
                          <p className={`text-sm ${colors.text} mb-2`}>{alert.message}</p>
                          {alert.recommendation && (
                            <div className={`text-sm ${colors.text} bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg mb-2`}>
                              <div className="font-medium mb-1">📋 Recomendación:</div>
                              <div>{alert.recommendation}</div>
                            </div>
                          )}
                          {alert.source && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Fuente: {alert.source}
                            </p>
                          )}
                        </div>
                        {alert.dismissible && (
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className={`ml-4 ${colors.text} hover:opacity-70 transition-opacity`}
                            title="Descartar alerta"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                      {alert.actionRequired && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            Reconocer y Actuar
                          </button>
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                          >
                            Ya Revisado
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clinical Guidelines */}
      {showGuidelines && relevantGuidelines.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">📚</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Guías Clínicas Relevantes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Basadas en condiciones del paciente
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {relevantGuidelines.map((guideline) => (
              <div
                key={guideline.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() =>
                  setSelectedGuideline(
                    selectedGuideline?.id === guideline.id ? null : guideline
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {guideline.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          guideline.evidence === 'high'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : guideline.evidence === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Evidencia {guideline.evidence === 'high' ? 'Alta' : guideline.evidence === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Condición: {guideline.condition}
                    </p>

                    <AnimatePresence>
                      {selectedGuideline?.id === guideline.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                        >
                          <div className="space-y-2">
                            <div className="font-medium text-gray-900 dark:text-white mb-2">
                              Recomendaciones:
                            </div>
                            <ul className="space-y-2">
                              {guideline.recommendations.map((rec, index) => (
                                <li
                                  key={index}
                                  className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <span className="text-primary mt-0.5">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                            Fuente: {guideline.source} •{' '}
                            Actualizado: {new Date(guideline.lastUpdated).toLocaleDateString('es-ES')}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {selectedGuideline?.id === guideline.id ? '▼' : '▶'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {visibleAlerts.length === 0 && relevantGuidelines.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No hay alertas activas
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            El sistema está monitoreando continuamente los datos del paciente
          </p>
        </div>
      )}
    </div>
  );
}
