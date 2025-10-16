'use client';

/**
 * Onboarding Checklist Component
 * Inspired by Linear, Notion, Stripe
 *
 * Shows progress, guides users to activation
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function OnboardingChecklist() {
  const [isVisible, setIsVisible] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'invite-patient',
      title: 'Invita a tu primer paciente',
      description: 'Comienza agregando un paciente a tu práctica',
      completed: false,
      icon: '👤',
      action: {
        label: 'Invitar paciente',
        href: '/dashboard/patients/new',
      },
    },
    {
      id: 'create-note',
      title: 'Crea una nota clínica',
      description: 'Documenta tu primera consulta con IA',
      completed: false,
      icon: '📝',
      action: {
        label: 'Ver ejemplo',
        href: '/dashboard/patients',
      },
    },
    {
      id: 'try-ai',
      title: 'Prueba el asistente de IA',
      description: 'Pregunta sobre diagnósticos o interacciones',
      completed: false,
      icon: '🤖',
      action: {
        label: 'Abrir chat',
        href: '/dashboard/ai',
      },
    },
    {
      id: 'setup-whatsapp',
      title: 'Configura WhatsApp (opcional)',
      description: 'Envía recordatorios automáticos a pacientes',
      completed: false,
      icon: '📱',
      action: {
        label: 'Configurar',
        href: '/dashboard/settings',
      },
    },
  ]);

  const completedCount = items.filter(item => item.completed).length;
  const progressPercentage = (completedCount / items.length) * 100;

  // Load completion state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('onboarding_checklist');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setItems(parsed);
      } catch (e) {
        console.error('Failed to parse onboarding state');
      }
    }
  }, []);

  // Save state when items change
  useEffect(() => {
    localStorage.setItem('onboarding_checklist', JSON.stringify(items));
  }, [items]);

  const handleComplete = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform z-50"
        title="Mostrar guía"
      >
        📋
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-700 text-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Comienza con Holi Labs</h3>
          <button
            onClick={() => setIsVisible(false)}
            aria-label="Cerrar checklist"
            className="text-white/80 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{completedCount} de {items.length} completados</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 transition-all ${
              item.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200 hover:border-primary'
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Checkbox */}
              <button
                onClick={() => handleComplete(item.id)}
                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  item.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-primary'
                }`}
              >
                {item.completed && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-2xl">{item.icon}</span>
                  <h4 className={`font-semibold text-sm ${
                    item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {item.title}
                  </h4>
                </div>
                <p className="text-xs text-gray-600 mb-3">{item.description}</p>

                {/* Action Button */}
                {item.action && !item.completed && (
                  item.action.href ? (
                    <Link
                      href={item.action.href}
                      className="inline-block text-xs font-medium text-primary hover:text-primary/80 transition"
                    >
                      {item.action.label} →
                    </Link>
                  ) : (
                    <button
                      onClick={item.action.onClick}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition"
                    >
                      {item.action.label} →
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {completedCount === items.length && (
        <div className="bg-green-50 border-t border-green-200 p-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="font-semibold text-green-900 mb-1">¡Configuración completa!</p>
          <p className="text-sm text-green-700">
            Ya estás listo para usar Holi Labs al máximo
          </p>
        </div>
      )}
    </div>
  );
}
