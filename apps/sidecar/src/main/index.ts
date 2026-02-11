/**
 * Sidecar Main Process
 *
 * Electron main process for the Clinical Assurance Sidecar.
 * Handles window management, IPC, and native integrations.
 *
 * @module sidecar/main
 */

import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import path from 'path';
import { EHRDetector } from '../fingerprint/ehr-detector';
import { VDIDetector } from '../detection/vdi-detector';
import { PermissionGuard } from './permissions';
import { AccessibilityReader } from '../accessibility/reader';
import { VisionModule } from '../vision/ocr-module';
import { EdgeNodeClient } from './edge-client';
import { SidecarAPIServer } from '../api/server';
import { ControlPlaneClient } from './control-plane';
import type {
  InputContext,
  TrafficLightResult,
  EHRFingerprint,
  IPC_CHANNELS,
  ChatMessage,
} from '../types';
import { initAutoUpdater } from './auto-updater';
import { ResourceGuard, ResourceState } from './resource-guard';
// import { EphemeralAudioProcessor } from '../audio/ephemeral-processor';
// import { DeepgramService } from '../audio/deepgram-service';
import { InputInjector } from './input-injector';

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBALS
// ═══════════════════════════════════════════════════════════════════════════════

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const ehrDetector = new EHRDetector();
const vdiDetector = new VDIDetector();
const accessibilityReader = new AccessibilityReader();
const visionModule = new VisionModule();
const edgeClient = new EdgeNodeClient();
const apiServer = new SidecarAPIServer(3002);
const controlPlane = new ControlPlaneClient();

async function ensureRequiredMacPermissions(): Promise<void> {
  if (process.platform !== 'darwin') return;
  const screenPermission = await PermissionGuard.getScreenRecordingStatus();
  const accessibilityPermission = await PermissionGuard.getAccessibilityStatus();

  const ok = screenPermission === 'granted' && accessibilityPermission === true;
  if (!ok) {
    mainWindow?.webContents.send('permissions:required', {
      screen: screenPermission,
      accessibility: accessibilityPermission,
    });
    const err = new Error('PERMISSIONS_REQUIRED');
    (err as any).code = 'PERMISSIONS_REQUIRED';
    (err as any).permissions = { screen: screenPermission, accessibility: accessibilityPermission };
    throw err;
  }
}

// Scribe Infrastructure (DEPRECATED - STRATEGY PIVOT)
const resourceGuard = new ResourceGuard();
// const audioProcessor = new EphemeralAudioProcessor();
// const deepgramService = new DeepgramService(process.env.DEEPGRAM_API_KEY || '');

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW CREATION
// ═══════════════════════════════════════════════════════════════════════════════

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // Full screen transparent overlay
  // const windowWidth = 360;
  // const windowHeight = 600;

  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Make window click-through when minimized
  // Initial state: Click-through (ignore mouse events)
  // Renderer will request capture when hovering over interactive elements
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
}

