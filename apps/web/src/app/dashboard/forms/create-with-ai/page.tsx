'use client';

/**
 * AI-Assisted Document Creation
 *
 * Conversational AI assistant that guides doctors through creating
 * custom medical forms and templates via natural language.
 *
 * Features:
 * - Interactive chat interface with Claude AI
 * - Automatic field extraction from conversation
 * - Real-time form preview
 * - Template generation and saving
 * - Distribution to patients
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface GeneratedForm {
  title: string;
  description: string;
  category: string;
  fields: FormField[];
}

export default function AIFormCreatorPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de creación de formularios médicos. 🤖\n\nEstoy aquí para ayudarte a crear un formulario personalizado de manera conversacional. Solo cuéntame qué tipo de documento necesitas y te guiaré paso a paso.\n\n**¿Qué tipo de formulario deseas crear hoy?**\n\nPor ejemplo:\n- Consentimiento informado para procedimientos\n- Historial médico específico (cardíaco, oncológico, etc.)\n- Cuestionario pre-consulta\n- Formulario de seguimiento post-operatorio\n- Evaluación de síntomas\n- O cualquier otro documento personalizado',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<GeneratedForm | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call AI endpoint to get response and form generation
      const response = await fetch('/api/ai/forms/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If AI generated a complete form, show it
      if (data.generatedForm) {
        setGeneratedForm(data.generatedForm);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: '❌ Error al comunicarse con el asistente. Por favor, intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveTemplate = async () => {
    if (!generatedForm) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/forms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedForm.title,
          description: generatedForm.description,
          category: generatedForm.category,
          fields: generatedForm.fields,
          isBuiltIn: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to save template');

      const data = await response.json();

      // Show success message
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `✅ ¡Formulario "${generatedForm.title}" guardado exitosamente!\n\nAhora puedes enviarlo a tus pacientes desde la página de formularios.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
      setShowPreview(false);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/forms');
      }, 2000);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar el formulario. Por favor, intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>🤖</span>
                <span>Asistente AI de Formularios</span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Crea formularios personalizados de manera conversacional
              </p>
            </div>
          </div>
          {generatedForm && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              {showPreview ? '💬 Ver Chat' : '👁️ Ver Formulario'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${showPreview ? 'lg:w-1/2' : 'w-full'} transition-all duration-300`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-2xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : message.role === 'system'
                        ? 'bg-yellow-50 border border-yellow-200 text-yellow-900'
                        : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          AI
                        </div>
                        <span className="text-xs text-gray-500 font-medium">Asistente</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe el formulario que necesitas..."
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/30 font-medium"
              >
                {isLoading ? '...' : 'Enviar'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Sé específico sobre el tipo de información que necesitas recopilar
            </p>
          </div>
        </div>

        {/* Form Preview */}
        {showPreview && generatedForm && (
          <div className="w-full lg:w-1/2 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Vista Previa del Formulario</h2>
                <button
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-green-600/30 font-medium"
                >
                  {isSaving ? '💾 Guardando...' : '💾 Guardar Template'}
                </button>
              </div>

              {/* Form Preview Card */}
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{generatedForm.title}</h3>
                  <p className="text-gray-600">{generatedForm.description}</p>
                  <div className="mt-3">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {generatedForm.category}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {generatedForm.fields.map((field) => (
                    <div key={field.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          placeholder={field.placeholder || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          rows={3}
                          disabled
                        />
                      ) : field.type === 'select' ? (
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" disabled>
                          <option>Seleccionar...</option>
                          {field.options?.map((opt, idx) => (
                            <option key={idx}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' || field.type === 'radio' ? (
                        <div className="space-y-2">
                          {field.options?.map((opt, idx) => (
                            <label key={idx} className="flex items-center gap-2">
                              <input
                                type={field.type}
                                name={field.id}
                                className="w-4 h-4 text-blue-600"
                                disabled
                              />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={field.placeholder || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          disabled
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
