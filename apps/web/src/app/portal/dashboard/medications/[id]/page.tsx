'use client';

/**
 * Medication Detail Page
 * Displays full medication details with refill request option
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  BeakerIcon,
  ClockIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Medication {
  id: string;
  name: string;
  genericName: string | null;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  sideEffects: string | null;
  precautions: string | null;
  prescribedBy: string | null;
  createdAt: string;
}

interface MedicationResponse {
  success: boolean;
  data?: Medication;
  error?: string;
}

export default function MedicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const medicationId = params.id as string;

  const [medication, setMedication] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillNotes, setRefillNotes] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchMedication();
  }, [medicationId]);

  const fetchMedication = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/portal/medications/${medicationId}`);
      const data: MedicationResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar medicamento');
      }

      if (data.success && data.data) {
        setMedication(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching medication:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefill = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!medication) return;

    try {
      setRequesting(true);
      const response = await fetch(`/api/portal/medications/${medicationId}/refill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: refillNotes,
          pharmacy,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al solicitar renovación');
      }

      alert(data.message || 'Solicitud de renovación enviada exitosamente');
      setShowRefillModal(false);
      setRefillNotes('');
      setPharmacy('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al solicitar renovación');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !medication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/portal/dashboard/medications')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver a Medicamentos
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">{error || 'Medicamento no encontrado'}</p>
            <button
              onClick={fetchMedication}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/portal/dashboard/medications')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver a Medicamentos
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {medication.name}
              </h1>
              {medication.genericName && (
                <p className="text-gray-600">Nombre genérico: {medication.genericName}</p>
              )}
            </div>
            {medication.isActive && (
              <button
                onClick={() => setShowRefillModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                <ArrowPathIcon className="h-5 w-5" />
                Solicitar Renovación
              </button>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
              medication.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {medication.isActive ? ' Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Main Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <BeakerIcon className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Información del Medicamento
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dosage */}
            {medication.dosage && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Dosificación</h3>
                <p className="text-lg font-medium text-gray-900">{medication.dosage}</p>
              </div>
            )}

            {/* Frequency */}
            {/* Decorative - low contrast intentional for time/date icons */}
            {medication.frequency && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Frecuencia</h3>
                {/* Decorative - low contrast intentional for all metadata icons (clock and calendar icons on lines 224, 235, 250) */}
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900">{medication.frequency}</p>
                </div>
              </div>
            )}

            {/* Start Date */}
            {medication.startDate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Fecha de Inicio</h3>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <p className="text-gray-900">
                    {format(new Date(medication.startDate), "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* End Date */}
            {medication.endDate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Fecha de Fin</h3>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <p className="text-gray-900">
                    {format(new Date(medication.endDate), "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {medication.instructions && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              =Ë Instrucciones
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{medication.instructions}</p>
          </div>
        )}

        {/* Side Effects */}
        {medication.sideEffects && (
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationCircleIcon className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Efectos Secundarios Posibles
              </h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{medication.sideEffects}</p>
          </div>
        )}

        {/* Precautions */}
        {medication.precautions && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                  Precauciones
              </h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{medication.precautions}</p>
          </div>
        )}

        {/* Prescribed By */}
        {medication.prescribedBy && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Prescrito Por
            </h3>
            <p className="text-gray-700">{medication.prescribedBy}</p>
          </div>
        )}

        {/* Refill Request Modal */}
        {showRefillModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowPathIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Solicitar Renovación
                </h3>
              </div>

              <form onSubmit={handleRequestRefill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Farmacia (opcional)
                  </label>
                  <input
                    type="text"
                    value={pharmacy}
                    onChange={(e) => setPharmacy(e.target.value)}
                    placeholder="Ej: Farmacia del Ahorro Centro"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    value={refillNotes}
                    onChange={(e) => setRefillNotes(e.target.value)}
                    placeholder="Información adicional para tu médico..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Tu médico revisará esta solicitud y te contactará pronto para confirmar.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRefillModal(false)}
                    disabled={requesting}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={requesting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {requesting ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
