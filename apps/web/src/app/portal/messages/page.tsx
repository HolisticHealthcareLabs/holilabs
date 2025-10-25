/**
export const dynamic = 'force-dynamic';

 * Patient Messages Page
 *
 * Real-time chat interface for patients with their assigned clinician
 * Beautiful, mobile-optimized, WhatsApp-style design
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatThread from '@/components/chat/ChatThread';
import MessageInput from '@/components/chat/MessageInput';
import { initSocket, connectSocket, joinConversation, leaveConversation, emitTypingStart, emitTypingStop, getSocket } from '@/lib/chat/socket-client';

interface Message {
  id: string;
  fromUserId: string;
  fromUserType: 'CLINICIAN' | 'PATIENT';
  toUserId: string;
  toUserType: 'CLINICIAN' | 'PATIENT';
  body: string;
  attachments?: any;
  readAt: Date | null;
  createdAt: Date;
}

interface Conversation {
  id: string;
  clinicianId: string;
  clinicianName: string;
  clinicianAvatar: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  messages: Message[];
}

export default function PatientMessagesPage() {
  const router = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch patient session and conversation
  const fetchConversation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/messages');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al cargar mensajes');
      }

      const conversations = data.data.conversations;
      if (conversations.length > 0) {
        const conv = conversations[0];
        setConversation(conv);
        setMessages(conv.messages);

        // Get patient info from first message or session
        const firstMessage = conv.messages[0];
        if (firstMessage) {
          setPatientId(firstMessage.toUserType === 'PATIENT' ? firstMessage.toUserId : firstMessage.fromUserId);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize
  useEffect(() => {
    fetchConversation();
  }, []);

  // Initialize Socket.io
  useEffect(() => {
    if (!patientId || !conversation) return;

    // TODO: initSocket requires authToken parameter - using patientId as temporary token
    initSocket(patientId);
    connectSocket(patientId, 'PATIENT');

    const socket = getSocket();
    if (!socket) return;

    // Join conversation room
    joinConversation(conversation.clinicianId);

    // Listen for new messages
    socket.on('new_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);

      // Mark as read
      fetch(`/api/messages/${conversation.clinicianId}`, {
        method: 'PATCH',
      });
    });

    // Listen for typing indicators
    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId === conversation.clinicianId) {
        setIsTyping(true);
      }
    });

    socket.on('user_stopped_typing', ({ userId }: { userId: string }) => {
      if (userId === conversation.clinicianId) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      leaveConversation(conversation.clinicianId);
    };
  }, [patientId, conversation]);

  // Send message
  const handleSendMessage = async (messageBody: string, attachments?: any[]) => {
    if (!conversation || !patientId) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: conversation.clinicianId,
          toUserType: 'CLINICIAN',
          patientId,
          messageBody,
          attachments: attachments && attachments.length > 0 ? attachments : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add message to thread
        setMessages((prev) => [...prev, data.data.message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Typing indicators
  const handleTyping = () => {
    if (conversation && patientId) {
      emitTypingStart(conversation.clinicianId, patientId, patientName || 'Paciente');
    }
  };

  const handleStopTyping = () => {
    if (conversation && patientId) {
      emitTypingStop(conversation.clinicianId, patientId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No hay conversaciones
          </h2>
          <p className="text-gray-600 mb-6">
            Tu médico te enviará un mensaje cuando esté disponible
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Clinician Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {conversation.clinicianName
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">
                {conversation.clinicianName}
              </h2>
              <p className="text-sm text-gray-600">Tu médico</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">En línea</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden bg-white">
          <ChatThread
            messages={messages}
            currentUserId={patientId || ''}
            currentUserType="PATIENT"
            recipientName={conversation.clinicianName}
            isTyping={isTyping}
            isLoading={false}
          />
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          placeholder="Escribe un mensaje..."
        />
      </div>
    </div>
  );
}
