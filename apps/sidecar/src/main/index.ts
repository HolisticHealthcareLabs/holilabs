/**
 * Sidecar Main Process
 *
 * Electron main process for the Clinical Assurance Sidecar.
 * Handles window management, IPC, and native integrations.
 *
 * @module sidecar/main
 */

import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { EHRDetector } from '../fingerprint/ehr-detector';
import { VDIDetector } from '../detection/vdi-detector';
import { AccessibilityReader } from '../accessibility/reader';
import { VisionModule } from '../vision/ocr-module';
import { EdgeNodeClient } from './edge-client';
import { SidecarAPIServer } from '../api/server';
import type {
  InputContext,
  TrafficLightResult,
  EHRFingerprint,
  IPC_CHANNELS,
  ChatMessage,
} from '../types';

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

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW CREATION
// ═══════════════════════════════════════════════════════════════════════════════

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // Position as overlay on the right side of the screen
  const windowWidth = 360;
  const windowHeight = 600;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - 20,
    y: screenHeight - windowHeight - 20,
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
  mainWindow.setIgnoreMouseEvents(false);
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

  tray.setToolTip('Clinical Assurance Sidecar');
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

    return {
      isVDI: vdiResult.isVDI,
      vdiEnvironment: vdiResult.environment,
      ehr: ehrFingerprint,
      connection: connectionStatus,
    };
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

  // Start watching for EHR focus changes
  ehrDetector.startWatching((fingerprint) => {
    mainWindow?.webContents.send('ehr:detected', fingerprint);
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
