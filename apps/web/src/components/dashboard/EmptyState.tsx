'use client';

/**
 * Empty State Component
 * Shows helpful guidance when no data exists
 *
 * Inspired by Stripe, Notion, Linear
 */

import Link from 'next/link';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon */}
      <div className="text-7xl mb-6 opacity-80">{icon}</div>

      {/* Title */}
      <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>

      {/* Description */}
      <p className="max-w-md mb-8" style={{ color: 'var(--text-secondary)' }}>{description}</p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {primaryAction && (
          primaryAction.href ? (
            <Link
              href={primaryAction.href}
              className="px-6 py-3 bg-gradient-to-r from-primary to-purple-700 text-white font-semibold hover:shadow-lg transition-all hover:scale-105"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              {primaryAction.label}
            </Link>
          ) : (
            <button
              onClick={primaryAction.onClick}
              className="px-6 py-3 bg-gradient-to-r from-primary to-purple-700 text-white font-semibold hover:shadow-lg transition-all hover:scale-105"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              {primaryAction.label}
            </button>
          )
        )}

        {secondaryAction && (
          <Link
            href={secondaryAction.href}
            className="hover:text-gray-900 font-medium transition underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PRE-BUILT EMPTY STATES
// ============================================================================

export const EmptyStates = {
  noPatients: (
    <EmptyState
      icon="👤"
      title="No hay pacientes todavía"
      description="Comienza agregando tu primer paciente para documentar consultas y gestionar historias clínicas digitales."
      primaryAction={{
        label: 'Agregar Primer Paciente',
        href: '/dashboard/patients/new',
      }}
      secondaryAction={{
        label: 'Ver video tutorial',
        href: '#',
      }}
    />
  ),

  noAppointments: (
    <EmptyState
      icon="📅"
      title="No hay citas programadas"
      description="Agenda citas para tus pacientes y recibe recordatorios automáticos por WhatsApp."
      primaryAction={{
        label: 'Crear Nueva Cita',
        href: '/dashboard/appointments/new',
      }}
    />
  ),

  noClinicalNotes: (
    <EmptyState
      icon="📝"
      title="Sin notas clínicas"
      description="Documenta consultas con nuestro editor SOAP potenciado por IA. Rápido, profesional y seguro."
      primaryAction={{
        label: 'Ver Pacientes',
        href: '/dashboard/patients',
      }}
      secondaryAction={{
        label: 'Ver ejemplo de nota',
        href: '#',
      }}
    />
  ),

  noPrescriptions: (
    <EmptyState
      icon="💊"
      title="No hay recetas activas"
      description="Crea recetas digitales con verificación de interacciones medicamentosas automática."
      primaryAction={{
        label: 'Ver Pacientes',
        href: '/dashboard/patients',
      }}
    />
  ),

  aiNotConfigured: (
    <EmptyState
      icon="🤖"
      title="Asistente de IA no configurado"
      description="Configura tu API key de Claude o OpenAI para comenzar a usar el asistente de decisiones clínicas."
      primaryAction={{
        label: 'Configurar Ahora',
        href: '/dashboard/settings',
      }}
      secondaryAction={{
        label: 'Ver guía de configuración',
        href: '#',
      }}
    />
  ),

  whatsappNotConfigured: (
    <EmptyState
      icon="📱"
      title="WhatsApp no configurado"
      description="Conecta Twilio para enviar recordatorios automáticos de citas por WhatsApp a tus pacientes."
      primaryAction={{
        label: 'Configurar WhatsApp',
        href: '/dashboard/settings',
      }}
      secondaryAction={{
        label: 'Omitir por ahora',
        href: '/dashboard',
      }}
    />
  ),

  searchNoResults: (query: string) => (
    <EmptyState
      icon="🔍"
      title="Sin resultados"
      description={`No encontramos resultados para "${query}". Intenta con otros términos de búsqueda.`}
      primaryAction={{
        label: 'Ver Todos los Pacientes',
        href: '/dashboard/patients',
      }}
    />
  ),
};
