import { z } from 'zod';
import type { PaginationMeta } from './response';

// ---------------------------------------------------------------------------
// Pagination helpers (per shared contract §REST conventions:
// "Use pagination for collections.")
// ---------------------------------------------------------------------------

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Parse pagination parameters from URL search params.
 */
export function parsePagination(searchParams: URLSearchParams): PaginationResult {
  const raw = {
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  };

  const parsed = paginationSchema.safeParse(raw);
  const page = parsed.success ? parsed.data.page : DEFAULT_PAGE;
  const limit = parsed.success ? parsed.data.limit : DEFAULT_LIMIT;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/**
 * Build pagination meta for a response.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ---------------------------------------------------------------------------
// Basic filtering schema helpers
// ---------------------------------------------------------------------------

/**
 * Common filter parameters for list endpoints.
 * Extend per-resource as needed.
 */
export const baseFilterSchema = z.object({
  status: z.string().optional(),
  state_code: z.string().optional(),
  district_code: z.string().optional(),
  search: z.string().optional(),
});

export type BaseFilterInput = z.infer<typeof baseFilterSchema>;
