import { NextResponse } from 'next/server';

interface SafeErrorOptions {
  userMessage?: string;
  status?: number;
  logContext?: Record<string, unknown>;
}

export function safeErrorResponse(
  error: unknown,
  options: SafeErrorOptions = {}
): NextResponse {
  const {
    userMessage = 'Internal server error',
    status = 500,
    logContext,
  } = options;
  const isDev = process.env.NODE_ENV === 'development';

  console.error('[API Error]', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...logContext,
  });

  return NextResponse.json(
    {
      error: userMessage,
      ...(isDev && error instanceof Error
        ? { devMessage: error.message, stack: error.stack }
        : {}),
    },
    { status }
  );
}
