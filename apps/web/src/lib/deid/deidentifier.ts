/**
 * De-identification Service
 *
 * Implements HIPAA Safe Harbor method with reversible token mapping
 */

import CryptoJS from 'crypto-js';
import { HIPAADetector } from './detectors';
import {
  DeidentificationResult,
  DeidentificationOptions,
  DetectedPHI,
  HIPAAIdentifierType,
  AuditLogEntry,
} from './types';

export class Deidentifier {
  private detector: HIPAADetector;
  private tokenMap: Map<string, string>;
  private reverseMap: Map<string, string>;
  private secret: string;

  constructor(secret?: string) {
    this.detector = new HIPAADetector();
    this.tokenMap = new Map();
    this.reverseMap = new Map();
    this.secret = secret || process.env.DEID_SECRET || 'default-secret-change-me';
  }

  /**
   * De-identify text using HIPAA Safe Harbor method
   */
  async deidentify(
    text: string,
    options: DeidentificationOptions = {}
  ): Promise<DeidentificationResult> {
    const startTime = Date.now();

    // Set defaults
    const opts: Required<DeidentificationOptions> = {
      method: options.method || 'safe_harbor',
      suppressDates: options.suppressDates !== false,
      suppressAges: options.suppressAges !== false,
      suppressZipCodes: options.suppressZipCodes !== false,
      preserveStructure: options.preserveStructure !== false,
      reversible: options.reversible !== false,
      auditLog: options.auditLog !== false,
    };

    // Detect all PHI
    const detectedPHI = this.detector.detect(text);

    // De-identify text
    let deidentified = text;
    const byType: Record<string, number> = {};

    // Sort detected PHI by position (reverse order to maintain indices)
    const sortedPHI = [...detectedPHI].sort((a, b) => b.start - a.start);

    sortedPHI.forEach(phi => {
      // Generate replacement token
      const token = this.generateToken(phi, opts);

      // Store mapping if reversible
      if (opts.reversible) {
        this.tokenMap.set(phi.value, token);
        this.reverseMap.set(token, phi.value);
      }

      // Replace in text
      deidentified =
        deidentified.substring(0, phi.start) +
        token +
        deidentified.substring(phi.end);

      // Count by type
      byType[phi.type] = (byType[phi.type] || 0) + 1;
    });

    // Calculate overall confidence
    const confidenceScore =
      detectedPHI.length > 0
        ? detectedPHI.reduce((sum, phi) => sum + phi.confidence, 0) /
          detectedPHI.length
        : 1.0;

    const result: DeidentificationResult = {
      original: text,
      deidentified,
      detectedPHI,
      tokenMap: new Map(this.tokenMap),
      summary: {
        totalDetected: detectedPHI.length,
        byType: byType as Record<HIPAAIdentifierType, number>,
        confidenceScore,
      },
      metadata: {
        timestamp: new Date(),
        method: opts.method,
        version: '1.0.0',
      },
    };

    // Audit log
    if (opts.auditLog) {
      await this.logDeidentification(text, result);
    }

    return result;
  }

  /**
   * Re-identify text using token map
   */
  reidentify(deidentifiedText: string): string {
    let reidentified = deidentifiedText;

    // Replace tokens with original values
    this.reverseMap.forEach((original, token) => {
      reidentified = reidentified.replace(new RegExp(this.escapeRegex(token), 'g'), original);
    });

    return reidentified;
  }

