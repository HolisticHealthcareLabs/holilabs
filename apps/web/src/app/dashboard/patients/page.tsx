'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  tokenId: string;
  ageBand: string;
  region: string;
  isActive: boolean;
  medications: { id: string; name: string }[];
  appointments: { id: string; startTime: string }[];
  assignedClinician?: {
    firstName: string;
    lastName: string;
  };
}

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatients() {
      try {
        const response = await fetch('/api/patients');
        const data = await response.json();

        if (response.ok) {
          setPatients(data.data);
        } else {
          setError(data.error || 'Failed to load patients');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.tokenId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Cargando pacientes...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error al cargar pacientes</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Nav */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <span className="text-3xl">🏥</span>
                <span className="text-xl font-bold">Holi Labs</span>
              </Link>
              <span className="text-sm opacity-80">/ Pacientes</span>
            </div>
            <Link
              href="/dashboard/patients/new"
              className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 font-medium transition"
            >
              + Nuevo Paciente
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Row */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Pacientes</div>
            <div className="text-3xl font-bold text-primary">{patients.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Activos</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {patients.filter(p => p.isActive).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Con Medicamentos</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {patients.filter(p => p.medications && p.medications.length > 0).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Citas Próximas</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {patients.filter(p => p.appointments && p.appointments.length > 0).length}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o Token ID..."
            className="w-full max-w-2xl px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Patient Cards */}
        {filteredPatients.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No se encontraron pacientes</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Intenta con otra búsqueda' : 'Comienza agregando un nuevo paciente'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => {
              const nextAppointment = patient.appointments?.[0];
              const medicationCount = patient.medications?.length || 0;

              return (
                <Link
                  key={patient.id}
                  href={`/dashboard/patients/${patient.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all p-6 border border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-5xl">
                      {patient.firstName.charAt(0) === 'M' ? '👩' : '👨'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Token: {patient.tokenId}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Edad: {patient.ageBand || 'N/A'} • {patient.region || 'N/A'}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center space-x-4 text-sm mb-3">
                        {medicationCount > 0 && (
                          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                            <span>💊</span>
                            <span>{medicationCount} med.</span>
                          </div>
                        )}
                        {nextAppointment && (
                          <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                            <span>📅</span>
                            <span>Próxima cita</span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        patient.isActive
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                      }`}>
                        {patient.isActive ? '✓ Activo' : 'Inactivo'}
                      </div>

                      {/* Clinician */}
                      {patient.assignedClinician && (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          Dr. {patient.assignedClinician.firstName} {patient.assignedClinician.lastName}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
