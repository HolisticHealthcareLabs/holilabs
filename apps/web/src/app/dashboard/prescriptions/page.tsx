'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface Prescription {
  id: string;
  patientId: string;
  medications: any[];
  diagnosis: string;
  instructions: string;
  status: string;
  signedAt: string;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    tokenId: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
  };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
}

export default function PrescriptionsPage() {
  const [user, setUser] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        loadPatients();
      }
    });
  }, []);

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/patients?limit=100');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadPrescriptions = async (patientId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/prescriptions?patientId=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      loadPrescriptions(selectedPatient);
    } else {
      setPrescriptions([]);
      setLoading(false);
    }
  }, [selectedPatient]);

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (filterStatus === 'all') return true;
    return prescription.status === filterStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const sendToPharmacy = async (prescriptionId: string) => {
    // Placeholder for pharmacy integration
    alert('Funcionalidad de envío a farmacia próximamente. Esta función se integrará con APIs de farmacias.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <span className="mr-3">💊</span>
          Recetas Médicas
        </h1>
        <p className="text-gray-600">
          Gestiona y envía recetas médicas a farmacias asociadas
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seleccionar Paciente
            </label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Seleccionar paciente --</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} (MRN: {patient.mrn})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filtrar por Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="SIGNED">Firmadas</option>
              <option value="SENT">Enviadas</option>
              <option value="DISPENSED">Dispensadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prescriptions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando recetas...</p>
        </div>
      ) : !selectedPatient ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">💊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Selecciona un paciente
          </h3>
          <p className="text-gray-600">
            Selecciona un paciente de la lista para ver sus recetas médicas
          </p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay recetas
          </h3>
          <p className="text-gray-600">
            Este paciente no tiene recetas médicas registradas
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Receta para {prescription.patient.firstName}{' '}
                      {prescription.patient.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Dr. {prescription.clinician.firstName}{' '}
                      {prescription.clinician.lastName} - Lic.{' '}
                      {prescription.clinician.licenseNumber}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      prescription.status === 'SIGNED'
                        ? 'bg-green-100 text-green-700'
                        : prescription.status === 'SENT'
                        ? 'bg-blue-100 text-blue-700'
                        : prescription.status === 'DISPENSED'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {prescription.status === 'SIGNED'
                      ? '✓ Firmada'
                      : prescription.status === 'SENT'
                      ? '📤 Enviada'
                      : prescription.status === 'DISPENSED'
                      ? '✓ Dispensada'
                      : prescription.status}
                  </span>
                </div>

                {/* Diagnosis */}
                {prescription.diagnosis && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Diagnóstico:
                    </p>
                    <p className="text-sm text-gray-900">
                      {prescription.diagnosis}
                    </p>
                  </div>
                )}

                {/* Medications */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Medicamentos:
                  </p>
                  <div className="space-y-2">
                    {prescription.medications.map((med: any, index: number) => (
                      <div
                        key={index}
                        className="bg-blue-50 rounded-lg p-3 border border-blue-200"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {med.name}
                            </p>
                            {med.genericName && med.genericName !== med.name && (
                              <p className="text-sm text-gray-600">
                                ({med.genericName})
                              </p>
                            )}
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">Dosis:</span>{' '}
                              {med.dose} - {med.frequency}
                            </p>
                            {med.instructions && (
                              <p className="text-sm text-gray-600 mt-1">
                                {med.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {prescription.instructions && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Instrucciones adicionales:
                    </p>
                    <p className="text-sm text-gray-900">
                      {prescription.instructions}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <p>Firmada: {formatDate(prescription.signedAt)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Token Paciente: {prescription.patient.tokenId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {prescription.status === 'SIGNED' && (
                      <button
                        onClick={() => sendToPharmacy(prescription.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm"
                      >
                        📤 Enviar a Farmacia
                      </button>
                    )}
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all">
                      📄 Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pharmacy Integration Notice */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center">
          <span className="mr-2">🏥</span>
          Integración con Farmacias
        </h3>
        <p className="text-blue-800 mb-3">
          Esta función permite enviar recetas médicas directamente a farmacias
          asociadas. Próximas integraciones:
        </p>
        <ul className="space-y-1 text-blue-800">
          <li>• Farmacias Benavides</li>
          <li>• Farmacias Guadalajara</li>
          <li>• Farmacias del Ahorro</li>
          <li>• API de Red de Farmacias Nacionales</li>
        </ul>
      </div>
    </div>
  );
}
