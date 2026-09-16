import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

async function getNotifications(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const rows = await db.select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  // Also fetch unread count
  const unreadRes = await db.select({
    count: sql<number>`count(*)`
  })
  .from(notifications)
  .where(and(
    eq(notifications.userId, user.id),
    eq(notifications.isRead, false)
  ));

  return successResponse({
    notifications: rows,
    unreadCount: Number(unreadRes[0]?.count) || 0
  });
}

export const GET = apiHandler(getNotifications);
