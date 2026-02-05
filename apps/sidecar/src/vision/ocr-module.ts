/**
 * Vision Module (OCR)
 *
 * Screen capture and OCR fallback for VDI environments.
 * Required for Citrix, RDP, and VMware where accessibility APIs don't work.
 *
 * Uses Tesseract.js for OCR processing.
 *
 * PERFORMANCE NOTE: OCR is slower than accessibility (~500-800ms vs <50ms).
 * Use only when accessibility is unavailable (VDI detection).
 *
 * @module sidecar/vision/ocr-module
 */

import type { InputContext } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface OCRResult {
  text?: string;
  formFields?: Record<string, string>;
  rawOCRText?: string;
  screenshot?: string;
  confidence: number;
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
}

interface ScreenRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OCRConfig {
  language: string;
  preprocessImage: boolean;
  whitelist?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISION MODULE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class VisionModule {
  private tesseractWorker: any = null;
  private isInitialized = false;
  private config: OCRConfig;

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = {
      language: config.language || 'por+eng', // Portuguese + English
      preprocessImage: config.preprocessImage ?? true,
      whitelist: config.whitelist,
    };
  }

  /**
   * Initialize Tesseract worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const Tesseract = await import('tesseract.js');

      this.tesseractWorker = await Tesseract.createWorker(this.config.language);

      // Configure for medical text recognition
      await this.tesseractWorker.setParameters({
        tessedit_char_whitelist: this.config.whitelist || undefined,
        preserve_interword_spaces: '1',
      });

      this.isInitialized = true;
      console.info('Tesseract OCR initialized');
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
      throw error;
    }
  }

  /**
   * Capture screen and perform OCR
   */
  async captureWithOCR(region?: ScreenRegion): Promise<OCRResult> {
    const startTime = Date.now();

    // Ensure initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Capture screenshot
    const screenshot = await this.captureScreen(region);

    if (!screenshot) {
      return {
        confidence: 0,
        rawOCRText: '',
      };
    }

    // Preprocess image for better OCR
    const processedImage = this.config.preprocessImage
      ? await this.preprocessImage(screenshot)
      : screenshot;

    // Perform OCR
    const ocrResult = await this.performOCR(processedImage);

    // Parse structured data from OCR text
    const parsedData = this.parseOCRText(ocrResult.text);

    const latencyMs = Date.now() - startTime;
    console.debug(`OCR completed in ${latencyMs}ms, confidence: ${ocrResult.confidence}`);

    return {
      text: ocrResult.text,
      rawOCRText: ocrResult.text,
      screenshot: screenshot, // Base64 encoded
      confidence: ocrResult.confidence,
      formFields: parsedData.formFields,
      medication: parsedData.medication,
      procedure: parsedData.procedure,
      diagnosis: parsedData.diagnosis,
    };
  }

  /**
   * Perform OCR on specific regions of interest
   */
  async captureRegions(regions: { name: string; bounds: ScreenRegion }[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    // Process regions in parallel for speed
    const promises = regions.map(async (region) => {
      const result = await this.captureWithOCR(region.bounds);
      return { name: region.name, text: result.text || '' };
    });

    const completed = await Promise.all(promises);

    for (const { name, text } of completed) {
      results[name] = text;
    }

    return results;
  }

  /**
   * Terminate the OCR worker
   */
  async terminate(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
      this.isInitialized = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async captureScreen(region?: ScreenRegion): Promise<string | null> {
    try {
      // Use Electron's desktopCapturer or native screenshot
      const { desktopCapturer, screen } = await import('electron');

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: region
          ? { width: region.width, height: region.height }
          : screen.getPrimaryDisplay().workAreaSize,
      });

      if (sources.length === 0) {
        console.warn('No screen sources available');
        return null;
      }

      // Get the primary screen
      const primarySource = sources[0];
      const thumbnail = primarySource.thumbnail;

      // Crop to region if specified
      if (region) {
        const cropped = thumbnail.crop(region);
        return cropped.toDataURL();
      }

      return thumbnail.toDataURL();
    } catch (error) {
      console.error('Screen capture failed:', error);
      return null;
    }
  }

  private async preprocessImage(base64Image: string): Promise<string> {
    // Image preprocessing for better OCR results:
    // 1. Convert to grayscale
    // 2. Increase contrast
    // 3. Apply threshold
    // 4. Denoise

    // TODO: Implement using 'jimp' or 'sharp' for production performance.
    // For prototype, we strictly return the raw image to avoid adding heavy dependencies.
    return base64Image;
  }

