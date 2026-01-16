/**
 * CDSS V3 - ChatWithSuggestions Component
 *
 * Inline chat interface with AI-generated smart suggestions based on
 * the clinical conversation. Suggestions help clinicians quickly access
 * relevant CDSS tools.
 *
 * Features:
 * - Real-time chat with AI assistant
 * - Smart suggestions extracted from conversation context
 * - De-identification before LLM processing (PHI safety)
 * - Clickable suggestion chips
 * - HIPAA-compliant transcript handling
 *
 * PRD Reference: Section 2.6 Smart Suggestions
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Suggestion {
  id: string;
  label: string;
  type: 'calculator' | 'order' | 'lab' | 'alert' | 'reference';
  action: string;
  payload?: Record<string, string>;
}

interface ChatWithSuggestionsProps {
  /** Patient ID for context */
  patientId: string;
  /** Optional encounter ID */
  encounterId?: string;
  /** Optional initial messages */
  initialMessages?: ChatMessage[];
  /** Callback when a suggestion is clicked */
  onSuggestionClick?: (suggestion: Suggestion) => void;
  /** Callback when a message is sent */
  onMessageSent?: (message: ChatMessage) => void;
  /** Whether the component is expanded by default */
  defaultExpanded?: boolean;
  /** Custom class name */
  className?: string;
}

// Send icon
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

// Suggestion type icons
const SuggestionIcon = ({ type }: { type: Suggestion['type'] }) => {
  switch (type) {
    case 'calculator':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'order':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case 'lab':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    case 'alert':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'reference':
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
};

// Suggestion chip styling by type
const suggestionStyles: Record<Suggestion['type'], string> = {
  calculator: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50',
  order: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50',
  lab: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50',
  alert: 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50',
  reference: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
};

// Loading dots animation
const LoadingDots = () => (
  <div className="flex items-center gap-1">
    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

export function ChatWithSuggestions({
  patientId,
  encounterId,
  initialMessages = [],
  onSuggestionClick,
  onMessageSent,
  defaultExpanded = true,
  className = '',
}: ChatWithSuggestionsProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }, []);

  // Extract suggestions from AI response
  const extractSuggestions = useCallback((content: string): Suggestion[] => {
    const suggestionsFromResponse: Suggestion[] = [];

    // Pattern matching for common clinical suggestions
    const patterns = [
      { regex: /ACS risk|chest pain.*risk/i, label: 'ACS Risk Calculator', type: 'calculator' as const, action: 'calculate_acs_risk' },
      { regex: /ECG|EKG|electrocardiogram/i, label: 'Order ECG', type: 'order' as const, action: 'order_ecg' },
      { regex: /troponin|cardiac enzyme/i, label: 'Check Troponin Trend', type: 'lab' as const, action: 'view_troponin' },
      { regex: /colonoscopy|colon cancer screen/i, label: 'Order Colonoscopy', type: 'order' as const, action: 'order_colonoscopy' },
      { regex: /A1c|hemoglobin a1c|diabetes screen/i, label: 'Order HbA1c', type: 'lab' as const, action: 'order_hba1c' },
      { regex: /lipid|cholesterol/i, label: 'Order Lipid Panel', type: 'lab' as const, action: 'order_lipid_panel' },
      { regex: /drug interaction|medication review/i, label: 'Check Drug Interactions', type: 'alert' as const, action: 'check_interactions' },
      { regex: /CHA2DS2-VASc|stroke risk/i, label: 'CHA2DS2-VASc Score', type: 'calculator' as const, action: 'calculate_chadsvasc' },
      { regex: /wells|PE probability|pulmonary embolism/i, label: 'Wells Score (PE)', type: 'calculator' as const, action: 'calculate_wells_pe' },
      { regex: /CURB-65|pneumonia severity/i, label: 'CURB-65 Score', type: 'calculator' as const, action: 'calculate_curb65' },
      { regex: /creatinine clearance|GFR|kidney function/i, label: 'Calculate GFR', type: 'calculator' as const, action: 'calculate_gfr' },
      { regex: /mammogram|breast cancer screen/i, label: 'Order Mammogram', type: 'order' as const, action: 'order_mammogram' },
      { regex: /blood pressure|hypertension/i, label: 'BP Management Guidelines', type: 'reference' as const, action: 'view_bp_guidelines' },
    ];

    patterns.forEach(pattern => {
      if (pattern.regex.test(content)) {
        // Avoid duplicates
        if (!suggestionsFromResponse.some(s => s.action === pattern.action)) {
          suggestionsFromResponse.push({
            id: `suggestion-${pattern.action}-${Date.now()}`,
            label: pattern.label,
            type: pattern.type,
            action: pattern.action,
          });
        }
      }
    });

    return suggestionsFromResponse.slice(0, 4); // Max 4 suggestions
  }, []);

  // Send message to AI
  const sendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    setError(null);

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    onMessageSent?.(userMessage);

    try {
      // Call CDSS chat endpoint
      // Note: Transcript is de-identified server-side before LLM processing
      const response = await fetch('/api/cdss/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          encounterId,
          message: trimmedInput,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Extract and update suggestions from both user input and AI response
      const combinedContent = `${trimmedInput} ${data.data.response}`;
      const newSuggestions = extractSuggestions(combinedContent);

      // Merge with server-provided suggestions if available
      if (data.data.suggestions && Array.isArray(data.data.suggestions)) {
        const serverSuggestions = data.data.suggestions.map((s: any) => ({
          id: `suggestion-${s.action}-${Date.now()}`,
          label: s.label,
          type: s.type || 'reference',
          action: s.action,
          payload: s.payload,
        }));

        // Combine, avoiding duplicates
        const allSuggestions = [...newSuggestions];
        serverSuggestions.forEach((s: Suggestion) => {
          if (!allSuggestions.some(existing => existing.action === s.action)) {
            allSuggestions.push(s);
          }
        });

        setSuggestions(allSuggestions.slice(0, 5));
      } else {
        setSuggestions(newSuggestions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, patientId, encounterId, messages, onMessageSent, extractSuggestions]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    onSuggestionClick?.(suggestion);

    // Add a message indicating the action
    const actionMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: `[Clicked: ${suggestion.label}]`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, actionMessage]);
  }, [onSuggestionClick]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <Card variant="outlined" padding="none" className={className}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-left"
      >
        <CardHeader
          title="Chat + Smart Suggestions"
          subtitle="AI assistant with clinical decision support"
        />
        <svg
          className={`w-5 h-5 text-neutral-600 dark:text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <CardContent className="p-0">
          {/* Messages area */}
          <div className="h-64 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-neutral-950">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-500">
                <p>Start a conversation about your patient...</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-primary-200'
                        : 'text-neutral-500 dark:text-neutral-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-3">
                  <LoadingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Smart Suggestions (based on conversation):
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${suggestionStyles[suggestion.type]}`}
                  >
                    <SuggestionIcon type={suggestion.type} />
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your patient... (Shift+Enter for new line)"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
              />
              <Button
                variant="primary"
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="flex-shrink-0"
              >
                <SendIcon />
              </Button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
              Conversation is de-identified before AI processing for PHI safety.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default ChatWithSuggestions;
