'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { translations } from '@/lib/translations';

interface AICommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AICommandCenter({ isOpen, onClose }: AICommandCenterProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isThinking, setIsThinking] = useState(false);
  const router = useRouter();

  // Simple routing logic based on user intent
  const handleUserMessage = async (message: string) => {
    const lowercaseMessage = message.toLowerCase();

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');
    setIsThinking(true);

    // Wait a moment to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 800));

    let response = '';
    let shouldNavigate = false;
    let navigationPath = '';

    // Navigation logic
    if (lowercaseMessage.includes('cdss') || lowercaseMessage.includes('clinical decision') || lowercaseMessage.includes('decisiones clínicas')) {
      response = 'Te llevo al Sistema de Soporte a Decisiones Clínicas (CDSS). Aquí encontrarás 12+ reglas activas que detectan problemas antes que ocurran, interacciones medicamentosas, y protocolos WHO/PAHO.';
      shouldNavigate = true;
      navigationPath = '/dashboard/cdss';
    } else if (lowercaseMessage.includes('scribe') || lowercaseMessage.includes('ai médica') || lowercaseMessage.includes('transcripción')) {
      response = 'Perfecto! Te llevo al AI Medical Scribe. Esta herramienta transcribe tus consultas en tiempo real y genera notas SOAP automáticamente, ahorrándote 3-4 horas diarias.';
      shouldNavigate = true;
      navigationPath = '/dashboard/scribe';
    } else if (lowercaseMessage.includes('prevención') || lowercaseMessage.includes('prevention') || lowercaseMessage.includes('screening')) {
      response = 'Te dirijo al Hub de Prevención Longitudinal. Aquí puedes ver timelines de 30 años, 7 dominios de salud, y más de 100 intervenciones preventivas basadas en protocolos WHO/PAHO/USPSTF.';
      shouldNavigate = true;
      navigationPath = '/dashboard/prevention';
    } else if (lowercaseMessage.includes('pacientes') || lowercaseMessage.includes('patient') || lowercaseMessage.includes('portal')) {
      response = 'Te llevo al Portal de Gestión de Pacientes. Desde aquí puedes ver todos tus pacientes, su historial completo, y acceder al portal de pacientes que reduce tus llamadas en 40%.';
      shouldNavigate = true;
      navigationPath = '/dashboard/patients';
    } else if (lowercaseMessage.includes('precio') || lowercaseMessage.includes('plan') || lowercaseMessage.includes('suscripción')) {
      response = 'Claro! Te muestro nuestros planes de precios. Ofrecemos desde el plan Starter gratuito hasta Enterprise personalizado. Todos incluyen IA médica, prevención automatizada, y soporte en español.';
      shouldNavigate = true;
      navigationPath = '/#precios';
    } else if (lowercaseMessage.includes('login') || lowercaseMessage.includes('entrar') || lowercaseMessage.includes('iniciar sesión')) {
      response = 'Te llevo a la página de inicio de sesión. Puedes entrar con Google o con tu cuenta de Holi Labs.';
      shouldNavigate = true;
      navigationPath = '/auth/login';
    } else if (lowercaseMessage.includes('dashboard') || lowercaseMessage.includes('panel')) {
      response = 'Te llevo al Dashboard principal donde puedes ver un resumen de tus pacientes activos, citas programadas, prescripciones pendientes, y más.';
      shouldNavigate = true;
      navigationPath = '/dashboard';
    } else {
      // Default helpful response
      response = `Entiendo que buscas "${message}". 

Puedo ayudarte con:
• **Prevención**: Sistema longitudinal de 30 años con alertas automáticas
• **AI Scribe**: Transcripción y notas SOAP en tiempo real (ahorra 3-4h/día)
• **CDSS**: 12+ reglas de soporte clínico con protocolos WHO/PAHO
• **Pacientes**: Portal completo que reduce llamadas en 40%
• **E-Prescribing**: Firma digital a 8+ farmacias integradas

¿Sobre cuál te gustaría saber más?`;
    }

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsThinking(false);

    // Navigate after showing response
    if (shouldNavigate) {
      setTimeout(() => {
        router.push(navigationPath);
        onClose();
      }, 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleUserMessage(input.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, rgba(1, 71, 81, 0.05), rgba(16, 185, 129, 0.05))' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: 'rgba(1, 71, 81, 0.1)' }}>
                <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-teal-700">
                  <path fillRule="evenodd" clipRule="evenodd" d="M29.0324 15.0927C28.1785 14.6817 27.1806 14.3314 26 14C27.1806 13.6686 28.1785 13.3183 29.0324 12.9073C30.8541 12.0305 32.0204 10.8775 32.9069 9.0427C33.3192 8.18948 33.6709 7.18884 34 6C34.3291 7.18884 34.6808 8.18948 35.0931 9.0427C35.9796 10.8775 37.1459 12.0305 38.9676 12.9073C39.8215 13.3183 40.8194 13.6686 42 14C40.8194 14.3314 39.8215 14.6817 38.9676 15.0927C37.1459 15.9695 35.9796 17.1225 35.0931 18.9573C34.6808 19.8105 34.3291 20.8112 34 22C33.6709 20.8112 33.3192 19.8105 32.9069 18.9573C32.0204 17.1225 30.8541 15.9695 29.0324 15.0927ZM32.7224 15.2394C32.2485 14.769 31.7324 14.3606 31.1735 14C31.7324 13.6394 32.2485 13.231 32.7224 12.7606C33.2076 12.279 33.6286 11.7522 34 11.1786C34.3714 11.7522 34.7924 12.279 35.2776 12.7606C35.7515 13.231 36.2676 13.6394 36.8265 14C36.2676 14.3606 35.7515 14.769 35.2776 15.2394C34.7924 15.721 34.3714 16.2478 34 16.8214C33.6286 16.2478 33.2076 15.721 32.7224 15.2394Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M9.30387 29.0636C8.30249 28.6881 7.20569 28.3384 6 28C7.20569 27.6616 8.30249 27.3119 9.30387 26.9364C14.3869 25.0303 17.0111 22.4594 18.9365 17.3242C19.3134 16.3191 19.6635 15.2158 20 14C20.3365 15.2158 20.6866 16.3191 21.0635 17.3242C22.9889 22.4594 25.6131 25.0303 30.6961 26.9364C31.6975 27.3119 32.7943 27.6616 34 28C32.7943 28.3384 31.6975 28.6881 30.6961 29.0636C25.6131 30.9697 22.9889 33.5406 21.0635 38.6758C20.6866 39.6809 20.3365 40.7842 20 42C19.6635 40.7842 19.3134 39.6809 18.9365 38.6758C17.0111 33.5406 14.3869 30.9697 9.30387 29.0636ZM16.7074 31.2335C15.3644 29.9004 13.7907 28.8642 11.9422 28C13.7907 27.1358 15.3644 26.0996 16.7074 24.7665C18.0621 23.4217 19.1194 21.8372 20 19.9594C20.8806 21.8372 21.9379 23.4217 23.2926 24.7665C24.6356 26.0996 26.2093 27.1358 28.0578 28C26.2093 28.8642 24.6356 29.9004 23.2926 31.2335C21.9379 32.5783 20.8806 34.1628 20 36.0406C19.1194 34.1628 18.0621 32.5783 16.7074 31.2335Z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Command Center</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tu asistente inteligente de navegación</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 bg-gradient-to-b from-gray-50/50 to-white">
            {messages.length === 0 && !isThinking ? (
              /* Welcome Screen */
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                {/* Sparkle Icon */}
                <div className="mb-8 animate-pulse">
                  <svg width="64" height="64" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M29.0324 15.0927C28.1785 14.6817 27.1806 14.3314 26 14C27.1806 13.6686 28.1785 13.3183 29.0324 12.9073C30.8541 12.0305 32.0204 10.8775 32.9069 9.0427C33.3192 8.18948 33.6709 7.18884 34 6C34.3291 7.18884 34.6808 8.18948 35.0931 9.0427C35.9796 10.8775 37.1459 12.0305 38.9676 12.9073C39.8215 13.3183 40.8194 13.6686 42 14C40.8194 14.3314 39.8215 14.6817 38.9676 15.0927C37.1459 15.9695 35.9796 17.1225 35.0931 18.9573C34.6808 19.8105 34.3291 20.8112 34 22C33.6709 20.8112 33.3192 19.8105 32.9069 18.9573C32.0204 17.1225 30.8541 15.9695 29.0324 15.0927ZM32.7224 15.2394C32.2485 14.769 31.7324 14.3606 31.1735 14C31.7324 13.6394 32.2485 13.231 32.7224 12.7606C33.2076 12.279 33.6286 11.7522 34 11.1786C34.3714 11.7522 34.7924 12.279 35.2776 12.7606C35.7515 13.231 36.2676 13.6394 36.8265 14C36.2676 14.3606 35.7515 14.769 35.2776 15.2394C34.7924 15.721 34.3714 16.2478 34 16.8214C33.6286 16.2478 33.2076 15.721 32.7224 15.2394Z" fill="url(#gradient1)"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M9.30387 29.0636C8.30249 28.6881 7.20569 28.3384 6 28C7.20569 27.6616 8.30249 27.3119 9.30387 26.9364C14.3869 25.0303 17.0111 22.4594 18.9365 17.3242C19.3134 16.3191 19.6635 15.2158 20 14C20.3365 15.2158 20.6866 16.3191 21.0635 17.3242C22.9889 22.4594 25.6131 25.0303 30.6961 26.9364C31.6975 27.3119 32.7943 27.6616 34 28C32.7943 28.3384 31.6975 28.6881 30.6961 29.0636C25.6131 30.9697 22.9889 33.5406 21.0635 38.6758C20.6866 39.6809 20.3365 40.7842 20 42C19.6635 40.7842 19.3134 39.6809 18.9365 38.6758C17.0111 33.5406 14.3869 30.9697 9.30387 29.0636ZM16.7074 31.2335C15.3644 29.9004 13.7907 28.8642 11.9422 28C13.7907 27.1358 15.3644 26.0996 16.7074 24.7665C18.0621 23.4217 19.1194 21.8372 20 19.9594C20.8806 21.8372 21.9379 23.4217 23.2926 24.7665C24.6356 26.0996 26.2093 27.1358 28.0578 28C26.2093 28.8642 24.6356 29.9004 23.2926 31.2335C21.9379 32.5783 20.8806 34.1628 20 36.0406C19.1194 34.1628 18.0621 32.5783 16.7074 31.2335Z" fill="url(#gradient2)"/>
                    <defs>
                      <linearGradient id="gradient1" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8B5CF6"/>
                        <stop offset="1" stopColor="#D946EF"/>
                      </linearGradient>
                      <linearGradient id="gradient2" x1="6" y1="14" x2="34" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8B5CF6"/>
                        <stop offset="1" stopColor="#D946EF"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                {/* Greeting */}
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                  Hola,
                </h2>
                <p className="text-xl md:text-2xl text-gray-700 mb-8">
                  ¿cómo puedo ayudarte hoy?
                </p>
                
                {/* Suggestions */}
                <div className="grid grid-cols-1 gap-3 w-full max-w-md mt-4">
                  <button
                    onClick={() => handleUserMessage('Llévame al CDSS')}
                    className="px-4 py-3 rounded-xl text-left text-sm text-gray-700 bg-white border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all"
                  >
                    💊 Ir al Sistema de Decisiones Clínicas
                  </button>
                  <button
                    onClick={() => handleUserMessage('Muéstrame el AI Scribe')}
                    className="px-4 py-3 rounded-xl text-left text-sm text-gray-700 bg-white border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all"
                  >
                    🎙️ Ver AI Medical Scribe
                  </button>
                  <button
                    onClick={() => handleUserMessage('Prevención longitudinal')}
                    className="px-4 py-3 rounded-xl text-left text-sm text-gray-700 bg-white border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all"
                  >
                    🛡️ Hub de Prevención
                  </button>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-800 border border-gray-200'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl px-5 py-3 border border-gray-200">
                      <div className="flex gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200 bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe aquí o selecciona una opción..."
                className="flex-1 px-5 py-3 rounded-2xl border-2 border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="px-6 py-3 rounded-2xl font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#014751' }}
                onMouseEnter={(e) => !isThinking && input.trim() && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            {/* Decorative - low contrast intentional for helper text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Puedo llevarte a cualquier sección o explicarte nuestras soluciones
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Floating AI Button - Bottom Right Corner (Green Background)
export function AICommandButton({ onClick }: { onClick: () => void }) {
  const [hasCookieConsent, setHasCookieConsent] = useState(false);

  useEffect(() => {
    // Check if cookie consent has been given
    const consent = localStorage.getItem('cookieConsent');
    setHasCookieConsent(!!consent);

    // Listen for consent changes
    const handleConsentUpdate = () => {
      const consent = localStorage.getItem('cookieConsent');
      setHasCookieConsent(!!consent);
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate);
    return () => window.removeEventListener('cookieConsentUpdated', handleConsentUpdate);
  }, []);

  return (
    <button
      onClick={onClick}
      className={`fixed ${hasCookieConsent ? 'bottom-4' : 'bottom-28'} right-4 z-50 w-16 h-16 rounded-2xl shadow-2xl hover:scale-110 transition-all flex items-center justify-center group`}
      style={{
        background: 'linear-gradient(135deg, #014751, #10b981)',
      }}
      aria-label="Open AI Command Center"
    >
      {/* AI Icon from SVG */}
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
        <path fillRule="evenodd" clipRule="evenodd" d="M29.0324 15.0927C28.1785 14.6817 27.1806 14.3314 26 14C27.1806 13.6686 28.1785 13.3183 29.0324 12.9073C30.8541 12.0305 32.0204 10.8775 32.9069 9.0427C33.3192 8.18948 33.6709 7.18884 34 6C34.3291 7.18884 34.6808 8.18948 35.0931 9.0427C35.9796 10.8775 37.1459 12.0305 38.9676 12.9073C39.8215 13.3183 40.8194 13.6686 42 14C40.8194 14.3314 39.8215 14.6817 38.9676 15.0927C37.1459 15.9695 35.9796 17.1225 35.0931 18.9573C34.6808 19.8105 34.3291 20.8112 34 22C33.6709 20.8112 33.3192 19.8105 32.9069 18.9573C32.0204 17.1225 30.8541 15.9695 29.0324 15.0927ZM32.7224 15.2394C32.2485 14.769 31.7324 14.3606 31.1735 14C31.7324 13.6394 32.2485 13.231 32.7224 12.7606C33.2076 12.279 33.6286 11.7522 34 11.1786C34.3714 11.7522 34.7924 12.279 35.2776 12.7606C35.7515 13.231 36.2676 13.6394 36.8265 14C36.2676 14.3606 35.7515 14.769 35.2776 15.2394C34.7924 15.721 34.3714 16.2478 34 16.8214C33.6286 16.2478 33.2076 15.721 32.7224 15.2394Z" fill="currentColor"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M9.30387 29.0636C8.30249 28.6881 7.20569 28.3384 6 28C7.20569 27.6616 8.30249 27.3119 9.30387 26.9364C14.3869 25.0303 17.0111 22.4594 18.9365 17.3242C19.3134 16.3191 19.6635 15.2158 20 14C20.3365 15.2158 20.6866 16.3191 21.0635 17.3242C22.9889 22.4594 25.6131 25.0303 30.6961 26.9364C31.6975 27.3119 32.7943 27.6616 34 28C32.7943 28.3384 31.6975 28.6881 30.6961 29.0636C25.6131 30.9697 22.9889 33.5406 21.0635 38.6758C20.6866 39.6809 20.3365 40.7842 20 42C19.6635 40.7842 19.3134 39.6809 18.9365 38.6758C17.0111 33.5406 14.3869 30.9697 9.30387 29.0636ZM16.7074 31.2335C15.3644 29.9004 13.7907 28.8642 11.9422 28C13.7907 27.1358 15.3644 26.0996 16.7074 24.7665C18.0621 23.4217 19.1194 21.8372 20 19.9594C20.8806 21.8372 21.9379 23.4217 23.2926 24.7665C24.6356 26.0996 26.2093 27.1358 28.0578 28C26.2093 28.8642 24.6356 29.9004 23.2926 31.2335C21.9379 32.5783 20.8806 34.1628 20 36.0406C19.1194 34.1628 18.0621 32.5783 16.7074 31.2335Z" fill="currentColor"/>
      </svg>
      <div className="absolute -top-12 right-0 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        AI Command Center
      </div>
    </button>
  );
}

// Feedback Button - Bottom Left Corner
export function FeedbackButton() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasCookieConsent, setHasCookieConsent] = useState(false);
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    // Check if cookie consent has been given
    const consent = localStorage.getItem('cookieConsent');
    setHasCookieConsent(!!consent);

    // Listen for consent changes
    const handleConsentUpdate = () => {
      const consent = localStorage.getItem('cookieConsent');
      setHasCookieConsent(!!consent);
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate);
    return () => window.removeEventListener('cookieConsentUpdated', handleConsentUpdate);
  }, []);

  return (
    <>
      <div className={`fixed ${hasCookieConsent ? 'bottom-4' : 'bottom-28'} left-4 z-50 group transition-all`}>
        <div className="flex items-center gap-3">
          {/* Blue Circle Button with Message Icon */}
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="w-14 h-14 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center relative"
            style={{ 
              backgroundColor: '#3b82f6',
            }}
            aria-label="Send Feedback"
          >
            {/* Message/Chat Icon */}
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="absolute w-3 h-3 bg-red-500 rounded-full -top-0.5 -right-0.5 border-2 border-white"></div>
          </button>
          
          {/* Speech Bubble - appears to the right */}
          <div className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-sm whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {t.sendFeedback}
          </div>
        </div>
      </div>

      {/* Simple Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t.sendFeedback}</h3>
            <textarea
              className="w-full border-2 border-gray-300 rounded-xl p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              rows={4}
              placeholder={t.tellUsWhatYouThink}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowFeedback(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
              >
                {t.cancel}
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#3b82f6' }}
              >
                {t.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