function createTray(): void {
  // Create tray icon
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Sidecar',
      click: () => {
        mainWindow?.show();
        mainWindow?.setIgnoreMouseEvents(false);
      },
    },
    {
      label: 'Minimize',
      click: () => {
        mainWindow?.setIgnoreMouseEvents(true, { forward: true });
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        // TODO: Open settings window
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Cortex Assurance');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT CAPTURE
// ═══════════════════════════════════════════════════════════════════════════════

async function captureInputContext(): Promise<InputContext> {
  const startTime = Date.now();

  // Gate: on macOS we require Screen Recording + Accessibility before capture.
  await ensureRequiredMacPermissions();

  // Step 1: Check for VDI environment FIRST
  const vdiResult = await vdiDetector.detect();

  if (vdiResult.isVDI) {
    // VDI detected - Accessibility APIs will see nothing
    // Go directly to Computer Vision (OCR)
    console.info('VDI environment detected, using Vision Module');

    const ocrResult = await visionModule.captureWithOCR();
    return {
      source: 'vision',
      capturedAt: new Date(),
      latencyMs: Date.now() - startTime,
      ...ocrResult,
    };
  }

  // Step 2: Detect EHR and load appropriate mapping
  const ehrFingerprint = await ehrDetector.fingerprint();

  // Step 3: Try accessibility for native desktop apps
  const accessibilityResult = await accessibilityReader.capture(ehrFingerprint);

  if (accessibilityResult.text || accessibilityResult.formFields) {
    return {
      source: 'accessibility',
      capturedAt: new Date(),
      latencyMs: Date.now() - startTime,
      ehrFingerprint,
      ...accessibilityResult,
    };
  }

  // Step 4: Fallback to OCR if accessibility returns null (opaque window)
  console.warn('Accessibility returned null, falling back to OCR');
  const ocrResult = await visionModule.captureWithOCR();

  return {
    source: 'vision',
    capturedAt: new Date(),
    latencyMs: Date.now() - startTime,
    ehrFingerprint,
    ...ocrResult,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

function setupIPC(): void {
  // Evaluate current context
  ipcMain.handle('evaluate:context', async () => {
    try {
      const inputContext = await captureInputContext();

      // Send to edge node for evaluation
      const result = await edgeClient.evaluate(inputContext);

      // Notify renderer
      mainWindow?.webContents.send('traffic-light:result', result);

      return { success: true, result };
    } catch (error) {
      console.error('Evaluation failed:', error);
      if ((error as any)?.code === 'PERMISSIONS_REQUIRED' || (error as any)?.message === 'PERMISSIONS_REQUIRED') {
        return { success: false, error: 'PERMISSIONS_REQUIRED' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Submit override
  ipcMain.handle('submit:override', async (_event, args: {
    signals: Array<{ ruleId: string; color: string }>;
    justification: string;
    supervisorId?: string;
  }) => {
    try {
      const result = await edgeClient.submitOverride(args);
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Send chat message
  ipcMain.handle('chat:send', async (_event, message: string) => {
    try {
      const response = await edgeClient.sendChatMessage(message);
      return { success: true, response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get status
  ipcMain.handle('get:status', async () => {
    const vdiResult = await vdiDetector.detect();
    const ehrFingerprint = await ehrDetector.fingerprint();
    const connectionStatus = edgeClient.getStatus();
    const screenPermission = await PermissionGuard.getScreenRecordingStatus();
    const accessibilityPermission = await PermissionGuard.getAccessibilityStatus();

    return {
      isVDI: vdiResult.isVDI,
      vdiEnvironment: vdiResult.environment,
      ehr: ehrFingerprint,
      connection: connectionStatus,
      permissions: {
        screen: screenPermission,
        accessibility: accessibilityPermission
      }
    };
  });

  // Permissions helpers (macOS)
  ipcMain.handle('permissions:get', async () => {
    return {
      platform: process.platform,
      screen: await PermissionGuard.getScreenRecordingStatus(),
      accessibility: await PermissionGuard.getAccessibilityStatus(),
    };
  });

  ipcMain.handle('permissions:requestAccessibility', async () => {
    const ok = await PermissionGuard.requestAccessibility();
    return { ok, accessibility: await PermissionGuard.getAccessibilityStatus() };
  });

  ipcMain.handle('permissions:requestScreenRecording', async () => {
    const ok = await PermissionGuard.requestScreenRecording();
    return { ok, screen: await PermissionGuard.getScreenRecordingStatus() };
  });

  ipcMain.handle('permissions:openAccessibilitySettings', async () => {
    await PermissionGuard.openAccessibilitySettings();
    return { ok: true };
  });

  ipcMain.handle('permissions:openScreenRecordingSettings', async () => {
    await PermissionGuard.openScreenRecordingSettings();
    return { ok: true };
  });

  // Toggle minimize
  ipcMain.on('toggle:minimize', () => {
    if (mainWindow) {
      const isMinimized = mainWindow.isMinimized();
      if (isMinimized) {
        mainWindow.restore();
        mainWindow.setIgnoreMouseEvents(false);
      } else {
        mainWindow.minimize();
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
      }
    }
  });

  // Mouse event management (Renderer controls this based on hover)
  ipcMain.on('window:set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setIgnoreMouseEvents(ignore, options);
  });

  // Ghost Visibility
  ipcMain.on('ghost:show', () => {
    mainWindow?.show();
  });

  ipcMain.on('ghost:hide', () => {
    mainWindow?.hide();
  });

  // Input Injection
  const inputInjector = new InputInjector();
  ipcMain.handle('input:inject', async (_event, text: string) => {
    try {
      // 1. Hide sidecar temporarily to ensure focus returns to EHR
      // mainWindow?.hide(); 
      // Actually, standard behavior for "alwaysOnTop" overlay is simpler:
      // If we are "ignoring mouse events" (click-through), the focus *should* be on the EHR.
      // But if the user clicked a button on the Sidecar, Sidecar has focus.

      // So we need to:
      // 1. Return focus to previous window (EHR)
      // 2. Inject text

      if (mainWindow) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
        mainWindow.blur(); // Try to blur to restore focus

        // On macOS, we might need to actively hide-show or use AppleScript to activate previous app
        // For now, let's rely on the user clicking the specific "Apply" button which triggers this.
      }

      await inputInjector.injectText(text);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown injection error'
      };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCRIBE IPC (PHASE 9) - DEPRECATED
  // ═══════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('scribe:toggle', async (_event, action: 'start' | 'stop') => {
    console.warn('[Scribe] Component deprecated. No-op.');
    return { success: false, error: 'Audio Scribe Deprecated' };
  });

  // Receive audio chunks from Renderer (captured via Web Audio API)
  ipcMain.on('scribe:audio-chunk', (_event, buffer: ArrayBuffer) => {
    // No-op - Audio ignored in Visual-Only architecture
  });

  ipcMain.handle('scribe:get-resource-state', () => {
    return resourceGuard.getLastState();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API SERVER SETUP
// ═══════════════════════════════════════════════════════════════════════════════

async function setupAPIServer(): Promise<void> {
  // Register context handler
  apiServer.onContext(async (ctx) => {
    console.info('Received context from API:', ctx.source);
    // Store context for RLHF capture
    mainWindow?.webContents.send('context:received', ctx);
  });

  // Register evaluate handler
  apiServer.onEvaluate(async (req) => {
    const inputContext = await captureInputContext();

    // Merge with request payload
    const evaluationContext = {
      ...inputContext,
      patientId: req.patientId,
      encounterId: req.encounterId,
      action: req.action,
      payload: req.payload,
      inputContextSnapshot: req.inputContextSnapshot,
    };

    // Send to edge node for evaluation
    const result = await edgeClient.evaluate(evaluationContext);

    // Notify renderer
    mainWindow?.webContents.send('traffic-light:result', result);

    return result;
  });

  // Register decision handler
  apiServer.onDecision(async (req) => {
    await edgeClient.submitOverride({
      signals: req.signals || [],
      justification: req.reason || '',
      assuranceEventId: req.assuranceEventId,
    });

    // Notify renderer
    mainWindow?.webContents.send('decision:recorded', {
      eventId: req.assuranceEventId,
      override: req.override,
    });
  });

  // Register chat handler
  apiServer.onChat(async (req): Promise<ChatMessage> => {
    const response = await edgeClient.sendChatMessage(req.message);

    return {
      id: `response-${Date.now()}`,
      role: 'assistant',
      content: response.content || 'Unable to process request',
      timestamp: new Date(),
      citations: response.citations,
    };
  });

  // Register status handler
  apiServer.onStatus(async () => {
    const vdiResult = await vdiDetector.detect();
    const ehrFingerprint = await ehrDetector.fingerprint();
    const connectionStatus = edgeClient.getStatus();
    const rules = await edgeClient.getRules();

    // Calculate staleness
    const ruleTimestamp = rules?.timestamp ? new Date(rules.timestamp) : new Date();
    const hoursSinceUpdate = (Date.now() - ruleTimestamp.getTime()) / (1000 * 60 * 60);
    const isStale = hoursSinceUpdate > 48;
    const isCritical = hoursSinceUpdate > 168; // 7 days

    let stalenessWarning: string | undefined;
    if (isCritical) {
      stalenessWarning = `Rules critically outdated (${Math.floor(hoursSinceUpdate / 24)} days) - Contact IT immediately`;
    } else if (isStale) {
      stalenessWarning = `Rules may be outdated (${Math.floor(hoursSinceUpdate)}h old) - Contact IT`;
    }

    return {
      status: connectionStatus === 'connected' ? 'healthy' : 'degraded',
      edgeConnection: connectionStatus,
      ruleVersion: {
        version: rules?.version || 'unknown',
        timestamp: ruleTimestamp,
        isStale,
        stalenessWarning,
      },
      lastSync: edgeClient.getLastSync(),
      ehrDetected: ehrFingerprint.ehrName !== 'unknown' ? {
        name: ehrFingerprint.ehrName,
        version: ehrFingerprint.version,
      } : null,
      vdiEnvironment: vdiResult.isVDI ? vdiResult.environment : null,
    };
  });

  // Start the server
  await apiServer.start();
  console.info('Sidecar API server started');
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

app.whenReady().then(async () => {
  createWindow();
  createTray();
  setupIPC();

  // Start edge node connection
  edgeClient.connect();

  // Start API server for local communication
  await setupAPIServer();

  // Initialize auto-updater (silent)
  initAutoUpdater();

  // Control Plane heartbeats (org/workspace telemetry)
  await controlPlane.start();

  // Initialize Resource Guard (Phase 9)
  resourceGuard.startMonitoring();
  resourceGuard.on('resource-update', (metrics) => {
    mainWindow?.webContents.send('scribe:resource-update', metrics);
  });
  resourceGuard.on('state-change', (state) => {
    // If state goes Red, we might technically want to switch active stream to cloud
    // But for simplicity, we let the frontend or next 'start' call handle it.
    mainWindow?.webContents.send('scribe:resource-state-change', state);
  });

  // Wire up Deepgram events to Renderer
  // deepgramService.on('transcript', (data) => {
  //   mainWindow?.webContents.send('scribe:transcript', data);
  // });

  // Start watching for EHR focus changes
  ehrDetector.startWatching((fingerprint) => {
    mainWindow?.webContents.send('ehr:detected', fingerprint);
  });

  // Register Panic Button (Safety Valve)
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    console.log('Safety Valve triggered!');
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Force click-through and hide
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      mainWindow.hide();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  edgeClient.disconnect();
  ehrDetector.stopWatching();
  resourceGuard.stopMonitoring();
  controlPlane.stop();
  // audioProcessor.wipe(); // Ensure clean exit
  // deepgramService.disconnect();
  await apiServer.stop();
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
