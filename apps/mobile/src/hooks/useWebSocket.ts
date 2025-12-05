/**
 * useWebSocket Hook
 *
 * React hook for WebSocket connectivity in mobile app
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import WebSocketService from '../services/websocket';
import { useAuthStore } from '../stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: any) => void;
  onNotification?: (type: string, data: any) => void;
  onPatientUpdate?: (data: any) => void;
  onClinicalNoteUpdate?: (data: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    onMessage,
    onNotification,
    onPatientUpdate,
    onClinicalNoteUpdate,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(WebSocketService.getStatus());
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  // Update connection status
  const updateStatus = useCallback(() => {
    const newStatus = WebSocketService.getStatus();
    setStatus(newStatus);
    setIsConnected(newStatus.connected);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!session?.access_token) {
      console.warn('⚠️ Cannot connect WebSocket: No auth token');
      return;
    }

    try {
      await WebSocketService.connect(session.access_token);
      updateStatus();
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
    }
  }, [session?.access_token, updateStatus]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    WebSocketService.disconnect();
    updateStatus();
  }, [updateStatus]);

  // Setup event handlers
  useEffect(() => {
    WebSocketService.setEventHandlers({
      onNewMessage: (message) => {
        console.log('📨 New message in hook:', message.id);
        onMessage?.(message);

        // Invalidate messages query
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },

      onAppointmentNotification: (data) => {
        console.log('📅 Appointment notification in hook');
        onNotification?.('appointment', data);

        // Invalidate appointments query
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      },

      onMedicationReminder: (data) => {
        console.log('💊 Medication reminder in hook');
        onNotification?.('medication', data);
      },

      onLabResult: (data) => {
        console.log('🧪 Lab result in hook');
        onNotification?.('lab', data);

        // Invalidate lab results query
        queryClient.invalidateQueries({ queryKey: ['labResults'] });
      },

      onPatientUpdated: (data) => {
        console.log('👤 Patient updated in hook:', data.patientId);
        onPatientUpdate?.(data);

        // Invalidate patient queries
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['patient', data.patientId] });
      },

      onClinicalNoteUpdated: (data) => {
        console.log('📝 Clinical note updated in hook:', data.noteId);
        onClinicalNoteUpdate?.(data);

        // Invalidate clinical notes query
        queryClient.invalidateQueries({ queryKey: ['clinicalNotes'] });
        queryClient.invalidateQueries({ queryKey: ['clinicalNote', data.noteId] });
      },
    });
  }, [onMessage, onNotification, onPatientUpdate, onClinicalNoteUpdate, queryClient]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && session?.access_token) {
      connect();
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, session?.access_token]); // Only reconnect if token changes

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground
        console.log('📱 App foregrounded, checking WebSocket...');
        if (!WebSocketService.isConnected() && session?.access_token) {
          connect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to background
        console.log('📱 App backgrounded');
        // Keep connection alive in background for notifications
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [connect, session?.access_token]);

  // Periodic status update
  useEffect(() => {
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [updateStatus]);

  return {
    // Connection state
    isConnected,
    status,

    // Connection controls
    connect,
    disconnect,

    // Convenience methods
    emit: WebSocketService.emit.bind(WebSocketService),
    joinConversation: WebSocketService.joinConversation.bind(WebSocketService),
    leaveConversation: WebSocketService.leaveConversation.bind(WebSocketService),
    startTyping: WebSocketService.startTyping.bind(WebSocketService),
    stopTyping: WebSocketService.stopTyping.bind(WebSocketService),
    markMessageRead: WebSocketService.markMessageRead.bind(WebSocketService),
    joinCoPilotSession: WebSocketService.joinCoPilotSession.bind(WebSocketService),
    leaveCoPilotSession: WebSocketService.leaveCoPilotSession.bind(WebSocketService),
    sendAudioChunk: WebSocketService.sendAudioChunk.bind(WebSocketService),

    // Socket instance
    socket: WebSocketService.getSocket(),
  };
}

/**
 * Hook for conversation-specific WebSocket features
 */
export function useConversationWebSocket(conversationId: string | null) {
  const { isConnected, joinConversation, leaveConversation, startTyping, stopTyping } = useWebSocket({
    autoConnect: true,
  });

  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Join/leave conversation room
  useEffect(() => {
    if (isConnected && conversationId) {
      joinConversation(conversationId);

      return () => {
        leaveConversation(conversationId);
      };
    }
  }, [isConnected, conversationId, joinConversation, leaveConversation]);

  // Handle typing indicator
  const handleStartTyping = useCallback((userId: string, userName: string) => {
    if (!conversationId) return;

    startTyping(conversationId, userId, userName);
    setIsTyping(true);

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping(userId);
    }, 3000);
  }, [conversationId, startTyping]);

  const handleStopTyping = useCallback((userId: string) => {
    if (!conversationId) return;

    stopTyping(conversationId, userId);
    setIsTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [conversationId, stopTyping]);

  // Listen for other users typing
  useEffect(() => {
    WebSocketService.setEventHandlers({
      onUserTyping: (data) => {
        if (data.conversationId === conversationId) {
          setTypingUsers((prev) => [...new Set([...prev, data.userId])]);

          // Remove typing indicator after 5 seconds
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
          }, 5000);
        }
      },
      onUserStoppedTyping: (data) => {
        if (data.conversationId === conversationId) {
          setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
        }
      },
    });
  }, [conversationId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isTyping,
    typingUsers,
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
  };
}

/**
 * Hook for Co-Pilot WebSocket features
 */
export function useCoPilotWebSocket(sessionId: string | null) {
  const { isConnected, joinCoPilotSession, leaveCoPilotSession, sendAudioChunk } = useWebSocket({
    autoConnect: true,
  });

  const [isSessionActive, setIsSessionActive] = useState(false);

  // Join/leave Co-Pilot session
  useEffect(() => {
    if (isConnected && sessionId) {
      joinCoPilotSession(sessionId);
      setIsSessionActive(true);

      return () => {
        leaveCoPilotSession(sessionId);
        setIsSessionActive(false);
      };
    }
  }, [isConnected, sessionId, joinCoPilotSession, leaveCoPilotSession]);

  // Send audio chunk
  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (sessionId && isSessionActive) {
      sendAudioChunk(sessionId, audioData);
    }
  }, [sessionId, isSessionActive, sendAudioChunk]);

  return {
    isConnected,
    isSessionActive,
    sendAudio,
  };
}
