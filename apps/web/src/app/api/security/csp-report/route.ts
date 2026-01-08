import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * CSP Violation Report Endpoint
 *
 * Receives and logs Content Security Policy violation reports from browsers.
 * This endpoint helps monitor and debug CSP violations in production.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#violation_report_syntax
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json();

    // Extract CSP violation details
    const cspReport = report['csp-report'];

    if (!cspReport) {
      logger.warn({
        msg: 'Invalid CSP report format',
        body: report,
      });
      return NextResponse.json({ error: 'Invalid report format' }, { status: 400 });
    }

    // Log CSP violation with context
    logger.warn({
      msg: 'CSP violation detected',
      violation: {
        documentUri: cspReport['document-uri'],
        violatedDirective: cspReport['violated-directive'],
        effectiveDirective: cspReport['effective-directive'],
        originalPolicy: cspReport['original-policy'],
        blockedUri: cspReport['blocked-uri'],
        sourceFile: cspReport['source-file'],
        lineNumber: cspReport['line-number'],
        columnNumber: cspReport['column-number'],
        statusCode: cspReport['status-code'],
      },
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      timestamp: new Date().toISOString(),
    });

    // Return 204 No Content (standard for CSP reports)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error({
      msg: 'Failed to process CSP report',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Still return 204 to prevent browser retries
    return new NextResponse(null, { status: 204 });
  }
}

// Allow POST without authentication (public endpoint for browsers)
export const dynamic = 'force-dynamic';

// This endpoint should not be cached
export const revalidate = 0;
