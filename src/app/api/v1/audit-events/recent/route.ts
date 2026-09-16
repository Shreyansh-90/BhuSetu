import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function getRecentEvents(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const isGlobal = user.role === 'admin' || user.role === 'ministry_officer';
  
  const filters = [];
  if (!isGlobal) {
    // If not global, just show events caused by this user for now. 
    filters.push(eq(auditEvents.actorId, user.id));
  }

  const whereClause = filters.length > 0 ? filters[0] : undefined;

  const rows = await db.select()
    .from(auditEvents)
    .where(whereClause)
    .orderBy(desc(auditEvents.createdAt))
    .limit(5);
  return successResponse(rows);
}

export const GET = apiHandler(getRecentEvents);
