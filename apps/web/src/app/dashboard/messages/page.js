"use strict";
/**
 * Clinician Messages Page
 *
 * Real-time chat interface for clinicians
 * Beautiful, mobile-optimized, industry-grade design
 */
'use client';
/**
 * Clinician Messages Page
 *
 * Real-time chat interface for clinicians
 * Beautiful, mobile-optimized, industry-grade design
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ClinicianMessagesPage;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const ChatList_1 = __importDefault(require("@/components/chat/ChatList"));
const ChatThread_1 = __importDefault(require("@/components/chat/ChatThread"));
const MessageInput_1 = __importDefault(require("@/components/chat/MessageInput"));
const socket_client_1 = require("@/lib/chat/socket-client");
function ClinicianMessagesPage() {
    const sessionData = (0, react_2.useSession)();
    const router = (0, navigation_1.useRouter)();
    // Handle case where useSession returns undefined during build
    const session = sessionData?.data ?? null;
    const status = sessionData?.status ?? 'loading';
    const [conversations, setConversations] = (0, react_1.useState)([]);
    const [selectedConversationId, setSelectedConversationId] = (0, react_1.useState)(null);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [isLoadingConversations, setIsLoadingConversations] = (0, react_1.useState)(true);
    const [isLoadingMessages, setIsLoadingMessages] = (0, react_1.useState)(false);
    const [isTyping, setIsTyping] = (0, react_1.useState)(false);
    const [isMobileView, setIsMobileView] = (0, react_1.useState)(false);
    const selectedConversation = conversations.find(c => c.id === selectedConversationId);
    // Check auth
    (0, react_1.useEffect)(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
        }
    }, [status, router]);
    // Initialize Socket.io
    (0, react_1.useEffect)(() => {
        if (!session?.user?.id)
            return;
        // TODO: initSocket requires authToken parameter - using session user id as temporary token
        (0, socket_client_1.initSocket)(session.user.id);
        (0, socket_client_1.connectSocket)(session.user.id, 'CLINICIAN');
        const socket = (0, socket_client_1.getSocket)();
        if (!socket)
            return;
        // Listen for new messages
        socket.on('new_message', (message) => {
            // Add to messages if conversation is open
            if (message.patientId === selectedConversationId) {
                setMessages((prev) => [...prev, message]);
            }
            // Update conversation list
            fetchConversations();
        });
        // Listen for typing indicators
        socket.on('user_typing', ({ userId }) => {
            if (userId === selectedConversationId) {
                setIsTyping(true);
            }
        });
        socket.on('user_stopped_typing', ({ userId }) => {
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
    (0, react_1.useEffect)(() => {
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
        }
        catch (error) {
            console.error('Error fetching conversations:', error);
        }
        finally {
            setIsLoadingConversations(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (session?.user?.id) {
            fetchConversations();
        }
    }, [session]);
    // Fetch messages for selected conversation
    const fetchMessages = async (conversationId) => {
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
                setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
            }
        }
        catch (error) {
            console.error('Error fetching messages:', error);
        }
        finally {
            setIsLoadingMessages(false);
        }
    };
    // Select conversation
    const handleSelectConversation = (conversationId) => {
        setSelectedConversationId(conversationId);
        (0, socket_client_1.joinConversation)(conversationId);
        fetchMessages(conversationId);
    };
    // Send message
    const handleSendMessage = async (messageBody, attachments) => {
        if (!selectedConversation || !session?.user?.id)
            return;
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
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    };
    // Typing indicators
    const handleTyping = () => {
        if (selectedConversationId && session?.user?.id) {
            (0, socket_client_1.emitTypingStart)(selectedConversationId, session.user.id, `Dr. ${session.user.firstName || 'Doctor'}`);
        }
    };
    const handleStopTyping = () => {
        if (selectedConversationId && session?.user?.id) {
            (0, socket_client_1.emitTypingStop)(selectedConversationId, session.user.id);
        }
    };
    if (status === 'loading' || !session) {
        return (<div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"/>
      </div>);
    }
    // Mobile: Show conversation list or thread
    if (isMobileView) {
        if (selectedConversationId && selectedConversation) {
            return (<div className="flex flex-col h-screen bg-white dark:bg-gray-900">
          {/* Mobile header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button onClick={() => setSelectedConversationId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 dark:text-white">{selectedConversation.patientName}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Paciente</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ChatThread_1.default messages={messages} currentUserId={session.user.id} currentUserType="CLINICIAN" recipientName={selectedConversation.patientName} isTyping={isTyping} isLoading={isLoadingMessages}/>
          </div>

          {/* Input */}
          <MessageInput_1.default onSend={handleSendMessage} onTyping={handleTyping} onStopTyping={handleStopTyping}/>
        </div>);
        }
        return (<div className="flex flex-col h-screen bg-white dark:bg-gray-900">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mensajes
          </h1>
        </div>
        <ChatList_1.default conversations={conversations} selectedConversationId={selectedConversationId} onSelectConversation={handleSelectConversation} isLoading={isLoadingConversations}/>
      </div>);
    }
    // Desktop: Split view
    return (<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conversations sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mensajes
          </h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatList_1.default conversations={conversations} selectedConversationId={selectedConversationId} onSelectConversation={handleSelectConversation} isLoading={isLoadingConversations}/>
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {selectedConversation ? (<>
            {/* Thread header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedConversation.patientName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paciente</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ChatThread_1.default messages={messages} currentUserId={session.user.id} currentUserType="CLINICIAN" recipientName={selectedConversation.patientName} isTyping={isTyping} isLoading={isLoadingMessages}/>
            </div>

            {/* Input */}
            <MessageInput_1.default onSend={handleSendMessage} onTyping={handleTyping} onStopTyping={handleStopTyping}/>
          </>) : (<div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Elige un paciente para comenzar a chatear
              </p>
            </div>
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map