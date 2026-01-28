/**
 * Accessibility Reader
 *
 * Reads content from native desktop applications using OS accessibility APIs.
 * Primary method for EHR integration (faster and more reliable than OCR).
 *
 * Platform Support:
 * - Windows: UI Automation API
 * - macOS: Accessibility API (AXUIElement)
 *
 * IMPORTANT: This does NOT work in VDI environments (Citrix, RDP, VMware).
 * Use VDIDetector to check before calling this module.
 *
 * @module sidecar/accessibility/reader
 */

import type {
  EHRFingerprint,
  AccessibilityNode,
  AccessibilityMapping,
} from '../types';
import { EHRDetector } from '../fingerprint/ehr-detector';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AccessibilityResult {
  text?: string;
  formFields?: Record<string, string>;
  medication?: {
    name: string;
    dose?: string;
    frequency?: string;
    route?: string;
  };
  procedure?: {
    code: string;
    description?: string;
  };
  diagnosis?: {
    icd10Code: string;
    description?: string;
  };
  rawAccessibilityTree?: AccessibilityNode[];
}

interface FocusedElementInfo {
  automationId?: string;
  name?: string;
  value?: string;
  className?: string;
  controlType?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY READER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class AccessibilityReader {
  private ehrDetector: EHRDetector;
  private watchCallbacks: Map<string, (text: string) => void> = new Map();
  private watchIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.ehrDetector = new EHRDetector();
  }

  /**
   * Capture content from the current EHR window
   */
  async capture(fingerprint: EHRFingerprint): Promise<AccessibilityResult> {
    // Get accessibility mapping for this EHR
    const mapping = this.ehrDetector.getMapping(fingerprint);

    if (mapping.ehrName === 'unknown') {
      // No mapping available - return empty to trigger OCR fallback
      return {};
    }

    // Try to read form fields using the mapping
    const formFields = await this.readFormFields(mapping);

    // Parse structured data from fields
    const parsedData = this.parseFields(formFields, mapping);

    // Get raw accessibility tree for RLHF capture
    const rawTree = await this.getAccessibilityTree();

    return {
      formFields,
      ...parsedData,
      rawAccessibilityTree: rawTree,
    };
  }

  /**
   * Get focused text field content
   */
  async getFocusedTextContent(): Promise<string | null> {
    const focused = await this.getFocusedElement();

    if (focused?.value) {
      return focused.value;
    }

    return null;
  }

  /**
   * Watch for text changes in target EHR window
   */
  watchTextChanges(windowTitle: string, callback: (text: string) => void): void {
    // Store callback
    this.watchCallbacks.set(windowTitle, callback);

    let lastValue = '';

    // Poll for changes every 500ms
    const interval = setInterval(async () => {
      const currentValue = await this.getFocusedTextContent();

      if (currentValue && currentValue !== lastValue) {
        lastValue = currentValue;
        callback(currentValue);
      }
    }, 500);

    this.watchIntervals.set(windowTitle, interval);
  }

  /**
   * Stop watching for text changes
   */
  stopWatching(windowTitle: string): void {
    const interval = this.watchIntervals.get(windowTitle);
    if (interval) {
      clearInterval(interval);
      this.watchIntervals.delete(windowTitle);
    }
    this.watchCallbacks.delete(windowTitle);
  }

  /**
   * Stop all watchers
   */
  stopAllWatching(): void {
    for (const [title] of this.watchIntervals) {
      this.stopWatching(title);
    }
  }

