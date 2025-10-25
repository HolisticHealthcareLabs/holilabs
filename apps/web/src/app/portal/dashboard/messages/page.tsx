'use client';
export const dynamic = 'force-dynamic';


/**
 * Messages Page - Secure Patient-Clinician Communication
 * Beautiful chat interface for HIPAA-compliant messaging
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  PaperAirplaneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'QUESTION' | 'URGENT';
  sentAt: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
}

interface MessagesResponse {
  success: boolean;
  data?: {
    messages: Message[];
    clinician: {
      id: string;
      firstName: string;
      lastName: string;
      specialty: string | null;
    };
    hasMore: boolean;
  };
  error?: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clinician, setClinician] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageType, setMessageType] = useState<'TEXT' | 'QUESTION' | 'URGENT'>('TEXT');

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/portal/messages');
      const data: MessagesResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar mensajes');
      }

      if (data.success && data.data) {
        setMessages(data.data.messages);
        setClinician(data.data.clinician);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      setSending(true);

      const response = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          type: messageType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar mensaje');
      }

      // Add new message to the list
      if (data.success && data.data) {
        setMessages([...messages, data.data]);
        setNewMessage('');
        setMessageType('TEXT');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchMessages}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-3 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <UserIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {clinician
                  ? `Dr. ${clinician.firstName} ${clinician.lastName}`
                  : 'Mensajes'}
              </h1>
              {clinician?.specialty && (
                <p className="text-gray-600">{clinician.specialty}</p>
              )}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay mensajes todavía
                </h3>
                <p className="text-gray-600">
                  Envía tu primer mensaje a tu médico
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isFromMe = message.senderId !== clinician?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl ${
                        isFromMe
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {message.type === 'URGENT' && (
                        <div className="mb-2">
                          <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                            =¨ Urgente
                          </span>
                        </div>
                      )}
                      {message.type === 'QUESTION' && (
                        <div className="mb-2">
                          <span className="inline-block px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                            S Pregunta
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          isFromMe ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {format(new Date(message.sentAt), "HH:mm · d 'de' MMM", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="space-y-3">
            {/* Message Type Selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMessageType('TEXT')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  messageType === 'TEXT'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                =¬ Normal
              </button>
              <button
                type="button"
                onClick={() => setMessageType('QUESTION')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  messageType === 'QUESTION'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                S Pregunta
              </button>
              <button
                type="button"
                onClick={() => setMessageType('URGENT')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  messageType === 'URGENT'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                =¨ Urgente
              </button>
            </div>

            {/* Input and Send Button */}
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                rows={3}
                maxLength={2000}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              {newMessage.length}/2000 caracteres · Comunicación segura y encriptada =
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
