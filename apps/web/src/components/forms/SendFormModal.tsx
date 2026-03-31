'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface FormTemplate {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  category: string;
}

interface SendFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: FormTemplate;
  onSuccess?: (formInstanceId: string) => void;
}

export default function SendFormModal({ isOpen, onClose, template, onSuccess }: SendFormModalProps) {
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accessibility: Focus management
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
      setStep(1);
      setSelectedPatient(null);
      setSearchQuery('');
      setCustomMessage('');
      setError(null);
    }
  }, [isOpen]);

  // Handle Escape key and focus management
  useEffect(() => {
    if (isOpen) {
      // Store the element that opened the modal
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      // Focus the close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 100);

      // Handle Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        // Return focus to the element that opened the modal
        previousActiveElementRef.current?.focus();
      };
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedPatient || !template) return;

    setLoading(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const response = await fetch('/api/forms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          templateId: template.id,
          expiresAt: expiresAt.toISOString(),
          message: customMessage || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send form');
      }

      const data = await response.json();

      // Success
      setStep(4); // Show success screen
      onSuccess?.(data.formInstanceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedPatient(null);
    setSearchQuery('');
    setCustomMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-form-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden"
          style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <h2 id="send-form-modal-title" className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Enviar Formulario</h2>
              {template && (
                <p className="text-sm dark:text-gray-400 mt-1" style={{ color: 'var(--text-secondary)' }}>{template.title}</p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              aria-label="Cerrar diálogo"
              className="hover:text-gray-600 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4" style={{ backgroundColor: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Paciente' },
                { num: 2, label: 'Configuración' },
                { num: 3, label: 'Confirmar' },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors ${
                        step >= s.num
                          ? 'bg-blue-600 text-white'
                          : 'dark:text-gray-400'
                      }`}
                      style={{ borderRadius: 'var(--radius-full)', ...(step >= s.num ? {} : { backgroundColor: 'var(--border-default)', color: 'var(--text-secondary)' }) }}
                    >
                      {s.num}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        step >= s.num ? 'text-blue-600' : 'dark:text-gray-400'
                      }`}
                      style={step >= s.num ? {} : { color: 'var(--text-secondary)' }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`w-12 h-0.5 mx-2 ${
                        step > s.num ? 'bg-blue-600' : ''
                      }`}
                      style={step > s.num ? {} : { backgroundColor: 'var(--border-default)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
            {/* Step 1: Select Patient */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Buscar paciente
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                      style={{ color: 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8 dark:text-gray-400" style={{ color: 'var(--text-tertiary)' }}>
                      No se encontraron pacientes
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`w-full flex items-center justify-between p-4 border-2 transition-all ${
                          selectedPatient?.id === patient.id
                            ? 'border-blue-600'
                            : 'hover:border-blue-300'
                        }`}
                        style={{ borderRadius: 'var(--radius-lg)', ...(selectedPatient?.id === patient.id ? { backgroundColor: 'var(--surface-accent)' } : { borderColor: 'var(--border-default)' }) }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold" style={{ borderRadius: 'var(--radius-full)' }}>
                            {patient.firstName[0]}
                          </div>
                          <div className="text-left">
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>{patient.email}</div>
                          </div>
                        </div>
                        {selectedPatient?.id === patient.id && (
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Expiración del formulario
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                  >
                    <option value={1}>1 día</option>
                    <option value={3}>3 días</option>
                    <option value={7}>7 días (recomendado)</option>
                    <option value={14}>14 días</option>
                    <option value={30}>30 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Mensaje personalizado (opcional)
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Ej: Hola María, por favor completa este formulario antes de tu próxima cita..."
                    rows={4}
                    className="w-full px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && selectedPatient && template && (
              <div className="space-y-6">
                <div className="p-6" style={{ backgroundColor: 'var(--surface-accent)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                  <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Resumen</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Paciente:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Formulario:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{template.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Tiempo estimado:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>~{template.estimatedMinutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Expira en:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{expiresInDays} días</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPatient.email}</span>
                    </div>
                  </div>
                </div>

                {customMessage && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Mensaje personalizado:
                    </label>
                    <div className="p-4 text-sm" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
                      {customMessage}
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="p-4"
                    style={{ backgroundColor: 'var(--surface-danger)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}
                  >
                    <p className="text-sm text-red-700">
                      <span className="sr-only">Error: </span>
                      {error}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--surface-success)', borderRadius: 'var(--radius-full)' }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--text-success)' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>¡Formulario enviado!</h3>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Se ha enviado un correo electrónico a {selectedPatient?.email} con el enlace al formulario.
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {step < 4 && (
            <div className="flex items-center justify-between p-6" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--surface-secondary)' }}>
              <button
                onClick={() => {
                  if (step === 1) {
                    handleClose();
                  } else {
                    setStep(step - 1);
                  }
                }}
                className="px-6 py-2.5 hover:bg-gray-200 transition-colors font-medium"
                style={{ color: 'var(--text-secondary)', borderRadius: 'var(--radius-lg)' }}
              >
                {step === 1 ? 'Cancelar' : 'Atrás'}
              </button>

              <button
                onClick={() => {
                  if (step === 3) {
                    handleSend();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={(step === 1 && !selectedPatient) || loading}
                className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                {loading ? 'Enviando...' : step === 3 ? 'Enviar formulario' : 'Siguiente'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
