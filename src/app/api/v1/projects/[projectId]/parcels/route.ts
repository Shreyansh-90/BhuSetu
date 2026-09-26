import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { parcels } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function getProjectParcels(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(parcels)
    .where(eq(parcels.projectId, projectId));
  const total = Number(countResult[0]?.count || 0);

  const rows = await db.select()
    .from(parcels)
    .where(eq(parcels.projectId, projectId))
    .limit(limit)
    .offset(offset);

  return successResponse(rows, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  });
}

export const GET = apiHandler(getProjectParcels);
