import { NextResponse } from 'next/server';
import { Deidentifier } from '@/lib/deid/deidentifier';
import { DeidentificationOptions } from '@/lib/deid/types';

/**
 * De-identification API Endpoint
 *
 * POST /api/deidentify
 * Body: { text: string, options?: DeidentificationOptions }
 */
export async function POST(request: Request) {
  try {
    const { text, options } = await request.json();

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: text is required' },
        { status: 400 }
      );
    }

    if (text.length > 100000) {
      return NextResponse.json(
        { error: 'Text too large: maximum 100,000 characters' },
        { status: 413 }
      );
    }

    // Initialize de-identifier
    const deidentifier = new Deidentifier(process.env.DEID_SECRET);

    // Perform de-identification
    const result = await deidentifier.deidentify(text, options);

    // Export encrypted token map if reversible
    const tokenMapExport = options?.reversible
      ? deidentifier.exportTokenMap()
      : null;

    // Clear sensitive data from memory
    deidentifier.clearMaps();

    // Return result (exclude original text for security)
    return NextResponse.json({
      success: true,
      deidentified: result.deidentified,
      summary: result.summary,
      metadata: result.metadata,
      tokenMapExport, // Client should store this securely if needed
      detectedPHI: result.detectedPHI.map(phi => ({
        type: phi.type,
        start: phi.start,
        end: phi.end,
        confidence: phi.confidence,
        // Do NOT include actual value in response
      })),
    });
  } catch (error: any) {
    console.error('De-identification error:', error);
    return NextResponse.json(
      { error: 'De-identification failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Re-identification API Endpoint
 *
 * PUT /api/deidentify
 * Body: { text: string, tokenMapExport: string }
 */
export async function PUT(request: Request) {
  try {
    const { text, tokenMapExport } = await request.json();

    // Validate input
    if (!text || !tokenMapExport) {
      return NextResponse.json(
        { error: 'Invalid input: text and tokenMapExport are required' },
        { status: 400 }
      );
    }

    // Initialize de-identifier
    const deidentifier = new Deidentifier(process.env.DEID_SECRET);

    // Import token map
    deidentifier.importTokenMap(tokenMapExport);

    // Re-identify
    const reidentified = deidentifier.reidentify(text);

    // Clear sensitive data
    deidentifier.clearMaps();

    return NextResponse.json({
      success: true,
      reidentified,
    });
  } catch (error: any) {
    console.error('Re-identification error:', error);
    return NextResponse.json(
      { error: 'Re-identification failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'de-identification',
    version: '1.0.0',
    hipaaCompliant: true,
    method: 'safe_harbor',
  });
}
