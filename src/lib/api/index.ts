// Barrel export for API infrastructure (B3).
// Use these helpers in all /api/v1 route handlers.

export {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
  type PaginationMeta,
  type ErrorCode,
} from './response';

export {
  getCorrelationId,
  withCorrelationId,
  CORRELATION_HEADER,
} from './correlation';

export {
  createRequestLogger,
  type RequestLogger,
  type LogContext,
} from './logger';

export {
  validateRequest,
  type ValidationSchemas,
  type ValidatedRequest,
} from './validation';

export {
  getAuthenticatedUser,
  type AuthenticatedUser,
  type UserRole,
} from './auth';

export {
  requireRole,
  requireMinimumRole,
  requireScope,
  preventSelfApproval,
  type ScopeRequirement,
} from './authorize';

export {
  parsePagination,
  buildPaginationMeta,
  paginationSchema,
  baseFilterSchema,
  type PaginationInput,
  type PaginationResult,
  type BaseFilterInput,
} from './pagination';

export {
  apiHandler,
  type ApiHandlerContext,
} from './handler';
