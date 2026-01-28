/**
 * Break-Glass Chat
 *
 * RAG-only chat widget for resolving Traffic Light blockages.
 * ONLY expands when Traffic Light hits YELLOW or RED.
 *
 * LEGAL SAFETY: RAG-ONLY MODE
 * The Chat MUST be RAG-Only (Retrieval Augmented Generation).
 * It must ONLY answer using loaded ANS/TISS PDF manuals.
 * This prevents hallucination liability.
 *
 * @module sidecar/components/BreakGlassChat
 */

import React, { useState, useRef, useEffect } from 'react';
import type {
  TrafficLightResult,
  TrafficLightSignal,
  ChatMessage,
  Citation,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BreakGlassChatProps {
  trafficLightResult: TrafficLightResult | null;
  collapsed: boolean;
  onToggle: () => void;
  onSendMessage: (message: string) => Promise<ChatMessage>;
  onOverride?: (signals: TrafficLightSignal[], justification: string) => Promise<void>;
  language?: 'en' | 'pt';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  en: {
    title: 'Compliance Assistant',
    subtitle: 'RAG-verified answers only',
    placeholder: 'Ask about this blockage...',
    send: 'Send',
    thinking: 'Checking compliance documents...',
    errorFallback: 'I cannot verify this from the loaded documents. Please consult the billing department.',
    suggestionsTitle: 'Suggested questions:',
    suggestions: [
      'Why is this procedure blocked?',
      'What authorization is required?',
      'How can I fix this billing code?',
      'What documents are missing?',
    ],
    citationPrefix: 'Source:',
    overrideButton: 'Override with Justification',
    overrideTitle: 'Override Reason',
    overridePlaceholder: 'Explain why you are overriding this alert (min 10 characters)...',
    overrideSubmit: 'Submit Override',
    overrideCancel: 'Cancel',
    warningRAG: 'Answers are verified against official ANS/TISS documentation only.',
    noBlockage: 'No active blockage',
  },
  pt: {
    title: 'Assistente de Conformidade',
    subtitle: 'Apenas respostas verificadas por RAG',
    placeholder: 'Pergunte sobre este bloqueio...',
    send: 'Enviar',
    thinking: 'Verificando documentos de conformidade...',
    errorFallback: 'Não consigo verificar isso nos documentos carregados. Por favor, consulte o departamento de faturamento.',
    suggestionsTitle: 'Perguntas sugeridas:',
    suggestions: [
      'Por que este procedimento está bloqueado?',
      'Qual autorização é necessária?',
      'Como posso corrigir este código de cobrança?',
      'Quais documentos estão faltando?',
    ],
    citationPrefix: 'Fonte:',
    overrideButton: 'Sobrepor com Justificativa',
    overrideTitle: 'Motivo da Sobreposição',
    overridePlaceholder: 'Explique por que você está sobrepondo este alerta (mín 10 caracteres)...',
    overrideSubmit: 'Enviar Sobreposição',
    overrideCancel: 'Cancelar',
    warningRAG: 'Respostas são verificadas apenas contra documentação oficial ANS/TISS.',
    noBlockage: 'Nenhum bloqueio ativo',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface MessageBubbleProps {
  message: ChatMessage;
  language: 'en' | 'pt';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, language }) => {
  const t = translations[language];
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            {message.citations.map((citation, idx) => (
              <CitationBadge key={idx} citation={citation} language={language} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CITATION BADGE
// ═══════════════════════════════════════════════════════════════════════════════

interface CitationBadgeProps {
  citation: Citation;
  language: 'en' | 'pt';
}

const CitationBadge: React.FC<CitationBadgeProps> = ({ citation, language }) => {
  const t = translations[language];

  return (
    <div className="text-xs text-gray-500 mt-1">
      <span className="font-medium">{t.citationPrefix}</span>{' '}
      <span className="text-blue-600">{citation.source}</span>
      {citation.page && <span> (p. {citation.page})</span>}
      <span className="text-gray-400 ml-1">
        [{Math.round(citation.confidence * 100)}%]
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const BreakGlassChat: React.FC<BreakGlassChatProps> = ({
  trafficLightResult,
  collapsed,
  onToggle,
  onSendMessage,
  onOverride,
  language = 'pt',
}) => {
  const t = translations[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add initial context message when result changes
  useEffect(() => {
    if (trafficLightResult && trafficLightResult.color !== 'GREEN') {
      const contextMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'system',
        content: buildContextMessage(trafficLightResult, language),
        timestamp: new Date(),
      };
      setMessages([contextMessage]);
    }
  }, [trafficLightResult?.color]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await onSendMessage(input.trim());
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: t.errorFallback,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleOverrideSubmit = async () => {
    if (!trafficLightResult || overrideJustification.length < 10) return;

    try {
      await onOverride?.(trafficLightResult.signals, overrideJustification);
      setShowOverrideModal(false);
      setOverrideJustification('');
    } catch (error) {
      console.error('Override failed:', error);
    }
  };

  // Collapsed state - just show a button
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <span className="text-lg">💬</span>
        <span>{t.title}</span>
        {trafficLightResult?.needsChatAssistance && (
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{t.title}</h3>
            <p className="text-xs text-blue-100">{t.subtitle}</p>
          </div>
          <button
            onClick={onToggle}
            className="text-white hover:bg-blue-500 rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* RAG Warning */}
        <div className="mt-2 text-xs bg-blue-500/30 rounded px-2 py-1">
          ⚠️ {t.warningRAG}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && !trafficLightResult?.needsChatAssistance && (
          <p className="text-gray-500 text-center py-8">{t.noBlockage}</p>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} language={language} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-600">
              {t.thinking}
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (show when no messages) */}
      {messages.length <= 1 && trafficLightResult?.needsChatAssistance && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">{t.suggestionsTitle}</p>
          <div className="flex flex-wrap gap-2">
            {t.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Override Button */}
      {trafficLightResult?.canOverride && onOverride && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowOverrideModal(true)}
            className="w-full py-2 text-sm bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg transition-colors"
          >
            {t.overrideButton}
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.placeholder}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t.send}
          </button>
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <h4 className="font-semibold mb-2">{t.overrideTitle}</h4>
            <textarea
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
              placeholder={t.overridePlaceholder}
              className="w-full border rounded-lg px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t.overrideCancel}
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={overrideJustification.length < 10}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t.overrideSubmit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function buildContextMessage(result: TrafficLightResult, language: 'en' | 'pt'): string {
  const isPortuguese = language === 'pt';

  const header = isPortuguese
    ? `🚦 **Alerta de ${result.color === 'RED' ? 'Bloqueio' : 'Atenção'}**\n\n`
    : `🚦 **${result.color === 'RED' ? 'Block' : 'Warning'} Alert**\n\n`;

  const signalList = result.signals
    .map((signal) => {
      const msg = isPortuguese ? signal.messagePortuguese : signal.message;
      const icon = signal.color === 'RED' ? '🔴' : '🟡';
      return `${icon} **${signal.ruleName}**: ${msg}`;
    })
    .join('\n');

  const glosaWarning = result.totalGlosaRisk
    ? isPortuguese
      ? `\n\n💰 **Risco de Glosa:** R$ ${result.totalGlosaRisk.totalAmountAtRisk.toLocaleString('pt-BR')} (${result.totalGlosaRisk.probability}% probabilidade)`
      : `\n\n💰 **Glosa Risk:** R$ ${result.totalGlosaRisk.totalAmountAtRisk.toLocaleString('pt-BR')} (${result.totalGlosaRisk.probability}% probability)`
    : '';

  const footer = isPortuguese
    ? '\n\nComo posso ajudar a resolver este problema?'
    : '\n\nHow can I help resolve this issue?';

  return header + signalList + glosaWarning + footer;
}

export default BreakGlassChat;
