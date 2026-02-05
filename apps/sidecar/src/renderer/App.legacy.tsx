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

  if (state.showOnboarding) {
    containerStyle.position = 'absolute';
    containerStyle.left = '50%';
    containerStyle.top = '50%';
    containerStyle.transform = 'translate(-50%, -50%)';
    containerStyle.bottom = 'auto';
    containerStyle.right = 'auto';
  } else if (state.ehr?.bounds && !state.minimized) {
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
