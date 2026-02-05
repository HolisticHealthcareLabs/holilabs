/**
 * Sidecar App Component
 *
 * Main container for the Cortex Assurance desktop overlay.
 * Displays Traffic Light status and provides Break-Glass chat.
 *
 * @module sidecar/renderer/App
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { TrafficLightResult, EHRFingerprint, ChatMessage, TrafficLightSignal } from '../types';
import { TrafficLightOverlay } from './components/TrafficLightOverlay';
import { BreakGlassChat } from '../components/BreakGlassChat';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { ConsoleView } from './components/ConsoleView'; // [NEW] Command Center
import './styles/futuristic.css';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type ConnectionStatus = 'connected' | 'degraded' | 'offline';
type Language = 'en' | 'pt';

interface AppState {
  trafficLightResult: TrafficLightResult | null;
  isEvaluating: boolean;
  connection: ConnectionStatus;
  ehr: EHRFingerprint | null;
  isVDI: boolean;
  chatExpanded: boolean;
  language: Language;
  minimized: boolean;
  showOnboarding: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    trafficLightResult: null,
    isEvaluating: false,
    connection: 'offline',
    ehr: null,
    isVDI: false,
    chatExpanded: false,
    language: 'pt', // Default to Portuguese for Brazilian market
    minimized: false,
    showOnboarding: false,
  });

  // Dual Mode: 'console' (Default) or 'ghost' (Overlay)
  const [viewMode, setViewMode] = useState<'console' | 'ghost'>('console');
  // Log history for the console view
  const [signalsLog, setSignalsLog] = useState<TrafficLightResult[]>([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Check Onboarding Status & Fetch initial status
  useEffect(() => {
    // Check local storage for onboarding
    const hasOnboarded = localStorage.getItem('cortex_onboarding_completed');
    if (!hasOnboarded) {
      setState(prev => ({ ...prev, showOnboarding: true }));
    }

    const fetchStatus = async () => {
      try {
        const status = await window.electronAPI.getStatus();
        setState((prev) => ({
          ...prev,
          connection: status.connection,
          ehr: status.ehr,
          isVDI: status.isVDI,
        }));
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    fetchStatus();

    // Refresh status every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Set up IPC listeners
  useEffect(() => {
    const unsubscribeTrafficLight = window.electronAPI.onTrafficLightResult((result) => {
      setState((prev) => ({
        ...prev,
        trafficLightResult: result,
        isEvaluating: false,
        // Auto-expand chat if we hit a blockage AND we are in ghost mode
        chatExpanded: viewMode === 'ghost' && (result.needsChatAssistance || prev.chatExpanded),
      }));

      // Update Log
      setSignalsLog(prev => [result, ...prev].slice(0, 50));
    });

    const unsubscribeEHR = window.electronAPI.onEHRDetected((fingerprint) => {
      setState((prev) => ({
        ...prev,
        ehr: fingerprint,
      }));
    });

    const unsubscribeConnection = window.electronAPI.onConnectionStatus((status) => {
      setState((prev) => ({
        ...prev,
        connection: status as ConnectionStatus,
      }));
    });

    return () => {
      unsubscribeTrafficLight();
      unsubscribeEHR();
      unsubscribeConnection();
    };
  }, [viewMode]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleEvaluate = useCallback(async () => {
    setState((prev) => ({ ...prev, isEvaluating: true }));

    try {
      const response = await window.electronAPI.evaluateContext();
      if (response.success && response.result) {
        setState((prev) => ({
          ...prev,
          trafficLightResult: response.result!,
          isEvaluating: false,
          chatExpanded: response.result!.needsChatAssistance || prev.chatExpanded,
        }));
      } else {
        console.error('Evaluation failed:', response.error);
        setState((prev) => ({ ...prev, isEvaluating: false }));
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      setState((prev) => ({ ...prev, isEvaluating: false }));
    }
  }, []);

  const handleChatToggle = useCallback(() => {
    setState((prev) => ({ ...prev, chatExpanded: !prev.chatExpanded }));
  }, []);

  const handleSendMessage = useCallback(async (message: string): Promise<ChatMessage> => {
    const response = await window.electronAPI.sendChat(message);
    if (response.success && response.response) {
      return response.response;
    }
    throw new Error(response.error || 'Chat failed');
  }, []);

  const handleOverride = useCallback(
    async (signals: TrafficLightSignal[], justification: string): Promise<void> => {
      await window.electronAPI.submitOverride({
        signals: signals.map((s) => ({ ruleId: s.ruleId, color: s.color })),
        justification,
      });
      // Clear the traffic light after override
      setState((prev) => ({
        ...prev,
        trafficLightResult: null,
        chatExpanded: false,
      }));
    },
    []
  );

  const handleMinimize = useCallback(() => {
    // Toggling minimize in Console Mode switches to Ghost Mode (Overlay)
    if (viewMode === 'console') {
      setViewMode('ghost');
      // Logic to make window transparent/click-through usually handled by Electron Main
      // We might need to message Main process to change window mode
      // For prototype: We assume the user manually positioned the window or we trigger minimized style
    } else {
      // In Ghost Mode, minimize collapses the pill
      window.electronAPI.toggleMinimize();
      setState((prev) => ({ ...prev, minimized: !prev.minimized }));
    }
  }, [viewMode]);

  const handleReturnToConsole = useCallback(() => {
    setViewMode('console');
    setState(prev => ({ ...prev, minimized: false, chatExpanded: false }));
    // Signal main process to restore focus/opacity if needed
  }, []);

  const handleMouseEnter = useCallback(() => {
    window.electronAPI.setIgnoreMouseEvents(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Only pass clicks through if in Ghost Mode and NOT overlapping interactive elements
    if (viewMode === 'ghost') {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
  }, [viewMode]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Minimized State (Ghost Mode Only)
  if (state.minimized && viewMode === 'ghost') {
    return (
      <div
        className="minimized-container"
        onClick={handleMinimize}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <TrafficLightIndicator
          color={state.trafficLightResult?.color || 'GREEN'}
          isEvaluating={state.isEvaluating}
        />
        {/* Hidden trigger to go back to console */}
        <div
          className="absolute -left-4 top-0 w-4 h-full cursor-pointer opacity-0 hover:opacity-100 bg-black/50 text-white text-[8px] flex items-center justify-center rounded-l"
          onClick={(e) => { e.stopPropagation(); handleReturnToConsole(); }}
          title="Return to Console"
        >
          CLI
        </div>
      </div>
    );
  }

  // 2. Console Mode (Command Center)
  if (viewMode === 'console') {
    return (
      <ConsoleView
        onMinimize={() => setViewMode('ghost')}
        signalsLog={signalsLog}
        connectionStatus={state.connection}
        ruleVersion="1.0.4-rc (Golden Master)"
      />
    );
  }

  // 3. Ghost Mode (Overlay)
  // Dynamic positioning style for overlay
  const containerStyle: React.CSSProperties = {};

  if (state.showOnboarding) {
    containerStyle.position = 'absolute';
    containerStyle.left = '50%';
    containerStyle.top = '50%';
    containerStyle.transform = 'translate(-50%, -50%)';
    containerStyle.bottom = 'auto';
    containerStyle.right = 'auto';
  } else if (state.ehr?.bounds && !state.minimized) {
    containerStyle.position = 'absolute';
    containerStyle.left = state.ehr.bounds.x + state.ehr.bounds.width - 380;
    containerStyle.top = state.ehr.bounds.y + 100;
    containerStyle.bottom = 'auto';
    containerStyle.right = 'auto';
  }

  return (
    <div
      className="app-container"
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >


      {/* Connection Status */}
      <div className={`connection-status status-${state.connection}`}>
        <span className="status-dot" />
        <span className="status-text">
          {state.connection === 'connected' && (state.language === 'pt' ? 'Conectado' : 'Connected')}
          {state.connection === 'degraded' && (state.language === 'pt' ? 'Degradado' : 'Degraded')}
          {state.connection === 'offline' && (state.language === 'pt' ? 'Offline' : 'Offline')}
        </span>

        {/* Quick Switch to Console */}
        <button
          className="ml-2 px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[9px] uppercase tracking-wider text-white/50 hover:text-white transition-colors"
          onClick={handleReturnToConsole}
        >
          HQ
        </button>
      </div>

      {/* Traffic Light Overlay */}
      <TrafficLightOverlay
        status={
          state.trafficLightResult?.color === 'RED' ? 'danger' :
            state.trafficLightResult?.color === 'YELLOW' ? 'caution' :
              'valid'
        }
        confidence={state.trafficLightResult?.totalGlosaRisk ? (100 - (state.trafficLightResult.totalGlosaRisk.probability * 100)) : 100}
        message={
          state.isEvaluating ? 'Evaluating...' :
            state.trafficLightResult?.signals[0]?.message || (state.trafficLightResult?.color === 'GREEN' ? 'No issues detected' : '')
        }
        onExpand={handleChatToggle}
        signals={state.trafficLightResult?.signals}
      />

      {/* Break-Glass Chat */}
      <div className="chat-container">
        <BreakGlassChat
          trafficLightResult={state.trafficLightResult}
          collapsed={!state.chatExpanded}
          onToggle={handleChatToggle}
          onSendMessage={handleSendMessage}
          onOverride={handleOverride}
          language={state.language}
        />
      </div>

      {/* Onboarding Overlay */}
      {state.showOnboarding && (
        <OnboardingOverlay
          language={state.language}
          onComplete={() => {
            localStorage.setItem('cortex_onboarding_completed', 'true');
            setState(prev => ({ ...prev, showOnboarding: false }));
          }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════



interface TrafficLightIndicatorProps {
  color: 'RED' | 'YELLOW' | 'GREEN';
  isEvaluating: boolean;
}

const TrafficLightIndicator: React.FC<TrafficLightIndicatorProps> = ({ color, isEvaluating }) => {
  const colorClasses = {
    RED: 'indicator-red',
    YELLOW: 'indicator-yellow',
    GREEN: 'indicator-green',
  };

  return (
    <div className={`traffic-indicator ${colorClasses[color]} ${isEvaluating ? 'evaluating' : ''}`}>
      <span className="indicator-light" />
    </div>
  );
};

export default App;
