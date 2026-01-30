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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Fetch initial status
  useEffect(() => {
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
        // Auto-expand chat if we hit a blockage
        chatExpanded: result.needsChatAssistance || prev.chatExpanded,
      }));
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
  }, []);

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



  const handleApplyCorrection = useCallback(async (text: string) => {
    try {
      await window.electronAPI.injectText(text);
    } catch (error) {
      console.error('Failed to inject text:', error);
    }
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
    window.electronAPI.toggleMinimize();
    setState((prev) => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  const handleLanguageToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      language: prev.language === 'en' ? 'pt' : 'en',
    }));
  }, []);

  const handleMouseEnter = useCallback(() => {
    window.electronAPI.setIgnoreMouseEvents(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // Minimized state - just show traffic light indicator
  if (state.minimized) {
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
      </div>
    );
  }

  // Dynamic positioning style
  const containerStyle: React.CSSProperties = {};

  if (state.ehr?.bounds && !state.minimized) {
    // Magnetic Snap: Position relative to EHR window
    // Default: Bottom-Right of the EHR window
    // Bounds are screen coordinates.
    // Since mainWindow is full screen (0,0), absolute positioning works directly.
    containerStyle.position = 'absolute';
    containerStyle.left = state.ehr.bounds.x + state.ehr.bounds.width - 380; // Align right edge (360 + 20 margin)
    containerStyle.top = state.ehr.bounds.y + 100; // Offset from top
    containerStyle.bottom = 'auto'; // Override css
    containerStyle.right = 'auto'; // Override css
  }

  return (
    <div
      className="app-container"
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header with Cortex Assurance branding */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">
            <CortexLogo />
          </div>
          <div className="brand-text">
            <h1>Cortex Assurance</h1>
            <span className="tagline">
              {state.language === 'pt' ? 'Garantia Clínica' : 'Clinical Assurance'}
            </span>
          </div>
        </div>
        <div className="header-controls">
          <button
            className="control-button"
            onClick={handleLanguageToggle}
            title="Toggle language"
          >
            {state.language.toUpperCase()}
          </button>
          <button className="control-button" onClick={handleMinimize} title="Minimize">
            −
          </button>
        </div>
      </header>

      {/* Connection Status */}
      <div className={`connection-status status-${state.connection}`}>
        <span className="status-dot" />
        <span className="status-text">
          {state.connection === 'connected' && (state.language === 'pt' ? 'Conectado' : 'Connected')}
          {state.connection === 'degraded' && (state.language === 'pt' ? 'Degradado' : 'Degraded')}
          {state.connection === 'offline' && (state.language === 'pt' ? 'Offline' : 'Offline')}
        </span>
        {state.ehr && state.ehr.ehrName !== 'unknown' && (
          <span className="ehr-badge">
            {state.ehr.ehrName.toUpperCase()} {state.ehr.version && `v${state.ehr.version}`}
          </span>
        )}
        {state.isVDI && <span className="vdi-badge">VDI</span>}
      </div>

      {/* Traffic Light Overlay */}
      <TrafficLightOverlay
        result={state.trafficLightResult}
        isEvaluating={state.isEvaluating}
        onEvaluate={handleEvaluate}
        onApplyCorrection={handleApplyCorrection}
        language={state.language}
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
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const CortexLogo: React.FC = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
    <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
    <path
      d="M20 8 L20 32 M12 14 L28 14 M12 20 L28 20 M12 26 L28 26"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="20" cy="20" r="4" fill="currentColor" />
  </svg>
);

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
