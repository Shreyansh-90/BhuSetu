import { randomUUID } from 'crypto';

const CORRELATION_HEADER = 'X-Request-Id';

/**
 * Extract or generate a correlation ID from request headers.
 */
export function getCorrelationId(request: Request): string {
  return request.headers.get(CORRELATION_HEADER) || randomUUID();
}

/**
 * Attach the correlation ID to response headers.
 */
export function withCorrelationId(
  headers: Record<string, string>,
  correlationId: string,
): Record<string, string> {
  return { ...headers, [CORRELATION_HEADER]: correlationId };
}

export { CORRELATION_HEADER };
