/**
 * Structured JSON logger with correlation ID context.
 * Uses console.log/error for output (no external dependency).
 */

export interface LogContext {
  correlationId: string;
  method?: string;
  path?: string;
  userId?: string;
  [key: string]: unknown;
}

type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, context: LogContext, extra?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...extra,
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export function createRequestLogger(context: LogContext) {
  return {
    info: (message: string, extra?: Record<string, unknown>) =>
      log('info', message, context, extra),
    warn: (message: string, extra?: Record<string, unknown>) =>
      log('warn', message, context, extra),
    error: (message: string, extra?: Record<string, unknown>) =>
      log('error', message, context, extra),
  };
}

export type RequestLogger = ReturnType<typeof createRequestLogger>;
