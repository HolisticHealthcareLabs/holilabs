'use client';
export const dynamic = 'force-dynamic';

/**
 * Unified Patients & Messages Page
 *
 * Features:
 * - 3 tabs: Patient List | Patient Messages | Colleague Messages
 * - Keyboard shortcuts: Cmd+1, Cmd+2, Cmd+3
 * - Linear/Notion-inspired clean design
 * - Real-time messaging integration
 * - Mobile-responsive split view
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SupportContact from '@/components/SupportContact';
import { PatientListDualView, PatientDetailSplitPanel } from '@/components/patients';
import ChatList from '@/components/chat/ChatList';
import ChatThread from '@/components/chat/ChatThread';
import MessageInput from '@/components/chat/MessageInput';
import { initSocket, connectSocket, joinConversation, emitTypingStart, emitTypingStop, getSocket } from '@/lib/chat/socket-client';
import type { Patient } from '@/components/patients/PatientListDualView';

type TabType = 'list' | 'patient-messages' | 'colleague-messages';

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
  patientId: string;
  body: string;
  attachments?: any;
  readAt: Date | null;
  createdAt: Date;
}

interface ColleagueConversation {
  id: string;
  colleagueId: string;
  colleagueName: string;
  colleagueRole: string;
  colleagueAvatar: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isOnline: boolean;
}

export default function UnifiedPatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionData = useSession();
  const session = sessionData?.data ?? null;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('list');

  // Patients state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Patient messages state
  const [patientConversations, setPatientConversations] = useState<Conversation[]>([]);
  const [selectedPatientConversationId, setSelectedPatientConversationId] = useState<string | null>(null);
  const [patientMessages, setPatientMessages] = useState<Message[]>([]);
  const [isLoadingPatientConversations, setIsLoadingPatientConversations] = useState(true);
  const [isLoadingPatientMessages, setIsLoadingPatientMessages] = useState(false);
  const [isPatientTyping, setIsPatientTyping] = useState(false);

  // Colleague messages state (mock data for now)
  const [colleagueConversations, setColleagueConversations] = useState<ColleagueConversation[]>([
    {
      id: 'colleague-1',
      colleagueId: 'col-001',
      colleagueName: 'Dr. Ana Martínez',
      colleagueRole: 'Cardióloga',
      colleagueAvatar: null,
      lastMessage: '¿Tienes disponibilidad para revisar este caso?',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: 'colleague-2',
      colleagueId: 'col-002',
      colleagueName: 'Dr. Carlos Ruiz',
      colleagueRole: 'Neurólogo',
      colleagueAvatar: null,
      lastMessage: 'Gracias por la consulta, te envío mis notas',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      unreadCount: 0,
      isOnline: false,
    },
    {
      id: 'colleague-3',
      colleagueId: 'col-003',
      colleagueName: 'Dra. María González',
      colleagueRole: 'Pediatra',
      colleagueAvatar: null,
      lastMessage: 'Podemos coordinar para la próxima semana',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      unreadCount: 0,
      isOnline: true,
    },
  ]);
  const [selectedColleagueConversationId, setSelectedColleagueConversationId] = useState<string | null>(null);

  const selectedPatientConversation = patientConversations.find(c => c.id === selectedPatientConversationId);
  const selectedColleagueConversation = colleagueConversations.find(c => c.id === selectedColleagueConversationId);

  // Mobile detection
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts (Cmd+1, Cmd+2, Cmd+3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('list');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('patient-messages');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('colleague-messages');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch patients
  useEffect(() => {
    async function fetchPatients() {
      try {
        const response = await fetch('/api/patients');
        const data = await response.json();

        if (response.ok) {
          setPatients(data.data);
        } else {
          setPatientsError(data.error || 'Failed to load patients');
        }
      } catch (err: any) {
        setPatientsError(err.message || 'Network error');
      } finally {
        setPatientsLoading(false);
      }
    }

    fetchPatients();
  }, []);

  // Initialize Socket.io for patient messages
  useEffect(() => {
    if (!session?.user?.id || activeTab !== 'patient-messages') return;

    initSocket(session.user.id);
    connectSocket(session.user.id, 'CLINICIAN');

    const socket = getSocket();
    if (!socket) return;

    // Listen for new messages
    socket.on('new_message', (message: Message) => {
      if (message.patientId === selectedPatientConversationId) {
        setPatientMessages((prev) => [...prev, message]);
      }
      fetchPatientConversations();
    });

    // Listen for typing indicators
    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId === selectedPatientConversationId) {
        setIsPatientTyping(true);
      }
    });

    socket.on('user_stopped_typing', ({ userId }: { userId: string }) => {
      if (userId === selectedPatientConversationId) {
        setIsPatientTyping(false);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [session, activeTab, selectedPatientConversationId]);

  // Fetch patient conversations
  const fetchPatientConversations = async () => {
    try {
      setIsLoadingPatientConversations(true);
      const response = await fetch('/api/messages');
      const data = await response.json();

      if (data.success) {
        setPatientConversations(data.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching patient conversations:', error);
    } finally {
      setIsLoadingPatientConversations(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id && activeTab === 'patient-messages') {
      fetchPatientConversations();
    }
  }, [session, activeTab]);

  // Fetch patient messages
  const fetchPatientMessages = async (conversationId: string) => {
    try {
      setIsLoadingPatientMessages(true);
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setPatientMessages(data.data.messages);

        // Mark as read
        await fetch(`/api/messages/${conversationId}`, {
          method: 'PATCH',
        });

        // Update conversation unread count
        setPatientConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (error) {
      console.error('Error fetching patient messages:', error);
    } finally {
      setIsLoadingPatientMessages(false);
    }
  };

  // Send patient message
  const handleSendPatientMessage = async (messageBody: string, attachments?: any[]) => {
    if (!selectedPatientConversation || !session?.user?.id) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: selectedPatientConversation.patientId,
          toUserType: 'PATIENT',
          patientId: selectedPatientConversation.patientId,
          messageBody,
          attachments: attachments && attachments.length > 0 ? attachments : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPatientMessages((prev) => [...prev, data.data.message]);
        fetchPatientConversations();
      }
    } catch (error) {
      console.error('Error sending patient message:', error);
    }
  };

  // Typing indicators for patient messages
  const handlePatientTyping = () => {
    if (selectedPatientConversationId && session?.user?.id) {
      emitTypingStart(selectedPatientConversationId, session.user.id, `Dr. ${(session.user as any).firstName || 'Doctor'}`);
    }
  };

  const handlePatientStopTyping = () => {
    if (selectedPatientConversationId && session?.user?.id) {
      emitTypingStop(selectedPatientConversationId, session.user.id);
    }
  };

  // Bulk actions handler for patients
  const handleBulkAction = async (action: string, patientIds: string[]) => {
    switch (action) {
      case 'export':
        try {
          const selectedPatients = patients.filter(p => patientIds.includes(p.id));
          const csvHeaders = 'Token ID,Nombre,Edad,Región,Estado,Medicamentos,Citas';
          const csvRows = selectedPatients.map(p =>
            `${p.tokenId},"${p.firstName} ${p.lastName}",${p.ageBand},${p.region},${p.isActive ? 'Activo' : 'Inactivo'},${p.medications?.length || 0},${p.appointments?.length || 0}`
          );
          const csvContent = [csvHeaders, ...csvRows].join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `pacientes_${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          alert(`✓ ${patientIds.length} pacientes exportados exitosamente`);
        } catch (error) {
          console.error('Error exporting patients:', error);
          alert('Error al exportar pacientes');
        }
        break;

      case 'assign':
        alert(`Asignar clínico a ${patientIds.length} pacientes (próximamente)`);
        break;

      case 'tag':
        alert(`Agregar etiquetas a ${patientIds.length} pacientes (próximamente)`);
        break;

      case 'deactivate':
        if (confirm(`¿Estás seguro de que quieres desactivar ${patientIds.length} pacientes?`)) {
          alert('Desactivando pacientes (próximamente)');
        }
        break;

      default:
        console.warn('Unknown bulk action:', action);
    }
  };

  // Patient click handlers
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatientId(patient.id);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  const handleCloseSplitPanel = () => {
    setSelectedPatientId(null);
  };

  // Get total unread count
  const totalUnreadPatientMessages = patientConversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const totalUnreadColleagueMessages = colleagueConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (patientsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-3xl">🏥</span>
                <span className="text-xl font-bold">Holi Labs</span>
                <span className="text-sm opacity-80">/ Pacientes</span>
              </div>
              <div className="bg-white/20 h-10 w-40 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="bg-white/20 h-12 rounded-lg animate-pulse mb-6"></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-750 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Top Nav */}
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                  <span className="text-3xl">🏥</span>
                  <span className="text-xl font-bold">Holi Labs</span>
                </Link>
                <span className="text-sm opacity-80">/ Pacientes</span>
              </div>
              <Link
                href="/dashboard/patients/invite"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 font-medium transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Paciente
              </Link>
            </div>
          </div>
        </header>

        {/* Tab Navigation - Linear/Notion Style */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="container mx-auto px-4">
            <nav className="flex space-x-1" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'list'}
                onClick={() => setActiveTab('list')}
                className={`px-4 py-3 text-sm font-medium transition-all relative ${
                  activeTab === 'list'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Lista de Pacientes
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">⌘1</kbd>
                </span>
                {activeTab === 'list' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>

              <button
                role="tab"
                aria-selected={activeTab === 'patient-messages'}
                onClick={() => setActiveTab('patient-messages')}
                className={`px-4 py-3 text-sm font-medium transition-all relative ${
                  activeTab === 'patient-messages'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Mensajes de Pacientes
                  {totalUnreadPatientMessages > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {totalUnreadPatientMessages}
                    </span>
                  )}
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">⌘2</kbd>
                </span>
                {activeTab === 'patient-messages' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>

              <button
                role="tab"
                aria-selected={activeTab === 'colleague-messages'}
                onClick={() => setActiveTab('colleague-messages')}
                className={`px-4 py-3 text-sm font-medium transition-all relative ${
                  activeTab === 'colleague-messages'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Colegas
                  {totalUnreadColleagueMessages > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {totalUnreadColleagueMessages}
                    </span>
                  )}
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">⌘3</kbd>
                </span>
                {activeTab === 'colleague-messages' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Tab 1: Patient List */}
          {activeTab === 'list' && (
            <>
              {/* Stats Row */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Pacientes</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{patients.length}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Activos</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {patients.filter(p => p.isActive).length}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Con Medicamentos</div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {patients.filter(p => p.medications && p.medications.length > 0).length}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Citas Próximas</div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {patients.filter(p => p.appointments && p.appointments.length > 0).length}
                  </div>
                </div>
              </div>

              {/* Patient List Component */}
              <PatientListDualView
                patients={patients}
                loading={patientsLoading}
                onPatientClick={handlePatientClick}
                onBulkAction={handleBulkAction}
              />
            </>
          )}

          {/* Tab 2: Patient Messages */}
          {activeTab === 'patient-messages' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
              <div className="flex h-full">
                {/* Conversations sidebar */}
                <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
                  <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Conversaciones</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {patientConversations.length} paciente{patientConversations.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatList
                      conversations={patientConversations}
                      selectedConversationId={selectedPatientConversationId}
                      onSelectConversation={(id) => {
                        setSelectedPatientConversationId(id);
                        joinConversation(id);
                        fetchPatientMessages(id);
                      }}
                      isLoading={isLoadingPatientConversations}
                    />
                  </div>
                </div>

                {/* Chat thread */}
                <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                  {selectedPatientConversation ? (
                    <>
                      {/* Thread header */}
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedPatientConversation.patientName}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Paciente</p>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-hidden">
                        <ChatThread
                          messages={patientMessages}
                          currentUserId={session?.user?.id || ''}
                          currentUserType="CLINICIAN"
                          recipientName={selectedPatientConversation.patientName}
                          isTyping={isPatientTyping}
                          isLoading={isLoadingPatientMessages}
                        />
                      </div>

                      {/* Input */}
                      <MessageInput
                        onSend={handleSendPatientMessage}
                        onTyping={handlePatientTyping}
                        onStopTyping={handlePatientStopTyping}
                      />
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Selecciona una conversación
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Elige un paciente para comenzar a chatear
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Colleague Messages */}
          {activeTab === 'colleague-messages' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
              <div className="flex h-full">
                {/* Colleagues sidebar */}
                <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
                  <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Colegas</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {colleagueConversations.length} colega{colleagueConversations.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {/* Colleague list */}
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {colleagueConversations.map((colleague) => (
                        <button
                          key={colleague.id}
                          onClick={() => setSelectedColleagueConversationId(colleague.id)}
                          className={`w-full px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                            selectedColleagueConversationId === colleague.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                              : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {colleague.colleagueName.charAt(0)}
                              </div>
                              {colleague.isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {colleague.colleagueName}
                                </h3>
                                {colleague.unreadCount > 0 && (
                                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {colleague.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {colleague.colleagueRole}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {colleague.lastMessage}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {new Date(colleague.lastMessageAt).toLocaleDateString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chat thread for colleagues */}
                <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                  {selectedColleagueConversation ? (
                    <>
                      {/* Thread header */}
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                              {selectedColleagueConversation.colleagueName.charAt(0)}
                            </div>
                            {selectedColleagueConversation.isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {selectedColleagueConversation.colleagueName}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedColleagueConversation.colleagueRole}
                              {selectedColleagueConversation.isOnline && (
                                <span className="ml-2 text-green-600 dark:text-green-400">● En línea</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Messages - Coming Soon */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md px-4">
                          <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Mensajería entre Colegas
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            La funcionalidad de chat con colegas está en desarrollo. Pronto podrás colaborar con otros profesionales en tiempo real.
                          </p>
                          <div className="inline-flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Próximamente
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Selecciona un colega
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Elige un colega para comenzar a colaborar
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Split-Panel Detail View (for patient list tab) */}
      {activeTab === 'list' && selectedPatientId && (
        <PatientDetailSplitPanel
          patientId={selectedPatientId}
          patients={patients}
          onClose={handleCloseSplitPanel}
          onPatientChange={handlePatientChange}
        />
      )}
    </>
  );
}
