/**
 * WebSocket Provider
 *
 * Manages global WebSocket connection and provides context to the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import WebSocketService from '../services/websocket';
import { useQueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';

interface WebSocketContextValue {
  isConnected: boolean;
  status: {
    connected: boolean;
    id?: string;
    reconnectAttempts: number;
    queuedMessages: number;
  };
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(WebSocketService.getStatus());
  const { tokens, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const newStatus = WebSocketService.getStatus();
      setStatus(newStatus);
      setIsConnected(newStatus.connected);
    };

    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Setup event handlers
  useEffect(() => {
    WebSocketService.setEventHandlers({
      onNewMessage: (message) => {
        console.log('📨 [Provider] New message:', message.id);
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },

      onAppointmentNotification: (data) => {
        console.log('📅 [Provider] Appointment notification');
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      },

      onMedicationReminder: (data) => {
        console.log('💊 [Provider] Medication reminder');
      },

      onLabResult: (data) => {
        console.log('🧪 [Provider] Lab result');
        queryClient.invalidateQueries({ queryKey: ['labResults'] });
      },

      onPatientUpdated: (data) => {
        console.log('👤 [Provider] Patient updated:', data.patientId);
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['patient', data.patientId] });
      },

      onClinicalNoteUpdated: (data) => {
        console.log('📝 [Provider] Clinical note updated:', data.noteId);
        queryClient.invalidateQueries({ queryKey: ['clinicalNotes'] });
        queryClient.invalidateQueries({ queryKey: ['clinicalNote', data.noteId] });
      },

      onUserOnline: (data) => {
        console.log('🟢 [Provider] User online:', data.userId);
      },

      onUserOffline: (data) => {
        console.log('⚫ [Provider] User offline:', data.userId);
      },
    });
  }, [queryClient]);

  // Auto-connect when authenticated
  const connect = async () => {
    if (!tokens?.access_token) {
      console.warn('⚠️ [Provider] Cannot connect: No access token');
      return;
    }

    try {
      console.log('🔌 [Provider] Connecting WebSocket...');
      await WebSocketService.connect(tokens.access_token);
      const newStatus = WebSocketService.getStatus();
      setStatus(newStatus);
      setIsConnected(newStatus.connected);
      console.log('✅ [Provider] WebSocket connected');
    } catch (error) {
      console.error('❌ [Provider] WebSocket connection failed:', error);
    }
  };

  const disconnect = () => {
    console.log('👋 [Provider] Disconnecting WebSocket');
    WebSocketService.disconnect();
    const newStatus = WebSocketService.getStatus();
    setStatus(newStatus);
    setIsConnected(newStatus.connected);
  };

  // Connect on auth
  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      // Don't disconnect on unmount, only on logout
    };
  }, [isAuthenticated, tokens?.access_token]);

  // Handle app state changes
  useEffect(() => {
    let appState = AppState.currentState;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('📱 [Provider] App foregrounded');
        if (!WebSocketService.isConnected() && isAuthenticated && tokens?.access_token) {
          connect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        console.log('📱 [Provider] App backgrounded');
        // Keep connection for push notifications
      }

      appState = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, tokens?.access_token]);

  const value: WebSocketContextValue = {
    isConnected,
    status,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
