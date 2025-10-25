'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SupportContact from '@/components/SupportContact';
import { PatientListDualView, PatientDetailSplitPanel } from '@/components/patients';
import type { Patient } from '@/components/patients/PatientListDualView';

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

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

  // Bulk actions handler
  const handleBulkAction = async (action: string, patientIds: string[]) => {
    switch (action) {
      case 'export':
        // Export selected patients to CSV
        try {
          const selectedPatients = patients.filter(p => patientIds.includes(p.id));
          const csvHeaders = 'Token ID,Nombre,Edad,Región,Estado,Medicamentos,Citas';
          const csvRows = selectedPatients.map(p =>
            `${p.tokenId},"${p.firstName} ${p.lastName}",${p.ageBand},${p.region},${p.isActive ? 'Activo' : 'Inactivo'},${p.medications?.length || 0},${p.appointments?.length || 0}`
          );
          const csvContent = [csvHeaders, ...csvRows].join('\n');

          // Download CSV
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `pacientes_${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          alert(`✓ ${patientIds.length} pacientes exportados exitosamente`);
        } catch (error) {
          console.error('Error exporting patients:', error);
          alert('Error al exportar pacientes');
        }
        break;

      case 'assign':
        // TODO: Open modal to assign clinician
        alert(`Asignar clínico a ${patientIds.length} pacientes (próximamente)`);
        break;

      case 'tag':
        // TODO: Open modal to add tags
        alert(`Agregar etiquetas a ${patientIds.length} pacientes (próximamente)`);
        break;

      case 'deactivate':
        // TODO: Deactivate selected patients
        if (confirm(`¿Estás seguro de que quieres desactivar ${patientIds.length} pacientes?`)) {
          alert('Desactivando pacientes (próximamente)');
        }
        break;

      default:
        console.warn('Unknown bulk action:', action);
    }
  };

  // Patient click handler - open split panel
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatientId(patient.id);
  };

  // Patient change handler for split panel navigation
  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  // Close split panel
  const handleCloseSplitPanel = () => {
    setSelectedPatientId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Skeleton */}
        <header className="bg-primary text-white shadow-md">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-3xl">🏥</span>
                <span className="text-xl font-bold">Holi Labs</span>
                <span className="text-sm opacity-80">/ Pacientes</span>
              </div>
              <div className="bg-white/20 h-10 w-40 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Row Skeleton */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
            ))}
          </div>

          {/* Patient List Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-750 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                No se pudieron cargar los pacientes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>

            {/* Support Contact Component */}
            <div className="mb-6">
              <SupportContact variant="default" />
            </div>

            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <span>🔄</span>
                <span>Intentar de nuevo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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

          {/* Phase 2: Dual-View Patient List Component */}
          <PatientListDualView
            patients={patients}
            loading={loading}
            onPatientClick={handlePatientClick}
            onBulkAction={handleBulkAction}
          />
        </div>
      </div>

      {/* Phase 2: Split-Panel Detail View */}
      {selectedPatientId && (
        <PatientDetailSplitPanel
          patientId={selectedPatientId}
          patients={patients}
          onClose={handleCloseSplitPanel}
          onPatientChange={handlePatientChange}
        />
      )}
    </>
  );
}