  /**
   * Generate replacement token for PHI
   */
  private generateToken(phi: DetectedPHI, options: Required<DeidentificationOptions>): string {
    // If not reversible, use generic placeholders
    if (!options.reversible) {
      return this.getGenericPlaceholder(phi.type);
    }

    // Generate deterministic token based on value + secret
    const hash = CryptoJS.SHA256(phi.value + this.secret).toString();
    const shortHash = hash.substring(0, 8).toUpperCase();

    // Format based on type
    switch (phi.type) {
      case 'NAME':
        return `[PATIENT-${shortHash}]`;
      case 'DATE':
        // Preserve year if present
        const yearMatch = phi.value.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? `[DATE-${yearMatch[0]}]` : `[DATE-REDACTED]`;
      case 'TELEPHONE':
      case 'FAX':
        return `[PHONE-${shortHash}]`;
      case 'EMAIL':
        return `[EMAIL-${shortHash}@redacted.example]`;
      case 'SSN':
      case 'CPF':
        return `[ID-${shortHash}]`;
      case 'MRN':
        return `[MRN-${shortHash}]`;
      case 'GEOGRAPHIC':
        return `[LOCATION-${shortHash}]`;
      case 'ZIP_FULL':
        // Keep first 3 digits if present
        const zipMatch = phi.value.match(/^(\d{3})/);
        return zipMatch ? `${zipMatch[1]}00` : '[ZIP-REDACTED]';
      case 'AGE_OVER_89':
        return '[AGE>89]';
      case 'IP_ADDRESS':
        return `[IP-${shortHash}]`;
      case 'URL':
        return `[URL-${shortHash}]`;
      default:
        return `[${phi.type}-${shortHash}]`;
    }
  }

  /**
   * Get generic placeholder for non-reversible de-identification
   */
  private getGenericPlaceholder(type: HIPAAIdentifierType): string {
    const placeholders: Record<HIPAAIdentifierType, string> = {
      NAME: '[NOMBRE REDACTADO]',
      GEOGRAPHIC: '[UBICACIÓN REDACTADA]',
      DATE: '[FECHA REDACTADA]',
      TELEPHONE: '[TELÉFONO REDACTADO]',
      FAX: '[FAX REDACTADO]',
      EMAIL: '[EMAIL REDACTADO]',
      SSN: '[ID REDACTADO]',
      MRN: '[REGISTRO MÉDICO REDACTADO]',
      HEALTH_PLAN: '[PLAN DE SALUD REDACTADO]',
      ACCOUNT: '[CUENTA REDACTADA]',
      CERTIFICATE: '[CERTIFICADO REDACTADO]',
      VEHICLE: '[VEHÍCULO REDACTADO]',
      DEVICE: '[DISPOSITIVO REDACTADO]',
      URL: '[URL REDACTADA]',
      IP_ADDRESS: '[IP REDACTADA]',
      BIOMETRIC: '[BIOMÉTRICO REDACTADO]',
      PHOTO: '[FOTO REDACTADA]',
      OTHER_UNIQUE: '[DATO ÚNICO REDACTADO]',
    };
    return placeholders[type] || '[REDACTADO]';
  }

  /**
   * Log de-identification for audit
   */
  private async logDeidentification(
    originalText: string,
    result: DeidentificationResult
  ): Promise<void> {
    const inputHash = CryptoJS.SHA256(originalText).toString();

    const logEntry: AuditLogEntry = {
      id: CryptoJS.lib.WordArray.random(16).toString(),
      timestamp: new Date(),
      action: 'deidentify',
      inputHash,
      detectedCount: result.summary.totalDetected,
      method: result.metadata.method,
      success: true,
    };

    // In production, send to audit log service/database
    console.log('[AUDIT LOG]', JSON.stringify(logEntry));
  }

  /**
   * Get de-identification statistics
   */
  getStatistics() {
    return {
      totalTokens: this.tokenMap.size,
      tokenTypes: Array.from(new Set(
        Array.from(this.tokenMap.keys()).map(k => {
          const match = k.match(/^\[([A-Z_]+)-/);
          return match ? match[1] : 'UNKNOWN';
        })
      )),
    };
  }

  /**
   * Clear token maps (important for security)
   */
  clearMaps(): void {
    this.tokenMap.clear();
    this.reverseMap.clear();
  }

  /**
   * Export token map for storage (encrypted)
   */
  exportTokenMap(): string {
    const mapObject = Object.fromEntries(this.tokenMap);
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(mapObject),
      this.secret
    ).toString();
    return encrypted;
  }

  /**
   * Import token map from storage (decrypt)
   */
  importTokenMap(encryptedMap: string): void {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedMap, this.secret);
      const mapObject = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

      this.tokenMap = new Map(Object.entries(mapObject));
      // Rebuild reverse map
      this.reverseMap = new Map(
        Array.from(this.tokenMap.entries()).map(([k, v]) => [v, k])
      );
    } catch (error) {
      throw new Error('Failed to import token map: Invalid encryption key or corrupted data');
    }
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
