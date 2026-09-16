import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

async function getProjectTimeline(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  const rows = await db.select()
    .from(auditEvents)
    .where(and(
      eq(auditEvents.entityType, 'project'),
      eq(auditEvents.entityId, projectId)
    ))
    .orderBy(asc(auditEvents.createdAt));

  return successResponse(rows);
}

export const GET = apiHandler(getProjectTimeline);
