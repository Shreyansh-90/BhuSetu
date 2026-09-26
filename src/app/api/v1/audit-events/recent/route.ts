import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

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

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '5', 10); // default to 5 for "recent"
  const offset = (page - 1) * limit;

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);

  const rows = await db.select()
    .from(auditEvents)
    .where(whereClause)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit)
    .offset(offset);
    
  return successResponse(rows, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  });
}

export const GET = apiHandler(getRecentEvents);
