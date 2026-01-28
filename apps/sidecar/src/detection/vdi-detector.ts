/**
 * VDI Detector
 *
 * Detects Virtual Desktop Infrastructure (VDI) environments.
 * When VDI is detected, accessibility APIs are bypassed in favor of OCR.
 *
 * Supported VDI environments:
 * - Citrix (Receiver, Workspace)
 * - Microsoft Remote Desktop (MSTSC)
 * - VMware Horizon
 * - Amazon WorkSpaces
 *
 * CRITICAL: In VDI environments, accessibility APIs cannot penetrate
 * the virtual window. The EHR appears as one giant video stream.
 *
 * @module sidecar/detection/vdi-detector
 */

import type { VDIDetectionResult, VDIEnvironment } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// VDI SIGNATURES
// ═══════════════════════════════════════════════════════════════════════════════

interface VDISignature {
  environment: VDIEnvironment;
  windowClasses: string[];
  processNames: string[];
  windowTitlePatterns: RegExp[];
}

const VDI_SIGNATURES: VDISignature[] = [
  {
    environment: 'citrix',
    windowClasses: [
      'CitrixReceiver',
      'Citrix.ICAClient',
      'ICAClient',
      'CWAReceiver',
      'Citrix Workspace',
      'CtxICADisp',
      'CtxMod',
    ],
    processNames: [
      'wfica32.exe',
      'receiver.exe',
      'selfservice.exe',
      'concentr.exe',
      'CDViewer.exe',
      'AuthManSvr.exe',
    ],
    windowTitlePatterns: [
      /Citrix\s+Receiver/i,
      /Citrix\s+Workspace/i,
      /ICA\s+Client/i,
      /Desktop\s+Viewer/i,
    ],
  },
  {
    environment: 'mstsc',
    windowClasses: [
      'MSTSC',
      'TscShellContainerClass',
      'UIMainClass',
      'OPContainerClass',
      'RemoteApp',
    ],
    processNames: [
      'mstsc.exe',
      'msrdc.exe',
      'rdcman.exe',
    ],
    windowTitlePatterns: [
      /Remote\s+Desktop\s+Connection/i,
      /Conexão\s+de\s+Área\s+de\s+Trabalho\s+Remota/i,
      /RDP/i,
    ],
  },
  {
    environment: 'vmware',
    windowClasses: [
      'VMwareViewClient',
      'VMwareUnityWindow',
      'Horizon Client',
      'vmware-view',
    ],
    processNames: [
      'vmware-view.exe',
      'vmware-remotemks.exe',
      'vmware-usbarbitrator64.exe',
      'horizon.exe',
    ],
    windowTitlePatterns: [
      /VMware\s+Horizon/i,
      /VMware\s+View/i,
      /Horizon\s+Client/i,
    ],
  },
];

// Additional indicators that suggest VDI even if not direct match
const VDI_HEURISTICS = {
  // Window class prefixes that often indicate virtualization
  suspiciousClassPrefixes: ['Afx:', 'AfxWnd', '#32770'],

  // Process names that might indicate remote session
  remoteSessionProcesses: [
    'tscon.exe', // Terminal Services
    'csrss.exe', // Client/Server Runtime - multiple instances = remote
    'rdpclip.exe', // RDP clipboard
    'rdpinput.exe', // RDP input
  ],

  // Environment variables that indicate VDI
  vdiEnvironmentVars: [
    'CLIENTNAME', // Set in RDP/Citrix sessions
    'SESSIONNAME', // Set in terminal services
    'ViewClient_Machine_Name', // VMware Horizon
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// VDI DETECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class VDIDetector {
  private cachedResult: VDIDetectionResult | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheValidityMs = 5000; // Cache for 5 seconds

  /**
   * Detect if running in a VDI environment
   */
  async detect(): Promise<VDIDetectionResult> {
    // Use cache if still valid
    if (this.cachedResult && Date.now() - this.cacheTimestamp < this.cacheValidityMs) {
      return this.cachedResult;
    }

    const windowInfo = await this.getActiveWindowInfo();
    const result = this.analyzeWindow(windowInfo);

    // Cache result
    this.cachedResult = result;
    this.cacheTimestamp = Date.now();

    if (result.isVDI) {
      console.info(`VDI environment detected: ${result.environment}`);
    }

    return result;
  }

  /**
   * Force re-detection (bypass cache)
   */
  async forceDetect(): Promise<VDIDetectionResult> {
    this.cachedResult = null;
    return this.detect();
  }

  /**
   * Check environment variables for VDI indicators
   */
  checkEnvironmentVariables(): VDIEnvironment | null {
    for (const envVar of VDI_HEURISTICS.vdiEnvironmentVars) {
      if (process.env[envVar]) {
        // CLIENTNAME set = likely RDP or Citrix
        if (envVar === 'CLIENTNAME') {
          return 'mstsc';
        }
        // ViewClient = VMware
        if (envVar === 'ViewClient_Machine_Name') {
          return 'vmware';
        }
        // SESSIONNAME with RDP- prefix = RDP
        if (envVar === 'SESSIONNAME' && process.env[envVar]?.startsWith('RDP-')) {
          return 'mstsc';
        }
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getActiveWindowInfo(): Promise<{
    windowClass: string | null;
    processName: string | null;
    windowTitle: string;
  }> {
    try {
      const windowManager = await import('node-window-manager');
      const activeWindow = windowManager.windowManager.getActiveWindow();

      if (!activeWindow) {
        return { windowClass: null, processName: null, windowTitle: '' };
      }

      return {
        // Note: node-window-manager may not expose className directly
        // This might need platform-specific implementation
        windowClass: (activeWindow as any).className || null,
        processName: activeWindow.path?.split(/[/\\]/).pop() || null,
        windowTitle: activeWindow.getTitle() || '',
      };
    } catch {
      // Fallback for development/testing
      return {
        windowClass: process.env.MOCK_WINDOW_CLASS || null,
        processName: process.env.MOCK_PROCESS_NAME || null,
        windowTitle: process.env.MOCK_WINDOW_TITLE || '',
      };
    }
  }

  private analyzeWindow(windowInfo: {
    windowClass: string | null;
    processName: string | null;
    windowTitle: string;
  }): VDIDetectionResult {
    const { windowClass, processName, windowTitle } = windowInfo;

    // Check each VDI signature
    for (const signature of VDI_SIGNATURES) {
      // Check window class
      if (windowClass && signature.windowClasses.some((vc) =>
        windowClass.toLowerCase().includes(vc.toLowerCase())
      )) {
        return {
          isVDI: true,
          environment: signature.environment,
          windowClass,
          processName,
          recommendation: 'vision',
        };
      }

      // Check process name
      if (processName && signature.processNames.some((pn) =>
        processName.toLowerCase() === pn.toLowerCase()
      )) {
        return {
          isVDI: true,
          environment: signature.environment,
          windowClass,
          processName,
          recommendation: 'vision',
        };
      }

      // Check window title patterns
      if (windowTitle && signature.windowTitlePatterns.some((pattern) =>
        pattern.test(windowTitle)
      )) {
        return {
          isVDI: true,
          environment: signature.environment,
          windowClass,
          processName,
          recommendation: 'vision',
        };
      }
    }

    // Check environment variables as fallback
    const envVDI = this.checkEnvironmentVariables();
    if (envVDI) {
      return {
        isVDI: true,
        environment: envVDI,
        windowClass,
        processName,
        recommendation: 'vision',
      };
    }

    // No VDI detected - use accessibility
    return {
      isVDI: false,
      environment: 'none',
      windowClass,
      processName,
      recommendation: 'accessibility',
    };
  }
}
