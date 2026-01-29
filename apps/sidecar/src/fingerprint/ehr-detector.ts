/**
 * EHR Detector
 *
 * Detects and fingerprints EHR systems by window title and process name.
 * Loads version-specific accessibility mappings.
 *
 * Supported EHRs:
 * - Tasy (Oracle/HTML5)
 * - MV Soul
 * - Philips Tasy
 * - Wareline
 *
 * @module sidecar/fingerprint/ehr-detector
 */

import type { EHRFingerprint, EHRName, AccessibilityMapping } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// EHR SIGNATURES
// ═══════════════════════════════════════════════════════════════════════════════

interface EHRSignature {
  name: EHRName;
  patterns: {
    windowTitle?: RegExp[];
    processName?: RegExp[];
  };
  versionExtractor?: (windowTitle: string) => string;
}

const EHR_SIGNATURES: EHRSignature[] = [
  {
    name: 'tasy',
    patterns: {
      windowTitle: [
        /Tasy/i,
        /Sistema\s+Tasy/i,
        /Philips\s+Tasy/i,
        /Tasy\s+HTML5/i,
        /Tasy\s+Web/i,
      ],
      processName: [
        /java\.exe/i,
        /javaw\.exe/i,
        /chrome\.exe/i, // Tasy HTML5 runs in browser
        /msedge\.exe/i,
      ],
    },
    versionExtractor: (title) => {
      // Extract version from titles like "Tasy HTML5 v3.06" or "Tasy 2024.1"
      const match = title.match(/Tasy\s+(?:HTML5\s+)?v?(\d+\.?\d*\.?\d*)/i);
      return match ? match[1] : 'unknown';
    },
  },
  {
    name: 'mv-soul',
    patterns: {
      windowTitle: [
        /MV\s+Soul/i,
        /MV\s+Sistemas/i,
        /Soul\s+MV/i,
        /MV2000/i,
        /MV\s+Hospitalar/i,
      ],
      processName: [
        /soul\.exe/i,
        /mv\.exe/i,
        /mvsoul\.exe/i,
        /oracle\.exe/i, // MV uses Oracle Forms
      ],
    },
    versionExtractor: (title) => {
      const match = title.match(/MV\s+Soul?\s+(\d+\.?\d*)/i);
      return match ? match[1] : 'unknown';
    },
  },
  {
    name: 'philips-tasy',
    patterns: {
      windowTitle: [
        /Philips\s+Clinical\s+Informatics/i,
        /Philips\s+ICCA/i,
        /Philips\s+IntelliSpace/i,
      ],
      processName: [/philips/i],
    },
    versionExtractor: () => 'unknown',
  },
  {
    name: 'wareline',
    patterns: {
      windowTitle: [/Wareline/i, /W-Line/i, /Sistema\s+Wareline/i],
      processName: [/wareline\.exe/i, /wline\.exe/i],
    },
    versionExtractor: (title) => {
      const match = title.match(/Wareline\s+v?(\d+\.?\d*)/i);
      return match ? match[1] : 'unknown';
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY MAPPINGS (Version-specific)
// ═══════════════════════════════════════════════════════════════════════════════

const ACCESSIBILITY_MAPPINGS: Record<string, AccessibilityMapping> = {
  'tasy-html5-v3': {
    ehrName: 'tasy',
    version: 'html5-v3',
    fields: {
      patientName: {
        automationId: 'txtPaciente',
        className: 'TextBox',
        controlType: 'Edit',
      },
      patientId: {
        automationId: 'txtCodPaciente',
        className: 'TextBox',
        controlType: 'Edit',
      },
      medicationField: {
        automationId: 'txtMedicamento',
        className: 'ComboBox',
        controlType: 'ComboBox',
      },
      diagnosisField: {
        automationId: 'txtCID',
        className: 'ComboBox',
        controlType: 'ComboBox',
      },
      procedureField: {
        automationId: 'txtProcedimento',
        className: 'ComboBox',
        controlType: 'ComboBox',
      },
    },
  },
  'tasy-java': {
    ehrName: 'tasy',
    version: 'java',
    fields: {
      patientName: {
        className: 'SunAwtFrame',
        name: 'Paciente',
        controlType: 'Edit',
      },
      patientId: {
        className: 'SunAwtFrame',
        name: 'Codigo',
        controlType: 'Edit',
      },
      medicationField: {
        className: 'SunAwtFrame',
        name: 'Medicamento',
        controlType: 'List',
      },
    },
  },
  'mv-soul-12': {
    ehrName: 'mv-soul',
    version: '12',
    fields: {
      patientName: {
        automationId: 'edtNomePaciente',
        controlType: 'Edit',
      },
      patientId: {
        automationId: 'edtCodPaciente',
        controlType: 'Edit',
      },
      medicationField: {
        automationId: 'cmbMedicamento',
        controlType: 'ComboBox',
      },
      procedureField: {
        automationId: 'cmbProcedimento',
        controlType: 'ComboBox',
      },
    },
  },
  'fallback-ocr': {
    ehrName: 'unknown',
    version: 'fallback',
    fields: {},
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EHR DETECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class EHRDetector {
  private currentFingerprint: EHRFingerprint | null = null;
  private watchCallback: ((fingerprint: EHRFingerprint) => void) | null = null;
  private watchInterval: NodeJS.Timeout | null = null;
  private lastUnknownLogTime: number = 0;
  private static UNKNOWN_LOG_INTERVAL_MS = 60000; // Only log unknown EHR once per minute

  /**
   * Fingerprint the active EHR window
   */
  async fingerprint(): Promise<EHRFingerprint> {
    const windowInfo = await this.getActiveWindowInfo();

    // Match against known EHR signatures
    const fingerprint = this.matchEHR(windowInfo.title, windowInfo.processName);

    // Cache for quick lookup
    this.currentFingerprint = fingerprint;

    return fingerprint;
  }

  /**
   * Get accessibility mapping for current EHR
   */
  getMapping(fingerprint: EHRFingerprint): AccessibilityMapping {
    // Try version-specific mapping first
    const versionKey = `${fingerprint.ehrName}-${fingerprint.version}`;
    if (ACCESSIBILITY_MAPPINGS[versionKey]) {
      return ACCESSIBILITY_MAPPINGS[versionKey];
    }

    // Try EHR-only mapping
    const ehrKey = fingerprint.ehrName;
    const ehrMapping = Object.entries(ACCESSIBILITY_MAPPINGS).find(
      ([key]) => key.startsWith(ehrKey)
    );

    if (ehrMapping) {
      return ehrMapping[1];
    }

    // Fallback to OCR
    console.warn(`No accessibility mapping for ${versionKey}, using OCR fallback`);
    return ACCESSIBILITY_MAPPINGS['fallback-ocr'];
  }

  /**
   * Start watching for EHR window changes
   */
  startWatching(callback: (fingerprint: EHRFingerprint) => void): void {
    this.watchCallback = callback;

    // Check every 2 seconds for window changes
    this.watchInterval = setInterval(async () => {
      const newFingerprint = await this.fingerprint();

      // Only notify if EHR changed
      if (
        !this.currentFingerprint ||
        newFingerprint.ehrName !== this.currentFingerprint.ehrName ||
        newFingerprint.version !== this.currentFingerprint.version
      ) {
        this.watchCallback?.(newFingerprint);
      }
    }, 2000);
  }

  /**
   * Stop watching for EHR window changes
   */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.watchCallback = null;
  }

  /**
   * Get current fingerprint without re-scanning
   */
  getCurrent(): EHRFingerprint | null {
    return this.currentFingerprint;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getActiveWindowInfo(): Promise<{ title: string; processName: string }> {
    // In a real implementation, this would use node-window-manager or native APIs
    // For now, return mock data for type safety
    try {
      // Dynamic import to avoid issues in non-Electron environments
      const windowManager = await import('node-window-manager');
      const activeWindow = windowManager.windowManager.getActiveWindow();

      return {
        title: activeWindow?.getTitle() || '',
        processName: activeWindow?.path?.split(/[/\\]/).pop() || '',
      };
    } catch {
      // Fallback for development/testing
      return {
        title: process.env.MOCK_WINDOW_TITLE || '',
        processName: process.env.MOCK_PROCESS_NAME || '',
      };
    }
  }

  private matchEHR(windowTitle: string, processName: string): EHRFingerprint {
    for (const signature of EHR_SIGNATURES) {
      // Check window title patterns
      const titleMatch = signature.patterns.windowTitle?.some((pattern) =>
        pattern.test(windowTitle)
      );

      // Check process name patterns
      const processMatch = signature.patterns.processName?.some((pattern) =>
        pattern.test(processName)
      );

      // Match if either title or process matches
      if (titleMatch || processMatch) {
        const version = signature.versionExtractor?.(windowTitle) || 'unknown';
        const mappingFile = this.getMappingFile(signature.name, version);

        return {
          ehrName: signature.name,
          version,
          windowTitle,
          processName,
          accessibilityMappingFile: mappingFile,
          detectedAt: new Date(),
        };
      }
    }

    // Unknown EHR - use OCR fallback
    // Throttle logging to avoid spam during development
    const now = Date.now();
    if (now - this.lastUnknownLogTime > EHRDetector.UNKNOWN_LOG_INTERVAL_MS) {
      console.warn('Unknown EHR version, defaulting to OCR');
      this.lastUnknownLogTime = now;
    }
    return {
      ehrName: 'unknown',
      version: 'unknown',
      windowTitle,
      processName,
      accessibilityMappingFile: 'fallback-ocr',
      detectedAt: new Date(),
    };
  }

  private getMappingFile(ehrName: EHRName, version: string): string {
    // Normalize version for mapping lookup
    const normalizedVersion = version.replace(/\./g, '-').toLowerCase();

    // Check if specific mapping exists
    const specificKey = `${ehrName}-${normalizedVersion}`;
    if (ACCESSIBILITY_MAPPINGS[specificKey]) {
      return specificKey;
    }

    // Try major version only (e.g., "3.06" -> "3")
    const majorVersion = version.split('.')[0];
    const majorKey = `${ehrName}-${majorVersion}`;
    if (ACCESSIBILITY_MAPPINGS[majorKey]) {
      return majorKey;
    }

    // Check for any mapping for this EHR
    const anyMapping = Object.keys(ACCESSIBILITY_MAPPINGS).find((key) =>
      key.startsWith(ehrName)
    );

    return anyMapping || 'fallback-ocr';
  }
}
