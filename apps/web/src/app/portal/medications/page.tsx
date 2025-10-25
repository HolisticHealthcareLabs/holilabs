/**
export const dynamic = 'force-dynamic';

 * Patient Medications Page
 *
 * Beautiful medication management with:
 * - Active medications list
 * - Dosage schedules
 * - Refill tracking
 * - Prescriber information
 * - Mobile-first design for iOS/Android apps
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Prescriber {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string | null;
}

interface Prescription {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  refillsRemaining: number;
}

interface Medication {
  id: string;
  name: string;
  genericName: string | null;
  dose: string;
  frequency: string;
  route: string;
  instructions: string | null;
  sideEffects: string | null;
  isActive: boolean;
  createdAt: string;
  prescriber: Prescriber;
  prescription: Prescription | null;
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeMedications, setActiveMedications] = useState<Medication[]>([]);
  const [inactiveMedications, setInactiveMedications] = useState<Medication[]>([]);
  const [needsRefill, setNeedsRefill] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const response = await fetch('/api/portal/medications');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar medicamentos');
      }

      setMedications(data.data.medications);
      setActiveMedications(data.data.activeMedications);
      setInactiveMedications(data.data.inactiveMedications);
      setNeedsRefill(data.data.needsRefill);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysUntilEnd = (endDate: string): number => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const getRouteIcon = (route: string) => {
    switch (route.toLowerCase()) {
      case 'oral':
        return '💊';
      case 'topical':
        return '🧴';
      case 'injection':
        return '💉';
      case 'inhaled':
        return '🌬️';
      default:
        return '💊';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <svg
            className="w-12 h-12 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error al cargar medicamentos
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMedications}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const displayMedications = activeTab === 'active' ? activeMedications : inactiveMedications;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Mis Medicamentos
        </h1>
        <p className="text-gray-600">
          Administra tus medicamentos y prescripciones
        </p>
      </div>

      {/* Refill Alert */}
      {needsRefill.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">
                ⚠️ Medicamentos que necesitan renovación
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                {needsRefill.length} medicamento{needsRefill.length !== 1 ? 's' : ''} se{needsRefill.length !== 1 ? 'n' : ''} terminan pronto. Contacta a tu médico para renovar.
              </p>
              <div className="space-y-2">
                {needsRefill.map((med) => (
                  <div key={med.id} className="flex items-center gap-2 text-sm text-yellow-900">
                    <span className="font-semibold">{med.name}</span>
                    <span className="text-yellow-700">
                      • {getDaysUntilEnd(med.prescription!.endDate)} días restantes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💊</span>
            <span className="text-3xl font-bold">{activeMedications.length}</span>
          </div>
          <p className="text-sm font-medium">Activos</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📋</span>
            <span className="text-3xl font-bold">{medications.length}</span>
          </div>
          <p className="text-sm font-medium">Total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🔄</span>
            <span className="text-3xl font-bold">{needsRefill.length}</span>
          </div>
          <p className="text-sm font-medium">Renovación</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">👨‍⚕️</span>
            <span className="text-3xl font-bold">
              {new Set(medications.map((m) => m.prescriber.id)).size}
            </span>
          </div>
          <p className="text-sm font-medium">Prescriptores</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'active'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Activos ({activeMedications.length})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'inactive'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Inactivos ({inactiveMedications.length})
        </button>
      </div>

      {/* Medications List */}
      <AnimatePresence mode="wait">
        {displayMedications.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'active'
                ? 'No tienes medicamentos activos'
                : 'No hay medicamentos inactivos'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'active'
                ? 'Los medicamentos prescritos aparecerán aquí'
                : 'Los medicamentos descontinuados aparecerán aquí'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-4"
          >
            {displayMedications.map((medication, index) => {
              const daysUntilEnd = medication.prescription
                ? getDaysUntilEnd(medication.prescription.endDate)
                : null;
              const needsRefillAlert = daysUntilEnd !== null && daysUntilEnd <= 7;

              return (
                <motion.div
                  key={medication.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedMed(medication)}
                  className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                        {getRouteIcon(medication.route)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {medication.name}
                        </h3>
                        {medication.genericName && (
                          <p className="text-sm text-gray-600 mb-2">
                            {medication.genericName}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-semibold text-green-600">
                            {medication.dose}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-700">{medication.frequency}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 capitalize">{medication.route}</span>
                        </div>
                      </div>
                    </div>
                    {needsRefillAlert && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                        ⚠️ Renovar pronto
                      </span>
                    )}
                  </div>

                  {/* Instructions */}
                  {medication.instructions && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        📋 Instrucciones
                      </p>
                      <p className="text-sm text-blue-800">{medication.instructions}</p>
                    </div>
                  )}

                  {/* Prescriber */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {medication.prescriber.firstName[0]}
                      {medication.prescriber.lastName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        Dr. {medication.prescriber.firstName} {medication.prescriber.lastName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {medication.prescriber.specialty || 'Medicina General'}
                      </p>
                    </div>
                  </div>

                  {/* Prescription Info */}
                  {medication.prescription && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Inicio</p>
                          <p className="font-semibold text-gray-900">
                            {format(new Date(medication.prescription.startDate), 'dd/MMM/yyyy', {
                              locale: es,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Vencimiento</p>
                          <p
                            className={`font-semibold ${
                              needsRefillAlert ? 'text-yellow-600' : 'text-gray-900'
                            }`}
                          >
                            {format(new Date(medication.prescription.endDate), 'dd/MMM/yyyy', {
                              locale: es,
                            })}
                            {daysUntilEnd !== null && (
                              <span className="text-xs ml-2">({daysUntilEnd}d)</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Renovaciones</p>
                          <p className="font-semibold text-gray-900">
                            {medication.prescription.refillsRemaining}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Estado</p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              medication.prescription.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {medication.prescription.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Side Effects Warning */}
                  {medication.sideEffects && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-900 mb-1">
                        ⚠️ Efectos secundarios posibles
                      </p>
                      <p className="text-xs text-red-800">{medication.sideEffects}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">
          💡 Consejos para el manejo de medicamentos
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Toma tus medicamentos a la misma hora todos los días</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Configura alarmas como recordatorio (próximamente disponible)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Solicita renovaciones con al menos 7 días de anticipación</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Contacta a tu médico si experimentas efectos secundarios</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
