/**
 * Error Audit Logging API
 *
 * Logs frontend errors to audit trail for monitoring and compliance
 *
 * @route POST /api/audit/error
 * @compliance LGPD Art. 48 (Security incident notification)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

interface ErrorLogRequest {
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    const body: ErrorLogRequest = await request.json();

    // Log error to audit trail (works for both authenticated and anonymous users)
    await createAuditLog(
      {
        action: 'CREATE', // Using CREATE for error log creation (no ERROR action in enum)
        resource: 'UI',
        resourceId: 'frontend_error',
        details: {
          errorMessage: body.errorMessage,
          errorStack: body.errorStack,
          componentStack: body.componentStack,
          url: body.url || request.nextUrl.href,
          userAgent: body.userAgent || request.headers.get('user-agent'),
          timestamp: body.timestamp,
          userId: session?.user?.id || 'anonymous',
          userEmail: session?.user?.email || 'anonymous',
        },
        success: false,
        errorMessage: body.errorMessage,
      },
      request
    );

    // In production, you might want to send to external error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, Datadog, etc.
      // await sendToErrorTrackingService(body);
    }

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
    });
  } catch (error) {
    console.error('[Error Audit API] Failed to log error:', error);

    // Fallback logging (prevent infinite loop)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to log error to audit trail',
      },
      { status: 500 }
    );
  }
}
