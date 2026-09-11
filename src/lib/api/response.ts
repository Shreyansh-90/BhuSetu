import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Stable API response types (per shared contract §REST conventions)
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Machine-readable error codes
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------

export function successResponse<T>(
  data: T,
  meta?: PaginationMeta,
  status = 200,
  headers?: Record<string, string>,
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status, headers });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  headers?: Record<string, string>,
): NextResponse<ApiErrorResponse> {
  const status = STATUS_MAP[code];
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  };
  return NextResponse.json(body, { status, headers });
}

export function createdResponse<T>(
  data: T,
  headers?: Record<string, string>,
): NextResponse<ApiSuccessResponse<T>> {
  return successResponse(data, undefined, 201, headers);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
