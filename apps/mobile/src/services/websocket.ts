/**
 * WebSocket Service for React Native Mobile App
 *
 * Provides real-time bidirectional communication with Socket.IO
 * Features:
 * - Authentication with JWT tokens
 * - Automatic reconnection
 * - Offline message queuing
 * - Network state monitoring
 * - Event handlers for all real-time features
 */

import { io, Socket } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000';
const STORAGE_KEY = 'ws_message_queue';

interface QueuedMessage {
  event: string;
  data: any;
  timestamp: number;
}

interface WebSocketEventHandlers {
  onNewMessage?: (message: any) => void;
  onAppointmentNotification?: (data: any) => void;
  onMedicationReminder?: (data: any) => void;
  onLabResult?: (data: any) => void;
  onPatientUpdated?: (data: any) => void;
  onClinicalNoteUpdated?: (data: any) => void;
  onUserTyping?: (data: any) => void;
  onUserStoppedTyping?: (data: any) => void;
  onMessageRead?: (data: any) => void;
  onUserOnline?: (data: any) => void;
  onUserOffline?: (data: any) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private messageQueue: QueuedMessage[] = [];
  private eventHandlers: WebSocketEventHandlers = {};
  private isConnecting = false;

  constructor() {
    this.loadQueueFromStorage();
    this.setupNetworkListener();
  }

  /**
   * Connect to WebSocket server with authentication
   */
  async connect(authToken: string): Promise<Socket> {
    if (this.socket?.connected) {
      console.log('✅ WebSocket already connected');
      return this.socket;
    }

    if (this.isConnecting) {
      console.log('⏳ WebSocket connection in progress...');
      // Wait for connection
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkInterval);
            resolve(this.socket);
          } else if (!this.isConnecting) {
            clearInterval(checkInterval);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    try {
      // Convert http/https to ws/wss
      const wsUrl = API_URL.replace(/^http/, 'ws');

      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

      this.socket = io(wsUrl, {
        path: '/api/socket',
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      this.setupEventListeners();
      this.isConnecting = false;

      return this.socket;
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ WebSocket connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ WebSocket connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Chat events
    this.socket.on('new_message', (message) => {
      console.log('📨 New message received:', message.id);
      this.eventHandlers.onNewMessage?.(message);
    });

    this.socket.on('message_received', (message) => {
      console.log('📬 Message received in conversation:', message.conversationId);
      this.eventHandlers.onNewMessage?.(message);
    });

    this.socket.on('user_typing', (data) => {
      this.eventHandlers.onUserTyping?.(data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.eventHandlers.onUserStoppedTyping?.(data);
    });

    this.socket.on('message_read_receipt', (data) => {
      this.eventHandlers.onMessageRead?.(data);
    });

    // Notification events
    this.socket.on('notification:appointment', (data) => {
      console.log('📅 Appointment notification:', data);
      this.eventHandlers.onAppointmentNotification?.(data);
    });

    this.socket.on('notification:medication', (data) => {
      console.log('💊 Medication reminder:', data);
      this.eventHandlers.onMedicationReminder?.(data);
    });

    this.socket.on('notification:lab', (data) => {
      console.log('🧪 Lab result notification:', data);
      this.eventHandlers.onLabResult?.(data);
    });

    // Data sync events
    this.socket.on('patient_updated', (data) => {
      console.log('👤 Patient updated:', data.patientId);
      this.eventHandlers.onPatientUpdated?.(data);
    });

    this.socket.on('clinical_note_updated', (data) => {
      console.log('📝 Clinical note updated:', data.noteId);
      this.eventHandlers.onClinicalNoteUpdated?.(data);
    });

    // Presence events
    this.socket.on('user_online', (data) => {
      console.log('🟢 User online:', data.userId);
      this.eventHandlers.onUserOnline?.(data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('⚫ User offline:', data.userId);
      this.eventHandlers.onUserOffline?.(data);
    });
  }

  /**
   * Setup network state monitoring
   */
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.socket?.connected && !this.isConnecting) {
        console.log('📶 Network restored, attempting to reconnect...');
        // Socket.IO will auto-reconnect
      } else if (!state.isConnected) {
        console.log('📵 Network disconnected');
      }
    });
  }

  /**
   * Emit event to server (with offline queueing)
   */
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      console.log(`📤 Emitted: ${event}`);
    } else {
      console.log(`📥 Queued for later: ${event}`);
      this.queueMessage(event, data);
    }
  }

  /**
   * Queue message for when connection is restored
   */
  private queueMessage(event: string, data: any) {
    this.messageQueue.push({
      event,
      data,
      timestamp: Date.now(),
    });

    this.saveQueueToStorage();
  }

  /**
   * Flush queued messages when connection restored
   */
  private async flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Flushing ${this.messageQueue.length} queued messages`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const { event, data } of queue) {
      this.socket?.emit(event, data);
    }

    await this.clearQueueFromStorage();
  }

  /**
   * Save message queue to AsyncStorage
   */
  private async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  /**
   * Load message queue from AsyncStorage
   */
  private async loadQueueFromStorage() {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEY);
      if (queueData) {
        this.messageQueue = JSON.parse(queueData);
        console.log(`📥 Loaded ${this.messageQueue.length} queued messages`);
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
    }
  }

  /**
   * Clear message queue from AsyncStorage
   */
  private async clearQueueFromStorage() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear message queue:', error);
    }
  }

  /**
   * Register event handlers
   */
  setEventHandlers(handlers: WebSocketEventHandlers) {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string) {
    this.emit('join_conversation', { conversationId });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    this.emit('leave_conversation', { conversationId });
  }

  /**
   * Send typing indicator
   */
  startTyping(conversationId: string, userId: string, userName: string) {
    this.emit('typing_start', { conversationId, userId, userName });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string, userId: string) {
    this.emit('typing_stop', { conversationId, userId });
  }

  /**
   * Mark message as read
   */
  markMessageRead(messageId: string, userId: string) {
    this.emit('message_read', { messageId, userId });
  }

  /**
   * Join Co-Pilot session
   */
  joinCoPilotSession(sessionId: string) {
    this.emit('co_pilot:join_session', { sessionId });
  }

  /**
   * Leave Co-Pilot session
   */
  leaveCoPilotSession(sessionId: string) {
    this.emit('co_pilot:leave_session', { sessionId });
  }

  /**
   * Send audio chunk for Co-Pilot
   */
  sendAudioChunk(sessionId: string, audioData: ArrayBuffer) {
    this.emit('co_pilot:audio_chunk', { sessionId, audioData });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
      console.log('👋 WebSocket disconnected');
    }
    this.socket = null;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the Socket.IO instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.socket?.connected ?? false,
      id: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }
}

// Export singleton instance
export default new WebSocketService();