  private async performOCR(image: string): Promise<{ text: string; confidence: number }> {
    if (!this.tesseractWorker) {
      throw new Error('OCR not initialized');
    }

    try {
      const result = await this.tesseractWorker.recognize(image);

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
      };
    } catch (error) {
      console.error('OCR recognition failed:', error);
      return { text: '', confidence: 0 };
    }
  }

  private parseOCRText(text: string): {
    formFields: Record<string, string>;
    medication?: { name: string; dose?: string; frequency?: string; route?: string };
    procedure?: { code: string; description?: string };
    diagnosis?: { icd10Code: string; description?: string };
  } {
    const formFields: Record<string, string> = {};
    let medication: OCRResult['medication'];
    let procedure: OCRResult['procedure'];
    let diagnosis: OCRResult['diagnosis'];

    if (!text) {
      return { formFields };
    }

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Try to identify field labels
      const fieldMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (fieldMatch) {
        const label = fieldMatch[1].toLowerCase().trim();
        const value = fieldMatch[2].trim();

        formFields[label] = value;

        // Detect specific fields
        if (label.includes('medicamento') || label.includes('medication')) {
          medication = this.parseMedicationText(value);
        } else if (label.includes('procedimento') || label.includes('procedure')) {
          procedure = this.parseProcedureText(value);
        } else if (label.includes('diagnóstico') || label.includes('cid') || label.includes('diagnosis')) {
          diagnosis = this.parseDiagnosisText(value);
        }
      }

      // Look for patterns even without labels
      if (!medication) {
        medication = this.detectMedicationPattern(line);
      }
      if (!procedure) {
        procedure = this.detectProcedurePattern(line);
      }
      if (!diagnosis) {
        diagnosis = this.detectDiagnosisPattern(line);
      }
    }

    return { formFields, medication, procedure, diagnosis };
  }

  private parseMedicationText(text: string): OCRResult['medication'] | undefined {
    // Pattern: "Amoxicilina 500mg 8/8h VO"
    const match = text.match(/([A-Za-zÀ-ú\s]+)\s*(\d+\s*(?:mg|g|ml|mcg|UI)?)\s*((?:\d+\/\d+h?)?)\s*(\w{2,})?/i);

    if (match) {
      return {
        name: match[1].trim(),
        dose: match[2]?.trim() || undefined,
        frequency: match[3]?.trim() || undefined,
        route: match[4]?.trim() || undefined,
      };
    }

    return undefined;
  }

  private parseProcedureText(text: string): OCRResult['procedure'] | undefined {
    // TISS code: 8 digits
    const match = text.match(/(\d{8})\s*[-:]?\s*(.*)/);

    if (match) {
      return {
        code: match[1],
        description: match[2]?.trim() || undefined,
      };
    }

    return undefined;
  }

  private parseDiagnosisText(text: string): OCRResult['diagnosis'] | undefined {
    // ICD-10: Letter + 2-3 digits, optionally with decimal
    const match = text.match(/([A-Z]\d{2}\.?\d*)\s*[-:]?\s*(.*)/i);

    if (match) {
      return {
        icd10Code: match[1].toUpperCase(),
        description: match[2]?.trim() || undefined,
      };
    }

    return undefined;
  }

  private detectMedicationPattern(line: string): OCRResult['medication'] | undefined {
    // Common medication patterns
    const patterns = [
      // "Dipirona 500mg"
      /^([A-Za-zÀ-ú]+)\s+(\d+\s*(?:mg|g|ml|mcg|UI))/i,
      // "500mg Amoxicilina"
      /^(\d+\s*(?:mg|g|ml|mcg|UI))\s+([A-Za-zÀ-ú]+)/i,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          name: match[2] || match[1],
          dose: match[1]?.includes('mg') || match[1]?.includes('g') ? match[1] : match[2],
        };
      }
    }

    return undefined;
  }

  private detectProcedurePattern(line: string): OCRResult['procedure'] | undefined {
    // 8-digit TISS code anywhere in line
    const match = line.match(/\b(\d{8})\b/);
    if (match) {
      return { code: match[1] };
    }
    return undefined;
  }

  private detectDiagnosisPattern(line: string): OCRResult['diagnosis'] | undefined {
    // ICD-10 code anywhere in line
    const match = line.match(/\b([A-Z]\d{2}\.?\d{0,2})\b/i);
    if (match && match[1].length >= 3) {
      return { icd10Code: match[1].toUpperCase() };
    }
    return undefined;
  }
}
