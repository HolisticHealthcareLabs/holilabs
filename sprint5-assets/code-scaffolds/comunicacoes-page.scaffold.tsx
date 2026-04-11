'use client';

/**
 * Comunicações Hub — Unified Communications Page (REFERENCE ONLY)
 *
 * holilabsv2 already built this as a 1119-line page.tsx.
 * This scaffold documents the architectural intent for future refactors.
 *
 * Architecture: Two-panel layout (ConversationList + MessageThread)
 *   with optional PatientContextSidebar slide-in.
 *
 * @see sprint5-assets/comms-architecture.json — full technical spec
 * @see sprint5-assets/comms-hub-templates.json — 16 HSM templates
 * @see sprint5-assets/i18n-sprint6.json — comms.* keys
 * @see sprint5-assets/api-contracts.json — comunicacoes.* endpoints
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  MessageSquare,
  Send,
  Paperclip,
  ClipboardList,
  Check,
  CheckCheck,
  XCircle,
  Clock,
  Search,
  Phone,
  Mail,
  ChevronRight,
  Wifi,
  WifiOff,
  User,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

/** @see comms-architecture.json — database.models.Conversation */
type ChannelType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP';
type ConversationStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
type MessageDirection = 'INBOUND' | 'OUTBOUND';

interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  channelType: ChannelType;
  status: ConversationStatus;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  lastInboundAt: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  channelType: ChannelType;
  content: string;
  contentType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'TEMPLATE';
  status: MessageStatus;
  templateId: string | null;
  sentById: string | null;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

interface PatientContext {
  id: string;
  name: string;
  age: number;
  sex: string;
  phone: string;
  email: string;
  nextAppointment: string | null;
  allergies: string[];
  activeMedications: string[];
  recentLabs: Array<{ name: string; value: string; date: string }>;
}

// ─── Channel Config ──────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<ChannelType, { icon: React.ElementType; color: string; label: string }> = {
  WHATSAPP: { icon: Phone, color: '#25D366', label: 'WhatsApp' },
  SMS: { icon: MessageSquare, color: '#3B82F6', label: 'SMS' },
  EMAIL: { icon: Mail, color: '#6B7280', label: 'Email' },
  IN_APP: { icon: MessageSquare, color: '#7C3AED', label: 'In-App' },
};

// ─── Status Icons ────────────────────────────────────────────────────────────

function DeliveryStatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'QUEUED': return <Clock className="h-3 w-3 text-gray-400" />;
    case 'SENT': return <Check className="h-3 w-3 text-gray-400" />;
    case 'DELIVERED': return <CheckCheck className="h-3 w-3 text-gray-400" />;
    case 'READ': return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case 'FAILED': return <XCircle className="h-3 w-3 text-clinical-critical" />;
    default: return null;
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Hook: Fetch conversations with pagination and channel filtering.
 * TODO: holilabsv2 — implement SSE for real-time updates
 */
