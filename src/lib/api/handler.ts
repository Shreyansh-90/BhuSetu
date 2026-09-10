import { type NextRequest, NextResponse } from 'next/server';
import { getCorrelationId, withCorrelationId } from './correlation';
import { createRequestLogger, type RequestLogger } from './logger';
import { errorResponse } from './response';
import type { AuthenticatedUser } from './auth';

// ---------------------------------------------------------------------------
// API route handler wrapper
// ---------------------------------------------------------------------------

export interface ApiHandlerContext {
  correlationId: string;
  logger: RequestLogger;
  params?: Record<string, string | string[]>;
}

type RouteHandlerFn = (
  request: NextRequest,
  context: ApiHandlerContext,
) => Promise<NextResponse>;

/**
 * Wraps a Next.js Route Handler with:
 * 1. Correlation ID extraction/generation
 * 2. Structured request logging (start + end)
 * 3. Unhandled error catching → consistent 500 response
 * 4. Correlation ID in response headers
 */
export function apiHandler(handler: RouteHandlerFn) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string | string[]>> },
  ): Promise<NextResponse> => {
    const correlationId = getCorrelationId(request);
    const url = request.nextUrl;
    const logger = createRequestLogger({
      correlationId,
      method: request.method,
      path: url.pathname,
    });

    const resolvedParams = routeContext?.params ? await routeContext.params : undefined;

    logger.info('Request started.');

    const startTime = Date.now();

    try {
      const response = await handler(request, {
        correlationId,
        logger,
        params: resolvedParams,
      });

      // Attach correlation ID to response
      const corrHeaders = withCorrelationId({}, correlationId);
      for (const [key, value] of Object.entries(corrHeaders)) {
        response.headers.set(key, value);
      }

      const duration = Date.now() - startTime;
      logger.info('Request completed.', {
        status: response.status,
        durationMs: duration,
      });

      return response;
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error('Unhandled error in route handler.', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        durationMs: duration,
      });

      return errorResponse(
        'INTERNAL_ERROR',
        'An unexpected error occurred.',
        undefined,
        withCorrelationId({}, correlationId),
      );
    }
  };
}