  /**
   * Get the full accessibility tree for the active window
   */
  async getAccessibilityTree(): Promise<AccessibilityNode[]> {
    // Platform-specific implementation would go here
    // Using UI Automation on Windows, AXUIElement on macOS

    try {
      // This would use native bindings in a real implementation
      // For now, return empty to demonstrate structure
      const tree = await this.readAccessibilityTreeNative();
      return tree;
    } catch (error) {
      console.warn('Failed to read accessibility tree:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async readFormFields(mapping: AccessibilityMapping): Promise<Record<string, string>> {
    const fields: Record<string, string> = {};

    for (const [fieldName, selector] of Object.entries(mapping.fields)) {
      if (!selector) continue;

      try {
        const value = await this.readElementBySelector(selector);
        if (value) {
          fields[fieldName] = value;
        }
      } catch (error) {
        console.debug(`Failed to read field ${fieldName}:`, error);
      }
    }

    return fields;
  }

  private async readElementBySelector(selector: {
    automationId?: string;
    className?: string;
    name?: string;
    controlType?: string;
    path?: string[];
  }): Promise<string | null> {
    // Platform-specific implementation
    // On Windows, use UI Automation
    // On macOS, use Accessibility API

    try {
      if (process.platform === 'win32') {
        return await this.readElementWindows(selector);
      } else if (process.platform === 'darwin') {
        return await this.readElementMacOS(selector);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async readElementWindows(selector: {
    automationId?: string;
    className?: string;
    name?: string;
    controlType?: string;
  }): Promise<string | null> {
    // In a real implementation, this would use:
    // - @aspect-analytics/win32-accessibility
    // - node-ffi to call UIAutomationClient
    // - Native Node.js addon

    // Pseudocode for actual implementation:
    /*
    const automation = require('@aspect-analytics/win32-accessibility');
    const root = automation.getRootElement();

    let element = null;

    if (selector.automationId) {
      element = root.findFirst(
        TreeScope.Descendants,
        new PropertyCondition(AutomationElement.AutomationIdProperty, selector.automationId)
      );
    } else if (selector.name) {
      element = root.findFirst(
        TreeScope.Descendants,
        new PropertyCondition(AutomationElement.NameProperty, selector.name)
      );
    }

    if (element) {
      const valuePattern = element.getPattern(ValuePattern.Pattern);
      return valuePattern?.Current.Value || element.Current.Name;
    }
    */

    // Mock implementation for development
    console.debug('Windows accessibility read:', selector);
    return null;
  }

  private async readElementMacOS(selector: {
    automationId?: string;
    className?: string;
    name?: string;
    controlType?: string;
  }): Promise<string | null> {
    // In a real implementation, this would use:
    // - Native Node.js addon with AXUIElement APIs
    // - applescript via child_process as fallback

    // Pseudocode for actual implementation:
    /*
    const ax = require('node-ax');
    const app = ax.getRunningApp('Tasy');
    const window = app.getFocusedWindow();

    let element = null;

    if (selector.name) {
      element = window.findElementByName(selector.name);
    } else if (selector.automationId) {
      element = window.findElementByIdentifier(selector.automationId);
    }

    return element?.getValue() || null;
    */

    // Mock implementation for development
    console.debug('macOS accessibility read:', selector);
    return null;
  }

  private async getFocusedElement(): Promise<FocusedElementInfo | null> {
    try {
      if (process.platform === 'win32') {
        // Windows: Get focused element from UI Automation
        return this.getFocusedElementWindows();
      } else if (process.platform === 'darwin') {
        // macOS: Get focused element from Accessibility API
        return this.getFocusedElementMacOS();
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getFocusedElementWindows(): Promise<FocusedElementInfo | null> {
    // Real implementation would use UI Automation FocusedElement
    return null;
  }

  private async getFocusedElementMacOS(): Promise<FocusedElementInfo | null> {
    // Real implementation would use AXUIElement focused element
    return null;
  }

  private async readAccessibilityTreeNative(): Promise<AccessibilityNode[]> {
    // This would traverse the accessibility tree and build our node structure
    // Platform-specific implementation needed
    return [];
  }

  private parseFields(
    fields: Record<string, string>,
    mapping: AccessibilityMapping
  ): Partial<AccessibilityResult> {
    const result: Partial<AccessibilityResult> = {};

    // Build text from all fields
    const textParts = Object.values(fields).filter(Boolean);
    if (textParts.length > 0) {
      result.text = textParts.join(' ');
    }

    // Parse medication if present
    if (fields.medicationField) {
      result.medication = this.parseMedication(fields.medicationField);
    }

    // Parse procedure if present
    if (fields.procedureField) {
      result.procedure = this.parseProcedure(fields.procedureField);
    }

    // Parse diagnosis if present
    if (fields.diagnosisField) {
      result.diagnosis = this.parseDiagnosis(fields.diagnosisField);
    }

    return result;
  }

  private parseMedication(text: string): { name: string; dose?: string; frequency?: string; route?: string } | undefined {
    if (!text) return undefined;

    // Common patterns: "Amoxicillin 500mg", "Dipirona 1g 6/6h", "Omeprazol 20mg VO"
    const match = text.match(/^([A-Za-zÀ-ú\s]+)\s*(\d+\s*(?:mg|g|ml|mcg|UI)?)\s*(.*)$/i);

    if (match) {
      return {
        name: match[1].trim(),
        dose: match[2].trim() || undefined,
        frequency: this.extractFrequency(match[3]) || undefined,
        route: this.extractRoute(match[3]) || undefined,
      };
    }

    return { name: text.trim() };
  }

  private parseProcedure(text: string): { code: string; description?: string } | undefined {
    if (!text) return undefined;

    // TISS code patterns: "10101012 - Consulta em consultório"
    const match = text.match(/^(\d{8})\s*[-:]\s*(.*)$/);

    if (match) {
      return {
        code: match[1],
        description: match[2].trim() || undefined,
      };
    }

    // Just code
    if (/^\d{8}$/.test(text.trim())) {
      return { code: text.trim() };
    }

    return undefined;
  }

  private parseDiagnosis(text: string): { icd10Code: string; description?: string } | undefined {
    if (!text) return undefined;

    // ICD-10 patterns: "J06.9 - Infecção aguda das vias aéreas superiores"
    const match = text.match(/^([A-Z]\d{2}\.?\d*)\s*[-:]\s*(.*)$/i);

    if (match) {
      return {
        icd10Code: match[1].toUpperCase(),
        description: match[2].trim() || undefined,
      };
    }

    // Just code
    if (/^[A-Z]\d{2}\.?\d*$/i.test(text.trim())) {
      return { icd10Code: text.trim().toUpperCase() };
    }

    return undefined;
  }

  private extractFrequency(text: string): string | undefined {
    // Common Brazilian patterns: 6/6h, 8/8h, 12/12h, 1x/dia, 2x/dia
    const match = text.match(/(\d+\/\d+h|\d+x\/dia|\d+x\s*ao\s*dia|de\s*\d+\s*em\s*\d+\s*horas?)/i);
    return match ? match[1] : undefined;
  }

  private extractRoute(text: string): string | undefined {
    // Common routes: VO (oral), IV, IM, SC, EV, SL, TD
    const routes = ['VO', 'IV', 'IM', 'SC', 'EV', 'SL', 'TD', 'VR', 'VV', 'NASAL', 'OFTÁLMICO'];
    const upperText = text.toUpperCase();

    for (const route of routes) {
      if (upperText.includes(route)) {
        return route;
      }
    }

    return undefined;
  }
}
