"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrScanAndRedact = ocrScanAndRedact;
exports.burnInRedactions = burnInRedactions;
const redact_1 = require("./redact");
/**
 * OCR scan and redact stub
 * In production: use Tesseract.js or cloud OCR service
 *
 * Handles adversarial scenarios (rotated, low-DPI, noisy images)
 * Applies CDR (Content Disarm & Reconstruction) to PDFs first
 */
async function ocrScanAndRedact(pdfBuffer, locale, policy) {
    if (!policy.ocr.enabled) {
        throw new Error('OCR is disabled in policy');
    }
    // Step 1: CDR sanitize PDF (remove scripts, forms, macros)
    const sanitizedBuffer = await cdrSanitizePDF(pdfBuffer);
    // Step 2: Apply adversarial transforms for robustness testing
    const transformedBuffer = await applyAdversarialTransforms(sanitizedBuffer, policy.ocr.adversarial);
    // Step 3: Extract text via OCR (stub)
    const extractedText = await performOCR(transformedBuffer, locale);
    // Step 4: Redact PHI from extracted text
    const redactedText = (0, redact_1.redactText)(extractedText, locale, policy);
    // Step 5: Detect identifier positions (for overlay removal)
    const detections = detectIdentifierPositions(extractedText, redactedText);
    return {
        text: extractedText,
        redactedText,
        detections,
    };
}
/**
 * CDR: Content Disarm & Reconstruction
 * Remove potentially malicious content from PDFs
 */
async function cdrSanitizePDF(buffer) {
    // Stub: In production, use pdf-lib or similar to:
    // - Remove JavaScript
    // - Remove forms
    // - Remove embedded files
    // - Remove macros
    // - Normalize structure
    // - Downsample if needed
    console.warn('CDR PDF sanitization is stubbed in MVP. Implement with pdf-lib in production.');
    return buffer;
}
/**
 * Apply adversarial transforms to test OCR robustness
 */
async function applyAdversarialTransforms(buffer, transforms) {
    // Stub: In production, use sharp or canvas to:
    // - Rotate image (5-15 degrees)
    // - Reduce DPI (simulate scanned docs)
    // - Add noise (simulate poor quality)
    console.warn('Adversarial transforms stubbed in MVP. Implement with sharp in production.');
    return buffer;
}
/**
 * Perform OCR on image/PDF
 */
async function performOCR(buffer, locale) {
    // Stub: In production, use Tesseract.js with appropriate language pack
    // const { createWorker } = require('tesseract.js');
    // const worker = await createWorker(locale);
    // const { data: { text } } = await worker.recognize(buffer);
    // await worker.terminate();
    // return text;
    console.warn('OCR text extraction is stubbed in MVP. Implement with Tesseract.js in production.');
    return '[OCR_STUB: Extracted text would appear here]';
}
/**
 * Detect positions of identifiers in OCR output
 * Useful for burning-in redaction boxes on images
 */
function detectIdentifierPositions(original, redacted) {
    // Stub: In production, use text diff and OCR word bounding boxes
    // to compute pixel positions of redacted identifiers
    const detections = [];
    // Simple diff detection
    if (original !== redacted) {
        detections.push({
            identifier: 'PHI_DETECTED',
            position: { x: 0, y: 0, width: 100, height: 20 },
        });
    }
    return detections;
}
/**
 * Burn-in redaction boxes on DICOM/image overlays
 */
async function burnInRedactions(imageBuffer, detections) {
    // Stub: In production, use sharp or canvas to draw black rectangles
    // over detected identifier positions
    console.warn('Burn-in redactions stubbed in MVP. Implement with sharp in production.');
    return imageBuffer;
}
//# sourceMappingURL=ocr.js.map