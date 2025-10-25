"use strict";
/**
 * Share Medical Record Modal
 *
 * Modal for sharing medical records with secure, time-limited links
 */
'use client';
/**
 * Share Medical Record Modal
 *
 * Modal for sharing medical records with secure, time-limited links
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ShareRecordModal;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function ShareRecordModal({ isOpen, onClose, recordId, recordTitle, }) {
    const [step, setStep] = (0, react_1.useState)('config');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [shareResult, setShareResult] = (0, react_1.useState)(null);
    const [copied, setCopied] = (0, react_1.useState)(false);
    const [config, setConfig] = (0, react_1.useState)({
        expiresInHours: 72,
        allowDownload: true,
        requirePassword: false,
    });
    // Accessibility: Focus management
    const closeButtonRef = (0, react_1.useRef)(null);
    const previousActiveElementRef = (0, react_1.useRef)(null);
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
    const handleShare = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/portal/records/${recordId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error al crear enlace');
            }
            setShareResult({
                shareUrl: data.data.shareUrl,
                expiresAt: data.data.expiresAt,
            });
            setStep('success');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleCopyLink = async () => {
        if (shareResult) {
            await navigator.clipboard.writeText(shareResult.shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    const handleClose = () => {
        setStep('config');
        setShareResult(null);
        setError(null);
        setConfig({
            expiresInHours: 72,
            allowDownload: true,
            requirePassword: false,
        });
        onClose();
    };
    if (!isOpen)
        return null;
    return (<framer_motion_1.AnimatePresence>
      {isOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="share-modal-title" className="text-2xl font-bold text-gray-900">
                    Compartir Registro Médico
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{recordTitle}</p>
                </div>
                <button ref={closeButtonRef} onClick={handleClose} aria-label="Cerrar diálogo" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 'config' && (<div className="space-y-6">
                  {/* Recipient Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Información del Destinatario (Opcional)
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre
                        </label>
                        <input type="text" value={config.recipientName || ''} onChange={(e) => setConfig({ ...config, recipientName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Dr. Juan Pérez"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input type="email" value={config.recipientEmail || ''} onChange={(e) => setConfig({ ...config, recipientEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="doctor@ejemplo.com"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Propósito
                        </label>
                        <textarea value={config.purpose || ''} onChange={(e) => setConfig({ ...config, purpose: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Segunda opinión médica"/>
                      </div>
                    </div>
                  </div>

                  {/* Access Settings */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Configuración de Acceso
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tiempo de Expiración
                        </label>
                        <select value={config.expiresInHours} onChange={(e) => setConfig({ ...config, expiresInHours: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                          <option value={24}>24 horas</option>
                          <option value={72}>3 días</option>
                          <option value={168}>1 semana</option>
                          <option value={336}>2 semanas</option>
                          <option value={720}>30 días</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Límite de Accesos (Opcional)
                        </label>
                        <input type="number" min="1" max="100" value={config.maxAccesses || ''} onChange={(e) => setConfig({
                    ...config,
                    maxAccesses: e.target.value ? parseInt(e.target.value) : undefined,
                })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Ilimitado"/>
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" checked={config.allowDownload} onChange={(e) => setConfig({ ...config, allowDownload: e.target.checked })} className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"/>
                          <span className="text-sm text-gray-700">
                            Permitir descarga de PDF
                          </span>
                        </label>

                        <label className="flex items-center gap-3">
                          <input type="checkbox" checked={config.requirePassword} onChange={(e) => setConfig({ ...config, requirePassword: e.target.checked })} className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"/>
                          <span className="text-sm text-gray-700">
                            Requerir contraseña
                          </span>
                        </label>
                      </div>

                      {config.requirePassword && (<div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contraseña
                          </label>
                          <input type="password" value={config.password || ''} onChange={(e) => setConfig({ ...config, password: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Mínimo 6 caracteres" minLength={6}/>
                        </div>)}
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (<div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600">
                        <span className="sr-only">Error: </span>
                        {error}
                      </p>
                    </div>)}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button onClick={handleClose} disabled={isLoading} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                      Cancelar
                    </button>
                    <button onClick={handleShare} disabled={isLoading} className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {isLoading ? (<>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Generando...
                        </>) : ('Generar Enlace')}
                    </button>
                  </div>
                </div>)}

              {step === 'success' && shareResult && (<div className="space-y-6">
                  {/* Success Icon */}
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      ¡Enlace Generado Exitosamente!
                    </h3>
                    <p className="text-gray-600">
                      Comparte este enlace seguro con el destinatario
                    </p>
                  </div>

                  {/* Share Link */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enlace de Compartir
                    </label>
                    <div className="flex gap-2">
                      <input type="text" value={shareResult.shareUrl} readOnly className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"/>
                      <button onClick={handleCopyLink} aria-label={copied ? "Enlace copiado al portapapeles" : "Copiar enlace al portapapeles"} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2">
                        {copied ? (<>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                            </svg>
                            Copiado
                          </>) : (<>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                            Copiar
                          </>)}
                      </button>
                    </div>
                  </div>

                  {/* Expiration Info */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-yellow-900">
                          Este enlace expira el:
                        </p>
                        <p className="text-sm text-yellow-800">
                          {new Date(shareResult.expiresAt).toLocaleString('es-MX', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button onClick={handleClose} className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition-colors">
                    Cerrar
                  </button>
                </div>)}
            </div>
          </framer_motion_1.motion.div>
        </div>)}
    </framer_motion_1.AnimatePresence>);
}
//# sourceMappingURL=ShareRecordModal.js.map