'use client';

import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, ChevronRight, Plus } from 'lucide-react';

// Inline mic SVG — lucide-react Mic/MicOff have a TS 5.9 export-duplicate issue in this version
const MicSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);
const MicOffSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);
import type { ModelId } from './CdssAlertsPane';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PromptMode = 'Planning' | 'Rx' | 'SOAP' | 'Referral' | 'Orders';

const PROMPT_MODES: PromptMode[] = ['Planning', 'Rx', 'SOAP', 'Referral', 'Orders'];

const MODEL_LABELS: Record<ModelId, string> = {
  anthropic: 'DeepSeek-R1',
  openai:    'GPT-120B',
  gemini:    'Gemini 1.5',
};

export interface ClinicalChatBarProps {
  value:              string;
  onChange:           (v: string) => void;
  onSend:             () => void;
  onSync:             () => void;
  onUpload:           (files: FileList) => void;
  onMicToggle:        () => void;
  isListening:        boolean;
  isSyncing:          boolean;
  isReplying:         boolean;
  disabled:           boolean;
  promptMode:         PromptMode;
  onPromptModeChange: (mode: PromptMode) => void;
  activeModel:        ModelId;
  onModelChange:      (model: ModelId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ClinicalChatBar — "Antigravity" dark pill chat bar
// ─────────────────────────────────────────────────────────────────────────────

export function ClinicalChatBar({
  value,
  onChange,
  onSend,
  onSync,
  onUpload,
  onMicToggle,
  isListening,
  isSyncing,
  isReplying,
  disabled,
  promptMode,
  onPromptModeChange,
  activeModel,
  onModelChange,
}: ClinicalChatBarProps) {
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const canSend         = value.trim().length > 0 && !disabled && !isReplying;

  // Auto-expand textarea height
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  }

  return (
    <div className="
      flex-shrink-0 flex flex-col
      rounded-2xl overflow-hidden
      bg-slate-900 dark:bg-slate-950
      border border-slate-700/60
      shadow-lg shadow-slate-900/30
    ">
      {/* ── Textarea row ────────────────────────────────────────────────────── */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Sync transcript first to chat…' : 'Ask anything, @ to mention, / for workflow…'}
        disabled={disabled}
        aria-label="Clinical chat input"
        className="
          w-full resize-none px-4 pt-3 pb-2
          bg-transparent
          text-sm text-slate-100 placeholder-slate-600
          focus:outline-none
          max-h-32 overflow-y-auto
          disabled:cursor-not-allowed disabled:opacity-40
        "
        style={{ lineHeight: '1.5' }}
      />

      {/* ── Control row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1">

        {/* + Upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          className="
            w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
            text-slate-400 hover:text-slate-200 hover:bg-slate-800
            transition-colors
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400
          "
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.docx,.doc"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />

        {/* Prompt mode selector */}
        <div className="relative flex items-center flex-shrink-0">
          <select
            value={promptMode}
            onChange={(e) => onPromptModeChange(e.target.value as PromptMode)}
            aria-label="Prompt mode"
            className="
              appearance-none bg-transparent
              text-[11px] font-medium text-slate-300
              pl-1 pr-5 py-1 rounded-lg
              hover:bg-slate-800 transition-colors
              focus:outline-none focus:ring-1 focus:ring-cyan-400
              cursor-pointer
            "
          >
            {PROMPT_MODES.map((m) => (
              <option key={m} value={m} className="bg-slate-900 text-slate-200">
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-700/60 flex-shrink-0 mx-0.5" />

        {/* Model selector */}
        <div className="relative flex items-center flex-shrink-0 min-w-0">
          <select
            value={activeModel}
            onChange={(e) => onModelChange(e.target.value as ModelId)}
            aria-label="Select AI model"
            className="
              appearance-none bg-transparent
              text-[11px] font-medium text-slate-400
              pl-1 pr-5 py-1 rounded-lg
              hover:bg-slate-800 transition-colors
              focus:outline-none focus:ring-1 focus:ring-cyan-400
              cursor-pointer max-w-[110px] truncate
            "
          >
            {(Object.keys(MODEL_LABELS) as ModelId[]).map((id) => (
              <option key={id} value={id} className="bg-slate-900 text-slate-200">
                {MODEL_LABELS[id]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sync button — expands on hover */}
        <SyncButton isSyncing={isSyncing} onSync={onSync} syncEnabled={!disabled} />

        {/* Mic toggle */}
        <button
          type="button"
          onClick={onMicToggle}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          aria-pressed={isListening}
          className={`
            w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
            transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400
            ${isListening
              ? 'text-red-400 bg-red-500/15 ring-2 ring-red-400/50 animate-pulse'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }
          `}
        >
          {isListening ? <MicSvg className="w-3.5 h-3.5" /> : <MicOffSvg className="w-3.5 h-3.5" />}
        </button>

        {/* Send button */}
        <motion.button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          whileHover={canSend ? { scale: 1.08 } : {}}
          whileTap={canSend ? { scale: 0.92 } : {}}
          aria-label="Send message"
          className={`
            w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
            transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400
            ${canSend
              ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-sm shadow-cyan-500/30'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }
          `}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SyncButton — compact heartbeat icon that expands to "Sync" text on hover
// ─────────────────────────────────────────────────────────────────────────────

function SyncButton({ isSyncing, onSync, syncEnabled }: { isSyncing: boolean; onSync: () => void; syncEnabled: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onSync}
      disabled={!syncEnabled || isSyncing}
      aria-label="Sync with CDSS"
      aria-busy={isSyncing}
      whileTap={syncEnabled && !isSyncing ? { scale: 0.93 } : {}}
      initial={false}
      whileHover="hovered"
      className="
        relative flex items-center justify-center flex-shrink-0
        h-7 rounded-lg px-1.5
        overflow-hidden
        text-slate-400 hover:text-cyan-400 hover:bg-slate-800
        transition-colors
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400
        disabled:cursor-not-allowed
      "
    >
      {/* Spinner — replaces icon while syncing; contained inside the button via
          relative/absolute positioning so it never bleeds outside the bounds.  */}
      {isSyncing ? (
        <span
          className="
            block w-3.5 h-3.5 flex-shrink-0
            rounded-full border-2 border-slate-700 border-t-cyan-400
            animate-spin
          "
          aria-hidden="true"
        />
      ) : (
        <Activity className="w-3.5 h-3.5 flex-shrink-0" />
      )}

      {/* Expanding label — max-w prevents unbounded growth that would push
          sibling buttons during the hover-expand animation.                   */}
      <motion.span
        variants={{
          hovered: { opacity: 1, width: 'auto', maxWidth: 48, marginLeft: 4 },
        }}
        initial={{ opacity: 0, width: 0, maxWidth: 0, marginLeft: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="text-[11px] font-medium whitespace-nowrap overflow-hidden"
        aria-hidden="true"
      >
        {isSyncing ? 'Syncing…' : 'Sync'}
      </motion.span>
    </motion.button>
  );
}
