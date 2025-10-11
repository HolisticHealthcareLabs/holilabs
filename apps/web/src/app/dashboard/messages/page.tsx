/**
 * Clinician Messages Page
 *
 * Real-time chat interface for clinicians
 * Beautiful, mobile-optimized, industry-grade design
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatList from '@/components/chat/ChatList';
import ChatThread from '@/components/chat/ChatThread';
import MessageInput from '@/components/chat/MessageInput';
import { initSocket, connectSocket, joinConversation, leaveConversation, emitTypingStart, emitTypingStop, getSocket } from '@/lib/chat/socket-client';

interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  messages: any[];
}

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

export default function ClinicianMessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Check auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Initialize Socket.io
  useEffect(() => {
    if (!session?.user?.id) return;

    initSocket();
    connectSocket(session.user.id, 'CLINICIAN');

    const socket = getSocket();
    if (!socket) return;

    // Listen for new messages
    socket.on('new_message', (message: Message) => {
      // Add to messages if conversation is open
      if (message.patientId === selectedConversationId) {
        setMessages((prev) => [...prev, message]);
      }

      // Update conversation list
      fetchConversations();
    });

    // Listen for typing indicators
    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId === selectedConversationId) {
        setIsTyping(true);
      }
    });

    socket.on('user_stopped_typing', ({ userId }: { userId: string }) => {
      if (userId === selectedConversationId) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [session, selectedConversationId]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await fetch('/api/messages');
      const data = await response.json();

      if (data.success) {
        setConversations(data.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
    }
  }, [session]);

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages);

        // Mark as read
        await fetch(`/api/messages/${conversationId}`, {
          method: 'PATCH',
        });

        // Update conversation unread count
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Select conversation
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    joinConversation(conversationId);
    fetchMessages(conversationId);
  };

  // Send message
  const handleSendMessage = async (messageBody: string, attachments?: any[]) => {
    if (!selectedConversation || !session?.user?.id) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: selectedConversation.patientId,
          toUserType: 'PATIENT',
          patientId: selectedConversation.patientId,
          messageBody,
          attachments: attachments && attachments.length > 0 ? attachments : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add message to thread
        setMessages((prev) => [...prev, data.data.message]);

        // Update conversation
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Typing indicators
  const handleTyping = () => {
    if (selectedConversationId && session?.user?.id) {
      emitTypingStart(selectedConversationId, session.user.id, `Dr. ${session.user.firstName || 'Doctor'}`);
    }
  };

  const handleStopTyping = () => {
    if (selectedConversationId && session?.user?.id) {
      emitTypingStop(selectedConversationId, session.user.id);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile: Show conversation list or thread
  if (isMobileView) {
    if (selectedConversationId && selectedConversation) {
      return (
        <div className="flex flex-col h-screen bg-white">
          {/* Mobile header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <button
              onClick={() => setSelectedConversationId(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">{selectedConversation.patientName}</h2>
              <p className="text-xs text-gray-500">Paciente</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ChatThread
              messages={messages}
              currentUserId={session.user.id}
              currentUserType="CLINICIAN"
              recipientName={selectedConversation.patientName}
              isTyping={isTyping}
              isLoading={isLoadingMessages}
            />
          </div>

          {/* Input */}
          <MessageInput
            onSend={handleSendMessage}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="px-4 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mensajes
          </h1>
        </div>
        <ChatList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          isLoading={isLoadingConversations}
        />
      </div>
    );
  }

  // Desktop: Split view
  return (
    <div className="flex h-screen bg-white">
      {/* Conversations sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mensajes
          </h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            isLoading={isLoadingConversations}
          />
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Thread header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedConversation.patientName}
              </h2>
              <p className="text-sm text-gray-500">Paciente</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ChatThread
                messages={messages}
                currentUserId={session.user.id}
                currentUserType="CLINICIAN"
                recipientName={selectedConversation.patientName}
                isTyping={isTyping}
                isLoading={isLoadingMessages}
              />
            </div>

            {/* Input */}
            <MessageInput
              onSend={handleSendMessage}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-sm text-gray-500">
                Elige un paciente para comenzar a chatear
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
