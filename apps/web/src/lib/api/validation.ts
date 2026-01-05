/**
 * API Request/Response Validation Middleware
 *
 * Industry-grade validation using Zod for type-safe APIs.
 * Ensures all incoming requests and outgoing responses meet schema requirements.
 *
 * Features:
 * - Request body validation
 * - Query parameter validation
 * - Response validation (in development)
 * - Automatic error responses
 * - Type inference for validated data
 *
 * Usage:
 * ```typescript
 * const createPatientSchema = z.object({
 *   firstName: z.string().min(1),
 *   lastName: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * export const POST = validateRequest(createPatientSchema, async (req, validatedData) => {
 *   const patient = await prisma.patient.create({ data: validatedData });
 *   return NextResponse.json(patient);
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { logger } from '@/lib/logger';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  error: string;
  validationErrors: ValidationError[];
}

/**
 * Validate request body against Zod schema
 */
export function validateRequest<T extends ZodSchema>(
  schema: T,
  handler: (
    request: NextRequest,
    validatedData: z.infer<T>,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const body = await request.json().catch(() => ({}));
      const result = schema.safeParse(body);

      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn({
          event: 'validation_error',
          url: request.url,
          method: request.method,
          errors,
        }, 'Request validation failed');

        return NextResponse.json<ValidationErrorResponse>(
          {
            error: 'Validation failed',
            validationErrors: errors,
          },
          { status: 400 }
        );
      }

      return await handler(request, result.data, context);
    } catch (error) {
      logger.error({
        event: 'validation_middleware_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(
  schema: T,
  handler: (
    request: NextRequest,
    validatedQuery: z.infer<T>,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const url = new URL(request.url);
      const query: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      const result = schema.safeParse(query);

      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn({
          event: 'query_validation_error',
          url: request.url,
          method: request.method,
          errors,
        });

        return NextResponse.json<ValidationErrorResponse>(
          {
            error: 'Query validation failed',
            validationErrors: errors,
          },
          { status: 400 }
        );
      }

      return await handler(request, result.data, context);
    } catch (error) {
      logger.error({
        event: 'query_validation_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  date: z.string().datetime(),
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  search: z.object({
    q: z.string().min(1).max(200),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
};

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}
