'use client';

/**
 * Situation Badges Component
 *
 * Displays and manages color-coded situation tags for appointments:
 * - Deudas (RED) - Opens payment notification modal
 * - Urgente (ORANGE)
 * - Primera Vez (BLUE)
 * - Seguimiento (GREEN)
 * - VIP (PURPLE)
 *
 * Features:
 * - Multi-select tags
 * - Click "Deudas" opens notification action modal
 * - Smooth add/remove animations
 * - Color-coded by priority
 */

import { useState, Fragment } from 'react';

interface Situation {
  id: string;
  name: string;
  color: string;
  icon?: string;
  priority: number;
  requiresAction?: boolean;
}

interface SituationBadgesProps {
  appointmentId: string;
  situations: Situation[];
  availableSituations: Situation[];
  onSituationsChange: (situations: Situation[]) => void;
  onPaymentNotificationSend: (channel: 'whatsapp' | 'email' | 'in-app' | 'all') => void;
}

export function SituationBadges({
  appointmentId,
  situations,
  availableSituations,
  onSituationsChange,
  onPaymentNotificationSend,
}: SituationBadgesProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Add situation
  const handleAddSituation = (situation: Situation) => {
    if (!situations.find(s => s.id === situation.id)) {
      onSituationsChange([...situations, situation]);
    }
    setShowSelector(false);
  };

  // Remove situation
  const handleRemoveSituation = (situationId: string) => {
    onSituationsChange(situations.filter(s => s.id !== situationId));
  };

  // Handle situation click
  const handleSituationClick = (situation: Situation) => {
    if (situation.requiresAction && situation.name === 'Deudas') {
      setShowPaymentModal(true);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Existing Situations */}
        {situations.map((situation) => (
          <button
            key={situation.id}
            onClick={() => handleSituationClick(situation)}
            className="group relative inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-full shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
            style={{ backgroundColor: situation.color }}
          >
            {situation.icon && <span>{situation.icon}</span>}
            <span>{situation.name}</span>

            {/* Remove button (hover to show) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSituation(situation.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </button>
        ))}

        {/* Add Situation Button */}
        {situations.length < availableSituations.length && (
          <div className="relative">
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              + Agregar
            </button>

            {/* Situation Selector Dropdown */}
            {showSelector && (
              <div className="absolute z-50 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 py-2">
                    Seleccionar Situación
                  </h3>
                  <div className="space-y-1">
                    {availableSituations
                      .filter(s => !situations.find(existing => existing.id === s.id))
                      .sort((a, b) => a.priority - b.priority)
                      .map((situation) => (
                        <button
                          key={situation.id}
                          onClick={() => handleAddSituation(situation)}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                            style={{ backgroundColor: situation.color }}
                          >
                            {situation.icon || situation.name[0]}
                          </span>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {situation.name}
                            </div>
                            {situation.requiresAction && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Requiere acción
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Notification Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-4xl">💰</span>
                  <div>
                    <h2 className="text-2xl font-bold">Notificar Deudas</h2>
                    <p className="text-red-100 text-sm">Recordatorio de pago pendiente</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:bg-red-600 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notificar al paciente vía:
              </h3>
              <div className="space-y-3">
                {/* WhatsApp */}
                <button
                  onClick={() => {
                    onPaymentNotificationSend('whatsapp');
                    setShowPaymentModal(false);
                  }}
                  className="w-full flex items-center space-x-4 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <span className="text-3xl">📱</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">WhatsApp</div>
                    <div className="text-green-100 text-sm">Envío instantáneo</div>
                  </div>
                </button>

                {/* In-App */}
                <button
                  onClick={() => {
                    onPaymentNotificationSend('in-app');
                    setShowPaymentModal(false);
                  }}
                  className="w-full flex items-center space-x-4 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <span className="text-3xl">💬</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">Notificación en App</div>
                    <div className="text-blue-100 text-sm">Push notification</div>
                  </div>
                </button>

                {/* Email */}
                <button
                  onClick={() => {
                    onPaymentNotificationSend('email');
                    setShowPaymentModal(false);
                  }}
                  className="w-full flex items-center space-x-4 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <span className="text-3xl">📧</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">Email</div>
                    <div className="text-purple-100 text-sm">Correo electrónico</div>
                  </div>
                </button>

                {/* All Channels */}
                <button
                  onClick={() => {
                    onPaymentNotificationSend('all');
                    setShowPaymentModal(false);
                  }}
                  className="w-full flex items-center space-x-4 px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <span className="text-3xl">🔔</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">Todos los Canales</div>
                    <div className="text-gray-300 text-sm">WhatsApp, Email y App</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                El paciente recibirá un recordatorio de pago inmediatamente
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
