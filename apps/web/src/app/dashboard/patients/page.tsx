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

type SortOption = 'name' | 'recent' | 'upcoming';
type FilterOption = 'all' | 'active' | 'inactive' | 'withMeds' | 'upcomingAppts';

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

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

  // Apply filters and search
  let filteredPatients = patients.filter((patient) => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.tokenId.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (filterBy === 'active' && !patient.isActive) return false;
    if (filterBy === 'inactive' && patient.isActive) return false;
    if (filterBy === 'withMeds' && (!patient.medications || patient.medications.length === 0)) return false;
    if (filterBy === 'upcomingAppts' && (!patient.appointments || patient.appointments.length === 0)) return false;

    return true;
  });

  // Apply sorting
  filteredPatients = [...filteredPatients].sort((a, b) => {
    if (sortBy === 'name') {
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    } else if (sortBy === 'upcoming') {
      const aHasAppt = a.appointments && a.appointments.length > 0;
      const bHasAppt = b.appointments && b.appointments.length > 0;
      if (aHasAppt && !bHasAppt) return -1;
      if (!aHasAppt && bHasAppt) return 1;
      if (aHasAppt && bHasAppt) {
        return new Date(a.appointments[0].startTime).getTime() - new Date(b.appointments[0].startTime).getTime();
      }
      return 0;
    }
    // Default: 'recent' - already sorted by API (createdAt desc)
    return 0;
  });

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            No se pudieron cargar los pacientes
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>

          {/* Support Options */}
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium">
              ¿Necesitas ayuda?
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium shadow-md"
              >
                <span>📱</span>
                <span>Contactar por WhatsApp</span>
              </a>
              <a
                href="mailto:support@holilabs.com"
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md"
              >
                <span>📧</span>
                <span>Enviar Email</span>
              </a>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium"
          >
            Intentar de nuevo
          </button>
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
              href="/dashboard/patients/invite"
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

        {/* Filters and Sort Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2 self-center">Filtrar:</span>
              <button
                onClick={() => setFilterBy('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBy === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Todos ({patients.length})
              </button>
              <button
                onClick={() => setFilterBy('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBy === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Activos ({patients.filter(p => p.isActive).length})
              </button>
              <button
                onClick={() => setFilterBy('inactive')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBy === 'inactive'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Inactivos ({patients.filter(p => !p.isActive).length})
              </button>
              <button
                onClick={() => setFilterBy('withMeds')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBy === 'withMeds'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Con Medicamentos ({patients.filter(p => p.medications && p.medications.length > 0).length})
              </button>
              <button
                onClick={() => setFilterBy('upcomingAppts')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBy === 'upcomingAppts'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Con Citas ({patients.filter(p => p.appointments && p.appointments.length > 0).length})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="recent">Más recientes</option>
                <option value="name">Nombre A-Z</option>
                <option value="upcoming">Próximas citas</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando <span className="font-bold text-primary">{filteredPatients.length}</span> de {patients.length} pacientes
            </p>
          </div>
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
                <div
                  key={patient.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary overflow-hidden"
                >
                  {/* Patient Info - Clickable */}
                  <Link
                    href={`/dashboard/patients/${patient.id}`}
                    className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Avatar with status indicator */}
                      <div className="relative">
                        <div className="text-5xl">
                          {patient.firstName.charAt(0) === 'M' ? '👩' : '👨'}
                        </div>
                        {patient.isActive && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 truncate">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-mono">
                          {patient.tokenId}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                          {patient.ageBand || 'N/A'} • {patient.region || 'N/A'}
                        </p>

                        {/* Stats Row */}
                        <div className="flex items-center flex-wrap gap-3 text-sm mb-3">
                          {medicationCount > 0 && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">
                              <span>💊</span>
                              <span className="text-xs font-medium">{medicationCount}</span>
                            </div>
                          )}
                          {nextAppointment && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full">
                              <span>📅</span>
                              <span className="text-xs font-medium">
                                {new Date(nextAppointment.startTime).toLocaleDateString('es-ES', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          patient.isActive
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                        }`}>
                          {patient.isActive ? '✓ Activo' : '⏸ Inactivo'}
                        </div>

                        {/* Clinician */}
                        {patient.assignedClinician && (
                          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            👨‍⚕️ Dr. {patient.assignedClinician.firstName} {patient.assignedClinician.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Quick Actions Bar */}
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white dark:hover:bg-primary rounded-lg transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver Perfil
                    </Link>
                    <Link
                      href={`/dashboard/messages?patient=${patient.id}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      💬 Mensaje
                    </Link>
                    <Link
                      href={`/dashboard/appointments/new?patient=${patient.id}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📅 Cita
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
