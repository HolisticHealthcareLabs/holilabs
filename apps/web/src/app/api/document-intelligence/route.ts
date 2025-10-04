import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { Deidentifier } from '@/lib/deid/deidentifier';
import { summarizeClinicalDocument } from '@/lib/ai/claude';

/**
 * Document Intelligence API
 *
 * POST /api/document-intelligence
 * Accepts: PDF file or text
 * Process: Extract → De-identify → Analyze with Claude
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const text = formData.get('text') as string | null;
    const documentType = formData.get('documentType') as string | null;

    // Validate input
    if (!file && !text) {
      return NextResponse.json(
        { error: 'Either file or text is required' },
        { status: 400 }
      );
    }

    let extractedText = '';

    // Step 1: Extract text from PDF if file provided
    if (file) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'Only PDF files are supported currently' },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit' },
          { status: 413 }
        );
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;

        if (!extractedText || extractedText.trim().length === 0) {
          return NextResponse.json(
            { error: 'No text could be extracted from PDF' },
            { status: 400 }
          );
        }
      } catch (error: any) {
        console.error('PDF parsing error:', error);
        return NextResponse.json(
          { error: 'Failed to parse PDF', details: error.message },
          { status: 500 }
        );
      }
    } else {
      extractedText = text!;
    }

    // Step 2: De-identify the text
    const deidentifier = new Deidentifier(process.env.DEID_SECRET);
    const deidResult = await deidentifier.deidentify(extractedText, {
      reversible: true,
      auditLog: true,
    });

    const tokenMapExport = deidentifier.exportTokenMap();
    deidentifier.clearMaps();

    // Step 3: Analyze with Claude
    let claudeAnalysis;
    try {
      claudeAnalysis = await summarizeClinicalDocument(
        deidResult.deidentified,
        documentType as any
      );
    } catch (error: any) {
      console.error('Claude API error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze document with AI', details: error.message },
        { status: 500 }
      );
    }

    // Return comprehensive result
    return NextResponse.json({
      success: true,
      extraction: {
        originalLength: extractedText.length,
        extractedText: extractedText.substring(0, 200) + '...', // Preview only
      },
      deidentification: {
        deidentifiedText: deidResult.deidentified,
        phiDetected: deidResult.summary.totalDetected,
        confidenceScore: deidResult.summary.confidenceScore,
        byType: deidResult.summary.byType,
        tokenMapExport, // Store this securely if re-identification needed
      },
      analysis: {
        summary: claudeAnalysis.content,
        model: claudeAnalysis.model,
        usage: claudeAnalysis.usage,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        documentType: documentType || 'general',
        processingSteps: ['extraction', 'de-identification', 'ai-analysis'],
      },
    });
  } catch (error: any) {
    console.error('Document intelligence error:', error);
    return NextResponse.json(
      { error: 'Document processing failed', details: error.message },
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
    service: 'document-intelligence',
    version: '1.0.0',
    capabilities: [
      'pdf-extraction',
      'hipaa-de-identification',
      'claude-ai-analysis',
    ],
  });
}
