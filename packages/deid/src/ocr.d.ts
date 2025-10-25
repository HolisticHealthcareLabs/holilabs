import { Policy, OCRResult } from './types';
/**
 * OCR scan and redact stub
 * In production: use Tesseract.js or cloud OCR service
 *
 * Handles adversarial scenarios (rotated, low-DPI, noisy images)
 * Applies CDR (Content Disarm & Reconstruction) to PDFs first
 */
export declare function ocrScanAndRedact(pdfBuffer: Buffer, locale: string, policy: Policy): Promise<OCRResult>;
/**
 * Burn-in redaction boxes on DICOM/image overlays
 */
export declare function burnInRedactions(imageBuffer: Buffer, detections: Array<{
    identifier: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}>): Promise<Buffer>;
//# sourceMappingURL=ocr.d.ts.map