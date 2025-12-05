/**
 * WebSocket Status Indicator
 *
 * Visual indicator showing WebSocket connection status
 * Can be added to any screen for debugging or user feedback
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWebSocketContext } from '../providers/WebSocketProvider';

interface WebSocketStatusProps {
  minimal?: boolean; // Show minimal version (just indicator dot)
  onPress?: () => void;
}

export function WebSocketStatus({ minimal = false, onPress }: WebSocketStatusProps) {
  const { isConnected, status } = useWebSocketContext();

  if (minimal) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.minimalContainer}>
        <View style={[styles.dot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={[styles.indicator, isConnected ? styles.connected : styles.disconnected]}>
        <View style={[styles.dot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
        <Text style={styles.text}>
          {isConnected ? '✓ Connected' : '○ Disconnected'}
        </Text>
      </View>
      {!isConnected && status.queuedMessages > 0 && (
        <Text style={styles.queuedText}>
          {status.queuedMessages} message{status.queuedMessages > 1 ? 's' : ''} queued
        </Text>
      )}
      {!isConnected && status.reconnectAttempts > 0 && (
        <Text style={styles.reconnectText}>
          Reconnecting... (attempt {status.reconnectAttempts})
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  minimalContainer: {
    padding: 4,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connected: {},
  disconnected: {},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: {
    backgroundColor: '#10B981', // Green
  },
  dotDisconnected: {
    backgroundColor: '#EF4444', // Red
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  queuedText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 16,
  },
  reconnectText: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
    marginLeft: 16,
  },
});
