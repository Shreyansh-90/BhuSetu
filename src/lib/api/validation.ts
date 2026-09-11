import { type NextRequest } from 'next/server';
import { type ZodType, type ZodError } from 'zod';
import { errorResponse } from './response';

// ---------------------------------------------------------------------------
// Request validation helpers (per shared contract §REST conventions:
// "Validate request bodies, query parameters, and path parameters at the
// API boundary.")
// ---------------------------------------------------------------------------

export interface ValidationSchemas<TBody = unknown, TParams = unknown, TQuery = unknown> {
  body?: ZodType<TBody>;
  params?: ZodType<TParams>;
  query?: ZodType<TQuery>;
}

export interface ValidatedRequest<TBody = unknown, TParams = unknown, TQuery = unknown> {
  body: TBody;
  params: TParams;
  query: TQuery;
}

/**
 * Format Zod errors into a human-readable details array.
 * Never exposes raw values — only field names and error messages.
 */
function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validate incoming request data against Zod schemas.
 *
 * @returns Either the validated data or a 422 error NextResponse.
 */
export async function validateRequest<TBody = unknown, TParams = unknown, TQuery = unknown>(
  request: NextRequest,
  schemas: ValidationSchemas<TBody, TParams, TQuery>,
  routeParams?: Record<string, string | string[]>,
): Promise<
  | { success: true; data: ValidatedRequest<TBody, TParams, TQuery> }
  | { success: false; response: ReturnType<typeof errorResponse> }
> {
  const errors: Array<{ field: string; message: string }> = [];

  // --- Body ---
  let body: TBody = undefined as TBody;
  if (schemas.body) {
    try {
      const rawBody = await request.json();
      const result = schemas.body.safeParse(rawBody);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error));
      } else {
        body = result.data;
      }
    } catch {
      errors.push({ field: '(body)', message: 'Invalid or missing JSON body.' });
    }
  }

  // --- Params ---
  let params: TParams = undefined as TParams;
  if (schemas.params && routeParams) {
    const result = schemas.params.safeParse(routeParams);
    if (!result.success) {
      errors.push(...formatZodErrors(result.error));
    } else {
      params = result.data;
    }
  }

  // --- Query ---
  let query: TQuery = undefined as TQuery;
  if (schemas.query) {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = schemas.query.safeParse(searchParams);
    if (!result.success) {
      errors.push(...formatZodErrors(result.error));
    } else {
      query = result.data;
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      response: errorResponse('VALIDATION_ERROR', 'Request validation failed.', errors),
    };
  }

  return {
    success: true,
    data: { body, params, query },
  };
}
