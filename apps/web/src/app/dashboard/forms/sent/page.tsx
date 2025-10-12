'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SentForm {
  id: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  template: {
    title: string;
  };
  status: string;
  progress: number;
  sentAt: string;
  viewedAt?: string;
  completedAt?: string;
}

export default function SentFormsPage() {
  const [sentForms, setSentForms] = useState<SentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchSentForms();
  }, []);

  const fetchSentForms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/forms/sent');
      if (!response.ok) throw new Error('Failed to fetch sent forms');
      const data = await response.json();
      setSentForms(data.forms || []);
    } catch (error) {
      console.error('Error fetching sent forms:', error);
      setSentForms([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      VIEWED: { label: 'Visto', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      IN_PROGRESS: { label: 'En Progreso', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      COMPLETED: { label: 'Completado', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      SIGNED: { label: 'Firmado', className: 'bg-green-100 text-green-700 border-green-200' },
      EXPIRED: { label: 'Expirado', className: 'bg-red-100 text-red-700 border-red-200' },
      REVOKED: { label: 'Revocado', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    };

    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredForms = sentForms.filter((form) => {
    if (filter === 'all') return true;
    return form.status === filter;
  });

  const statusCounts = {
    all: sentForms.length,
    PENDING: sentForms.filter((f) => f.status === 'PENDING').length,
    IN_PROGRESS: sentForms.filter((f) => f.status === 'IN_PROGRESS' || f.status === 'VIEWED').length,
    COMPLETED: sentForms.filter((f) => f.status === 'COMPLETED' || f.status === 'SIGNED').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/forms"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Formularios Enviados</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Rastrea el progreso de los formularios enviados a tus pacientes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{statusCounts.all}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{statusCounts.PENDING}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">En Progreso</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{statusCounts.IN_PROGRESS}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Completados</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{statusCounts.COMPLETED}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'PENDING', label: 'Pendientes' },
            { value: 'IN_PROGRESS', label: 'En Progreso' },
            { value: 'COMPLETED', label: 'Completados' },
            { value: 'SIGNED', label: 'Firmados' },
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setFilter(status.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredForms.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay formularios enviados</h3>
          <p className="mt-2 text-sm text-gray-500">
            Envía tu primer formulario a un paciente para comenzar
          </p>
          <Link
            href="/dashboard/forms"
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Enviar Formulario
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Formulario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enviado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {form.patient.firstName[0]}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {form.patient.firstName} {form.patient.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{form.template.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(form.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${form.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{form.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(form.sentAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                          Ver
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 transition-colors font-medium">
                          Reenviar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