function useConversations(channelFilter: ChannelType | 'ALL', search: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/comms/conversations?channel=${channelFilter}&search=${encodeURIComponent(search)}`, {
      headers: { 'X-Access-Reason': 'TREATMENT' },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data) setConversations(data.conversations || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [channelFilter, search]);

  return { conversations, loading, setConversations };
}

/**
 * Hook: Fetch messages for a conversation.
 */
function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    let cancelled = false;
    setLoading(true);

    fetch(`/api/comms/conversations/${conversationId}`, {
      headers: { 'X-Access-Reason': 'TREATMENT' },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data) setMessages(data.messages || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [conversationId]);

  return { messages, loading, setMessages };
}

/**
 * Hook: Network connectivity status.
 * @see comms-architecture.json — offlineHandling
 */
function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat
    const interval = setInterval(async () => {
      try {
        const start = Date.now();
        await fetch('/api/health', { method: 'HEAD' });
        const latency = Date.now() - start;
        setSlow(latency > 2000);
      } catch {
        setOnline(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { online, slow };
}

// ─── ConversationList Panel ──────────────────────────────────────────────────

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  channelFilter,
  onChannelFilterChange,
  search,
  onSearchChange,
  t,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  channelFilter: ChannelType | 'ALL';
  onChannelFilterChange: (c: ChannelType | 'ALL') => void;
  search: string;
  onSearchChange: (s: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const channels: Array<ChannelType | 'ALL'> = ['ALL', 'WHATSAPP', 'SMS', 'EMAIL', 'IN_APP'];

  return (
    <div className="w-[360px] shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full" data-testid="conversation-list">
      {/* Search */}
      <div className="px-md py-sm border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-xs rounded-xl bg-gray-100 dark:bg-gray-800 px-sm py-xs">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchConversations')}
            className="flex-1 bg-transparent text-body-dense outline-none"
          />
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-xs px-md py-xs border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        {channels.map((ch) => (
          <button
            key={ch}
            onClick={() => onChannelFilterChange(ch)}
            className={`shrink-0 rounded-full px-sm py-xs text-caption font-semibold transition-colors ${
              channelFilter === ch
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            data-testid={`channel-filter-${ch.toLowerCase()}`}
          >
            {ch === 'ALL' ? t('channelAll') : ch}
          </button>
        ))}
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-md text-center" data-testid="comms-empty">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-sm" />
            <p className="text-body-dense font-semibold text-gray-500">{t('noConversations')}</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const config = CHANNEL_CONFIG[conv.channelType];
            const Icon = config.icon;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-start gap-sm px-md py-sm border-b border-gray-50 dark:border-gray-800 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  selectedId === conv.id ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                }`}
                data-testid="conversation-item"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div
                    className="absolute -bottom-px -right-px h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center"
                    style={{ backgroundColor: config.color }}
                  >
                    <Icon className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-body-dense font-semibold text-gray-900 dark:text-white truncate">
                      {conv.patientName}
                    </p>
                    <span className="text-caption text-gray-400 shrink-0">
                      {/* TODO: holilabsv2 — use relative time (1m, 2h, 3d) */}
                      {new Date(conv.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-caption text-gray-500 truncate">{conv.lastMessagePreview}</p>
                </div>

                {/* Unread Badge */}
                {conv.unreadCount > 0 && (
                  <span className="shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-clinical-critical text-white text-caption font-bold px-xs">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── MessageThread Panel ─────────────────────────────────────────────────────

function MessageThread({
  messages,
  loading,
  onSend,
  networkStatus,
  t,
}: {
  messages: Message[];
  loading: boolean;
  onSend: (content: string) => void;
  networkStatus: { online: boolean; slow: boolean };
  t: ReturnType<typeof useTranslations>;
}) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className="flex-1 flex flex-col h-full" data-testid="message-thread">
      {/* Connectivity Banner */}
      {!networkStatus.online && (
        <div className="flex items-center gap-xs px-md py-xs bg-clinical-critical/10 border-b border-clinical-critical/20">
          <WifiOff className="h-4 w-4 text-clinical-critical" />
          <p className="text-caption text-clinical-critical">{t('offlineBanner')}</p>
        </div>
      )}
      {networkStatus.slow && networkStatus.online && (
        <div className="flex items-center gap-xs px-md py-xs bg-clinical-caution/10 border-b border-clinical-caution/20">
          <Wifi className="h-4 w-4 text-clinical-caution" />
          <p className="text-caption text-clinical-caution">{t('slowConnection')}</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-md py-md space-y-sm">
        {messages.map((msg) => {
          const isOwn = msg.direction === 'OUTBOUND';
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-md py-sm ${
                isOwn
                  ? 'bg-cyan-500 text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
              }`}>
                <p className="text-body-dense whitespace-pre-wrap">{msg.content}</p>
                <div className={`flex items-center gap-xs mt-xs ${isOwn ? 'justify-end' : ''}`}>
                  <span className={`text-caption ${isOwn ? 'text-cyan-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isOwn && <DeliveryStatusIcon status={msg.status} />}
                  {msg.status === 'FAILED' && (
                    <button className="text-caption text-clinical-critical underline">{t('retry')}</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compose Bar */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-md py-sm flex items-end gap-sm">
        <button className="shrink-0 min-h-touch-sm min-w-touch-sm flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <Paperclip className="h-5 w-5 text-gray-400" />
        </button>
        <button className="shrink-0 min-h-touch-sm min-w-touch-sm flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800" data-testid="template-picker-button">
          <ClipboardList className="h-5 w-5 text-gray-400" />
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t('typeMessage')}
          rows={1}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-md py-sm text-body resize-none min-h-touch-md max-h-32"
          data-testid="message-input"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="shrink-0 min-h-touch-sm min-w-touch-sm flex items-center justify-center rounded-xl bg-cyan-500 text-white disabled:opacity-30"
          data-testid="send-button"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

/**
 * NOTE: holilabsv2 already has a 1119-line implementation of this page.
 * This scaffold is a REFERENCE for future refactors — it documents the
 * intended hook structure, type system, and component boundaries.
 */
export default function ComunicacoesPage() {
  const t = useTranslations('comms');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { conversations, loading: convsLoading } = useConversations(channelFilter, search);
  const { messages, loading: msgsLoading, setMessages } = useMessages(selectedId);
  const networkStatus = useNetworkStatus();

  // ─── Send Message (optimistic) ───────────────────────────────────────────
  const handleSend = useCallback(async (content: string) => {
    if (!selectedId) return;

    // Optimistic: add message immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedId,
      direction: 'OUTBOUND',
      channelType: conversations.find((c) => c.id === selectedId)?.channelType || 'WHATSAPP',
      content,
      contentType: 'TEXT',
      status: 'QUEUED',
      templateId: null,
      sentById: null,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // TODO: holilabsv2 — wire to /api/comms/conversations/:id/reply
      const res = await fetch(`/api/comms/conversations/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        // Replace optimistic message with server response
        setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? { ...m, id: data.messageId, status: 'SENT' } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? { ...m, status: 'FAILED' } : m));
      }
    } catch {
      // TODO: holilabsv2 — queue in IndexedDB for offline retry
      setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? { ...m, status: 'FAILED' } : m));
    }
  }, [selectedId, conversations, setMessages]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" data-testid="comms-layout">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        search={search}
        onSearchChange={setSearch}
        t={t}
      />

      {selectedId ? (
        <MessageThread
          messages={messages}
          loading={msgsLoading}
          onSend={handleSend}
          networkStatus={networkStatus}
          t={t}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-md" />
            <p className="text-body text-gray-500">{t('noConversations') || 'Select a conversation to start messaging'}</p>
          </div>
        </div>
      )}

      {/* TODO: holilabsv2 — PatientContextSidebar slides in from right when patient name is clicked */}
      {/* TODO: holilabsv2 — TemplatePickerModal opens from compose bar clipboard button */}
    </div>
  );
}
