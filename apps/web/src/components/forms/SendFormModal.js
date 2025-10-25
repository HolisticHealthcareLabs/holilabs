"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SendFormModal;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function SendFormModal({ isOpen, onClose, template, onSuccess }) {
    const [step, setStep] = (0, react_1.useState)(1);
    const [patients, setPatients] = (0, react_1.useState)([]);
    const [selectedPatient, setSelectedPatient] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [expiresInDays, setExpiresInDays] = (0, react_1.useState)(7);
    const [customMessage, setCustomMessage] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Accessibility: Focus management
    const closeButtonRef = (0, react_1.useRef)(null);
    const previousActiveElementRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            // Store the element that opened the modal
            previousActiveElementRef.current = document.activeElement;
            // Focus the close button when modal opens
            setTimeout(() => closeButtonRef.current?.focus(), 100);
            // Handle Escape key
            const handleEscape = (e) => {
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
            if (!response.ok)
                throw new Error('Failed to fetch patients');
            const data = await response.json();
            setPatients(data.patients || []);
        }
        catch (error) {
            console.error('Error fetching patients:', error);
            setPatients([]);
        }
    };
    const filteredPatients = patients.filter((patient) => patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()));
    const handleSend = async () => {
        if (!selectedPatient || !template)
            return;
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send form');
        }
        finally {
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
    if (!isOpen)
        return null;
    return (<framer_motion_1.AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="send-form-modal-title">
        {/* Backdrop */}
        <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>

        {/* Modal */}
        <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 id="send-form-modal-title" className="text-2xl font-bold text-gray-900">Enviar Formulario</h2>
              {template && (<p className="text-sm text-gray-500 mt-1">{template.title}</p>)}
            </div>
            <button ref={closeButtonRef} onClick={handleClose} aria-label="Cerrar diálogo" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {[
            { num: 1, label: 'Paciente' },
            { num: 2, label: 'Configuración' },
            { num: 3, label: 'Confirmar' },
        ].map((s, i) => (<div key={s.num} className="flex items-center">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s.num
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'}`}>
                      {s.num}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${step >= s.num ? 'text-blue-600' : 'text-gray-500'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (<div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`}/>)}
                </div>))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
            {/* Step 1: Select Patient */}
            {step === 1 && (<div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar paciente
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input type="text" placeholder="Buscar por nombre..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredPatients.length === 0 ? (<div className="text-center py-8 text-gray-500">
                      No se encontraron pacientes
                    </div>) : (filteredPatients.map((patient) => (<button key={patient.id} onClick={() => setSelectedPatient(patient)} className={`w-full flex items-center justify-between p-4 border-2 rounded-lg transition-all ${selectedPatient?.id === patient.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {patient.firstName[0]}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{patient.email}</div>
                          </div>
                        </div>
                        {selectedPatient?.id === patient.id && (<svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>)}
                      </button>)))}
                </div>
              </div>)}

            {/* Step 2: Configuration */}
            {step === 2 && (<div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiración del formulario
                  </label>
                  <select value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value={1}>1 día</option>
                    <option value={3}>3 días</option>
                    <option value={7}>7 días (recomendado)</option>
                    <option value={14}>14 días</option>
                    <option value={30}>30 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje personalizado (opcional)
                  </label>
                  <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Ej: Hola María, por favor completa este formulario antes de tu próxima cita..." rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"/>
                </div>
              </div>)}

            {/* Step 3: Confirm */}
            {step === 3 && selectedPatient && template && (<div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Resumen</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paciente:</span>
                      <span className="font-medium text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Formulario:</span>
                      <span className="font-medium text-gray-900">{template.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiempo estimado:</span>
                      <span className="font-medium text-gray-900">~{template.estimatedMinutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expira en:</span>
                      <span className="font-medium text-gray-900">{expiresInDays} días</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-gray-900">{selectedPatient.email}</span>
                    </div>
                  </div>
                </div>

                {customMessage && (<div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensaje personalizado:
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                      {customMessage}
                    </div>
                  </div>)}

                {error && (<div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">
                      <span className="sr-only">Error: </span>
                      {error}
                    </p>
                  </div>)}
              </div>)}

            {/* Step 4: Success */}
            {step === 4 && (<div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">¡Formulario enviado!</h3>
                <p className="text-gray-600 mb-6">
                  Se ha enviado un correo electrónico a {selectedPatient?.email} con el enlace al formulario.
                </p>
                <button onClick={handleClose} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Cerrar
                </button>
              </div>)}
          </div>

          {/* Footer */}
          {step < 4 && (<div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={() => {
                if (step === 1) {
                    handleClose();
                }
                else {
                    setStep(step - 1);
                }
            }} className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium">
                {step === 1 ? 'Cancelar' : 'Atrás'}
              </button>

              <button onClick={() => {
                if (step === 3) {
                    handleSend();
                }
                else {
                    setStep(step + 1);
                }
            }} disabled={(step === 1 && !selectedPatient) || loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Enviando...' : step === 3 ? 'Enviar formulario' : 'Siguiente'}
              </button>
            </div>)}
        </framer_motion_1.motion.div>
      </div>
    </framer_motion_1.AnimatePresence>);
}
//# sourceMappingURL=SendFormModal.js.map