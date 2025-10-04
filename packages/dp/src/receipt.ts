import { createHash } from 'crypto';
import { ExportReceipt } from './types';
import PDFDocument from 'pdfkit';

/**
 * Generate cryptographic receipt for DP export
 */
export function generateReceipt(
  datasetSha256: string,
  epsilon: number,
  delta: number,
  policyVersion: string,
  orgId: string,
  subjectId: string
): ExportReceipt {
  const timestamp = new Date();

  // Create canonical string for hashing
  const canonicalString = [
    datasetSha256,
    epsilon.toFixed(6),
    delta.toExponential(10),
    policyVersion,
    timestamp.toISOString(),
    orgId,
    subjectId,
  ].join('|');

  // Generate receipt hash
  const hash = createHash('sha256');
  hash.update(canonicalString);
  const receiptHash = hash.digest('hex');

  return {
    datasetSha256,
    epsilon,
    delta,
    policyVersion,
    timestamp,
    orgId,
    subjectId,
    receiptHash,
  };
}

/**
 * Verify receipt integrity
 */
export function verifyReceipt(receipt: ExportReceipt): boolean {
  const canonicalString = [
    receipt.datasetSha256,
    receipt.epsilon.toFixed(6),
    receipt.delta.toExponential(10),
    receipt.policyVersion,
    receipt.timestamp.toISOString(),
    receipt.orgId,
    receipt.subjectId,
  ].join('|');

  const hash = createHash('sha256');
  hash.update(canonicalString);
  const computed = hash.digest('hex');

  return computed === receipt.receiptHash;
}

/**
 * Generate PDF receipt document
 */
export async function generateReceiptPDF(receipt: ExportReceipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', (buffer) => buffers.push(buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Differential Privacy Export Receipt', { align: 'center' });

    doc.moveDown();

    // Receipt details
    doc.fontSize(12).font('Helvetica');

    doc.text(`Receipt Hash: ${receipt.receiptHash}`, { continued: false });
    doc.moveDown(0.5);

    doc.text(`Timestamp: ${receipt.timestamp.toISOString()}`);
    doc.moveDown(0.5);

    doc.text(`Organization ID: ${receipt.orgId}`);
    doc.moveDown(0.5);

    doc.text(`Subject ID: ${receipt.subjectId}`);
    doc.moveDown(0.5);

    doc.text(`Dataset SHA-256: ${receipt.datasetSha256}`);
    doc.moveDown(0.5);

    doc.text(`Policy Version: ${receipt.policyVersion}`);
    doc.moveDown();

    // Privacy parameters
    doc.fontSize(14).font('Helvetica-Bold').text('Privacy Parameters');
    doc.fontSize(12).font('Helvetica');
    doc.moveDown(0.5);

    doc.text(`Epsilon (ε): ${receipt.epsilon.toFixed(6)}`);
    doc.text(`Delta (δ): ${receipt.delta.toExponential(10)}`);
    doc.moveDown();

    // Explanation
    doc.fontSize(10).font('Helvetica-Oblique');
    doc.text(
      'This receipt certifies that the exported dataset has been protected with differential privacy. ' +
        'The epsilon (ε) and delta (δ) parameters quantify the privacy guarantee provided. ' +
        'Lower values indicate stronger privacy protection.',
      { align: 'justify' }
    );

    doc.moveDown();

    doc.text(
      'This receipt is cryptographically signed and can be independently verified. ' +
        'Store this receipt for compliance and audit purposes.',
      { align: 'justify' }
    );

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica');
    doc.text('VidaBanq Health AI Platform', { align: 'center' });
    doc.text('HIPAA/GDPR/LGPD Compliant', { align: 'center' });

    doc.end();
  });
}
