/**
 * Empty State Components
 *
 * Beautiful empty states with clear CTAs
 * Helps guide users when there's no data yet
 */

import { motion } from 'framer-motion';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  illustration?: 'patients' | 'forms' | 'appointments' | 'documents' | 'messages' | 'default';
}

export function EmptyState({ icon, title, description, action, illustration = 'default' }: EmptyStateProps) {
  const illustrations = {
    patients: (
      <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    forms: (
      <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    appointments: (
      <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    documents: (
      <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    messages: (
      <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    default: (
      <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl p-12 text-center"
    >
      {icon || illustrations[illustration]}
      <h3 className="mt-6 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600 max-w-md mx-auto">{description}</p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-blue-600/30"
            >
              {action.label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-blue-600/30"
            >
              {action.label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function NoPatientsState({ onAddPatient }: { onAddPatient?: () => void }) {
  return (
    <EmptyState
      illustration="patients"
      title="No tienes pacientes registrados"
      description="Comienza agregando tu primer paciente para gestionar su historial médico, citas y prescripciones."
      action={
        onAddPatient
          ? { label: 'Agregar Primer Paciente', onClick: onAddPatient }
          : { label: 'Agregar Primer Paciente', href: '/dashboard/patients?action=new' }
      }
    />
  );
}

export function NoFormsState() {
  return (
    <EmptyState
      illustration="forms"
      title="No hay formularios enviados"
      description="Envía formularios a tus pacientes para recopilar información importante antes de las consultas."
      action={{ label: 'Enviar Primer Formulario', href: '/dashboard/forms' }}
    />
  );
}

export function NoAppointmentsState({ onSchedule }: { onSchedule?: () => void }) {
  return (
    <EmptyState
      illustration="appointments"
      title="No hay citas programadas"
      description="Programa tu primera cita para comenzar a gestionar tu calendario médico."
      action={
        onSchedule
          ? { label: 'Programar Primera Cita', onClick: onSchedule }
          : { label: 'Programar Primera Cita', href: '/dashboard/appointments?action=new' }
      }
    />
  );
}

export function NoDocumentsState({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      illustration="documents"
      title="No hay documentos"
      description="Sube documentos médicos, resultados de laboratorio o imágenes para mantener un historial completo."
      action={
        onUpload
          ? { label: 'Subir Primer Documento', onClick: onUpload }
          : undefined
      }
    />
  );
}

export function NoMessagesState() {
  return (
    <EmptyState
      illustration="messages"
      title="No tienes mensajes"
      description="Aquí aparecerán los mensajes de tus pacientes cuando comiencen a comunicarse contigo."
    />
  );
}

export function NoResultsState({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      illustration="default"
      title={query ? `No se encontraron resultados para "${query}"` : 'No se encontraron resultados'}
      description="Intenta ajustar los filtros de búsqueda o usa términos diferentes."
      action={onClear ? { label: 'Limpiar Búsqueda', onClick: onClear } : undefined}
    />
  );
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'Ocurrió un error al cargar la información. Por favor, intenta de nuevo.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-red-200 rounded-xl p-12 text-center"
    >
      <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600 max-w-md mx-auto">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Intentar de Nuevo
        </button>
      )}
    </motion.div>
  );
}

export function SuccessState({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-green-200 rounded-xl p-12 text-center"
    >
      <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600 max-w-md mx-auto">{description}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Cerrar
        </button>
      )}
    </motion.div>
  );
}
