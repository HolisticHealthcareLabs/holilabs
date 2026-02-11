/**
 * Sidecar Preload Script
 *
 * Secure bridge between main and renderer processes.
 * Exposes limited IPC methods via contextBridge.
 *
 * @module sidecar/preload
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { TrafficLightResult, ChatMessage, EHRFingerprint } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// API EXPOSED TO RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

const electronAPI = {
  // Evaluate current screen context
  evaluateContext: (): Promise<{ success: boolean; result?: TrafficLightResult; error?: string }> =>
    ipcRenderer.invoke('evaluate:context'),

  // Submit override decision
  submitOverride: (args: {
    signals: Array<{ ruleId: string; color: string }>;
    justification: string;
    supervisorId?: string;
  }): Promise<{ success: boolean; result?: unknown; error?: string }> =>
    ipcRenderer.invoke('submit:override', args),

  // Send chat message
  sendChat: (message: string): Promise<{ success: boolean; response?: ChatMessage; error?: string }> =>
    ipcRenderer.invoke('chat:send', message),

  // Get current status
  getStatus: (): Promise<{
    isVDI: boolean;
    vdiEnvironment: string | null;
    ehr: EHRFingerprint;
    connection: 'connected' | 'degraded' | 'offline';
    permissions: {
      screen: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
      accessibility: boolean;
    };
  }> => ipcRenderer.invoke('get:status'),

  // Permissions (macOS)
  getPermissions: (): Promise<{
    platform: string;
    screen: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
    accessibility: boolean;
  }> => ipcRenderer.invoke('permissions:get'),

  requestAccessibility: (): Promise<{ ok: boolean; accessibility: boolean }> =>
    ipcRenderer.invoke('permissions:requestAccessibility'),

  requestScreenRecording: (): Promise<{
    ok: boolean;
    screen: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
  }> => ipcRenderer.invoke('permissions:requestScreenRecording'),

  openAccessibilitySettings: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('permissions:openAccessibilitySettings'),

  openScreenRecordingSettings: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('permissions:openScreenRecordingSettings'),

  // Toggle minimize state
  toggleMinimize: (): void => ipcRenderer.send('toggle:minimize'),

  // Mouse event management
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }): void =>
    ipcRenderer.send('window:set-ignore-mouse-events', ignore, options),

  // Input Injection
  injectText: (text: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('input:inject', text),

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS (Main → Renderer)
  // ═══════════════════════════════════════════════════════════════════════════

  onTrafficLightResult: (callback: (result: TrafficLightResult) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: TrafficLightResult) => callback(result);
    ipcRenderer.on('traffic-light:result', listener);
    return () => ipcRenderer.removeListener('traffic-light:result', listener);
  },

  onEHRDetected: (callback: (fingerprint: EHRFingerprint) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, fingerprint: EHRFingerprint) => callback(fingerprint);
    ipcRenderer.on('ehr:detected', listener);
    return () => ipcRenderer.removeListener('ehr:detected', listener);
  },

  onConnectionStatus: (callback: (status: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: string) => callback(status);
    ipcRenderer.on('connection:status', listener);
    return () => ipcRenderer.removeListener('connection:status', listener);
  },

  onContextReceived: (callback: (context: unknown) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, context: unknown) => callback(context);
    ipcRenderer.on('context:received', listener);
    return () => ipcRenderer.removeListener('context:received', listener);
  },

  onDecisionRecorded: (callback: (data: { eventId: string; override: boolean }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { eventId: string; override: boolean }) =>
      callback(data);
    ipcRenderer.on('decision:recorded', listener);
    return () => ipcRenderer.removeListener('decision:recorded', listener);
  },

  onPermissionsRequired: (
    callback: (data: { screen: string; accessibility: boolean }) => void
  ): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { screen: string; accessibility: boolean }) =>
      callback(data);
    ipcRenderer.on('permissions:required', listener);
    return () => ipcRenderer.removeListener('permissions:required', listener);
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type augmentation for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
