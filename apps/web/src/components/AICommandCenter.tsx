'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { X, Sparkles, MessageSquare, Target, Search, Clock, Mail } from 'lucide-react';
const Send = Mail;
const ZapIcon = Sparkles;

// Multi-language translations for AI Command Center
const translations: any = {
  en: {
    title: 'AI Command Center',
    subtitle: 'Your clinical assistant is ready',
    placeholder: 'Type a command or select an option...',
    thinking: 'Thinking...',
    suggestions: [
      'Show my CDSS alerts',
      'Start a new medical scribe session',
      'Check patient prevention rules',
      'What are our current pricing plans?',
      'How do I login to the portal?'
    ],
    navigation: {
      cdss: 'Navigating to CDSS dashboard...',
      scribe: 'Starting medical scribe...',
      prevention: 'Opening prevention rules...',
      patients: 'Opening patient list...',
      pricing: 'Viewing pricing plans...',
      login: 'Redirecting to login...',
      dashboard: 'Returning to dashboard...'
    },
    defaultResponse: 'I understand you want to know about "{query}". Let me help you with that.'
  },
  es: {
    title: 'Centro de Comando AI',
    subtitle: 'Tu asistente clínico está listo',
    placeholder: 'Escribe un comando o selecciona una opción...',
    thinking: 'Pensando...',
    suggestions: [
      'Mostrar mis alertas CDSS',
      'Iniciar nueva sesión de scribe médico',
      'Ver reglas de prevención de pacientes',
      '¿Cuáles son los planes de precios?',
      '¿Cómo inicio sesión en el portal?'
    ],
    navigation: {
      cdss: 'Navegando al panel CDSS...',
      scribe: 'Iniciando scribe médico...',
      prevention: 'Abriendo reglas de prevención...',
      patients: 'Abriendo lista de pacientes...',
      pricing: 'Viendo planes de precios...',
      login: 'Redirigiendo al inicio de sesión...',
      dashboard: 'Volviendo al panel principal...'
    },
    defaultResponse: 'Entiendo que quieres saber sobre "{query}". Permíteme ayudarte con eso.'
  },
  pt: {
    title: 'Centro de Comando IA',
    subtitle: 'Seu assistente clínico está pronto',
    placeholder: 'Digite um comando ou selecione uma opção...',
    thinking: 'Pensando...',
    suggestions: [
      'Mostrar meus alertas CDSS',
      'Iniciar nova sessão de scribe médico',
      'Ver regras de prevenção de pacientes',
      'Quais são os planos de assinatura?',
      'Como faço login no portal?'
    ],
    navigation: {
      cdss: 'Navegando para o painel CDSS...',
      scribe: 'Iniciando scribe médico...',
      prevention: 'Abrindo regras de prevenção...',
      patients: 'Abrindo lista de pacientes...',
      pricing: 'Visualizando planos de assinatura...',
      login: 'Redirecionando para o login...',
      dashboard: 'Voltando ao painel principal...'
    },
    defaultResponse: 'Entendo que você quer saber sobre "{query}". Deixe-me ajudar com isso.'
  }
};

export function AICommandCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isThinking, setIsThinking] = useState(false);
  const router = useRouter();
  const { language } = useLanguage();
  const t = (translations[language] || translations.en);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  if (!isOpen) return null;

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
    if (lowercaseMessage.includes('cdss') || lowercaseMessage.includes('clinical decision') || lowercaseMessage.includes('decisiones clínicas') || lowercaseMessage.includes('decisão clínica')) {
      response = t.navigation.cdss;
      shouldNavigate = true;
      navigationPath = '/dashboard/cdss';
    } else if (lowercaseMessage.includes('scribe') || lowercaseMessage.includes('ai médica') || lowercaseMessage.includes('transcripción') || lowercaseMessage.includes('transcrição')) {
      response = t.navigation.scribe;
      shouldNavigate = true;
      navigationPath = '/dashboard/scribe';
    } else if (lowercaseMessage.includes('prevención') || lowercaseMessage.includes('prevention') || lowercaseMessage.includes('prevenção') || lowercaseMessage.includes('screening')) {
      response = t.navigation.prevention;
      shouldNavigate = true;
      navigationPath = '/dashboard/prevention';
    } else if (lowercaseMessage.includes('pacientes') || lowercaseMessage.includes('patient') || lowercaseMessage.includes('portal')) {
      response = t.navigation.patients;
      shouldNavigate = true;
      navigationPath = '/dashboard/patients';
    } else if (lowercaseMessage.includes('precio') || lowercaseMessage.includes('plan') || lowercaseMessage.includes('preço') || lowercaseMessage.includes('suscripción') || lowercaseMessage.includes('assinatura')) {
      response = t.navigation.pricing;
      shouldNavigate = true;
      navigationPath = '/#precios';
    } else if (lowercaseMessage.includes('login') || lowercaseMessage.includes('entrar') || lowercaseMessage.includes('iniciar sesión')) {
      response = t.navigation.login;
      shouldNavigate = true;
      navigationPath = '/auth/login';
    } else if (lowercaseMessage.includes('dashboard') || lowercaseMessage.includes('panel') || lowercaseMessage.includes('painel')) {
      response = t.navigation.dashboard;
      shouldNavigate = true;
      navigationPath = '/dashboard';
    } else {
      // Default helpful response
      response = t.defaultResponse.replace('{query}', message);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, rgba(1, 71, 81, 0.05), rgba(16, 185, 129, 0.05))' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: 'rgba(1, 71, 81, 0.1)' }}>
              <Sparkles className="w-6 h-6 text-teal-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{t.title}</h2>
              <p className="text-sm text-gray-500 font-medium">{t.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[400px]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !isThinking ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {t.suggestions.map((suggestion: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleUserMessage(suggestion)}
                      className="flex items-center gap-3 p-4 text-left rounded-2xl border border-gray-100 hover:border-teal-500/30 hover:bg-teal-50/30 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                        {idx === 0 ? <Target className="w-4 h-4 text-gray-400 group-hover:text-teal-600" /> :
                         idx === 1 ? <ZapIcon className="w-4 h-4 text-gray-400 group-hover:text-teal-600" /> :
                         idx === 2 ? <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-teal-600" /> :
                         idx === 3 ? <Search className="w-4 h-4 text-gray-400 group-hover:text-teal-600" /> :
                         <Clock className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-teal-700 text-white rounded-tr-none' 
                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-gray-100 text-gray-500 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs font-semibold ml-1">{t.thinking}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200 bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.placeholder}
                className="flex-1 px-5 py-3 rounded-2xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="w-12 h-12 rounded-xl bg-teal-700 flex items-center justify-center text-white hover:bg-teal-800 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-lg shadow-teal-700/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Floating AI Button - Bottom Right Corner
export function AICommandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group bg-teal-700 overflow-hidden"
      aria-label="Open AI Command Center"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-teal-800 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <Sparkles className="w-7 h-7 text-white relative z-10" />
    </button>
  );
}
