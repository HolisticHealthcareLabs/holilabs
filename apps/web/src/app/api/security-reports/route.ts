/**
 * Security Reports Endpoint
 *
 * Receives security violation reports from browsers:
 * - Content Security Policy (CSP) violations
 * - Cross-Origin-Embedder-Policy (COEP) violations
 * - Cross-Origin-Opener-Policy (COOP) violations
 * - Network Error Logging (NEL) reports
 * - Crash reports
 *
 * These reports help identify security issues, misconfigurations, and attacks.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/security-reports
 *
 * Receives security violation reports from browsers.
 * No authentication required (publicly accessible for browser reporting).
 */
export async function POST(request: NextRequest) {
  try {
    const reports = await request.json();

    // Reports come as an array in the format: [{ type, body, ... }, ...]
    const reportArray = Array.isArray(reports) ? reports : [reports];

    for (const report of reportArray) {
      const {
        type,
        url,
        user_agent,
        body,
        age, // Time since violation occurred (ms)
      } = report;

      // Extract relevant violation details
      const violationType = type || body?.type || 'unknown';
      const violatedDirective = body?.['violated-directive'] || body?.directive;
      const blockedURL = body?.['blocked-uri'] || body?.blockedURL;
      const sourceFile = body?.['source-file'] || body?.sourceFile || url;
      const lineNumber = body?.lineNumber || body?.line;
      const columnNumber = body?.columnNumber || body?.column;
      const disposition = body?.disposition || 'enforce';
      const effectiveDirective = body?.['effective-directive'];

      // Log to console for immediate visibility
      logger.warn({
        event: 'security_violation',
        type: violationType,
        violatedDirective,
        blockedURL,
        sourceFile,
        userAgent: user_agent,
        disposition,
        age,
      }, `Security violation: ${violationType}`);

      // Store in database for analysis
      try {
        await prisma.securityReport.create({
          data: {
            type: violationType,
            url: sourceFile?.substring(0, 500) || null,
            userAgent: user_agent?.substring(0, 500) || null,
            violatedDirective: violatedDirective?.substring(0, 200) || null,
            blockedUrl: blockedURL?.substring(0, 500) || null,
            effectiveDirective: effectiveDirective?.substring(0, 200) || null,
            disposition: disposition as 'enforce' | 'report',
            lineNumber: lineNumber ? parseInt(lineNumber, 10) : null,
            columnNumber: columnNumber ? parseInt(columnNumber, 10) : null,
            age: age ? parseInt(age, 10) : null,
            rawReport: body || report,
          },
        });
      } catch (dbError) {
        // Log but don't fail the request if database write fails
        logger.error({
          event: 'security_report_db_error',
          error: dbError,
        }, 'Failed to store security report in database');
      }
    }

    // Always return 204 No Content (browser expects this)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Log error but still return 204 to browser
    logger.error({
      event: 'security_report_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error processing security reports');

    return new NextResponse(null, { status: 204 });
  }
}

/**
 * GET /api/security-reports
 *
 * Health check endpoint (not for browser reporting).
 * Returns 200 OK to confirm endpoint is accessible.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Security reports endpoint is operational',
    accepts: ['POST'],
    reportTypes: ['csp-violation', 'coep', 'coop', 'nel', 'crash'],
  });
}

/**
 * IMPORTANT NOTES:
 *
 * 1. This endpoint is intentionally PUBLIC (no authentication).
 *    Browsers need to send reports without credentials.
 *
 * 2. Rate limiting is NOT applied to allow all violation reports.
 *    High volume of reports may indicate an attack or misconfiguration.
 *
 * 3. Database schema required (add to prisma/schema.prisma):
 *
 *    model SecurityReport {
 *      id                 String   @id @default(cuid())
 *      type               String   // 'csp-violation', 'coep', 'coop', 'nel', etc.
 *      url                String?  // Page where violation occurred
 *      userAgent          String?
 *      violatedDirective  String?  // CSP directive that was violated
 *      blockedUrl         String?  // URL that was blocked
 *      effectiveDirective String?  // Effective CSP directive
 *      disposition        String?  // 'enforce' or 'report'
 *      lineNumber         Int?
 *      columnNumber       Int?
 *      age                Int?     // Time since violation (ms)
 *      rawReport          Json?    // Full report for debugging
 *      createdAt          DateTime @default(now())
 *
 *      @@index([type])
 *      @@index([createdAt])
 *      @@map("security_reports")
 *    }
 *
 * 4. Monitoring recommendations:
 *    - Set up alerts for high volume of reports (>100/hour)
 *    - Daily review of unique violation types
 *    - Track blocked URLs to identify attack patterns
 *    - Monitor for legitimate false positives (fix CSP if needed)
 *
 * 5. Common CSP violations to expect:
 *    - Browser extensions injecting scripts (expected, not a threat)
 *    - CDN resources without proper CORS (fix by adding to CSP)
 *    - Inline event handlers (fix by removing onclick=, etc.)
 *    - Third-party analytics scripts (add to CSP if trusted)
 */
