import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function markAsRead(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const notifId = params?.id as string;
  if (!notifId) return errorResponse('VALIDATION_ERROR', 'Notification ID required');

  // Mark as read, ensuring user owns it
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.id, notifId),
      eq(notifications.userId, user.id)
    ));

  return successResponse({ success: true });
}

async function markAllAsRead(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const notifId = params?.id as string;

  // Special case: "mark-all-read" pseudo-ID
  if (notifId === 'mark-all-read') {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      ));
    return successResponse({ success: true });
  }

  // Normal case: mark single notification as read
  return markAsRead(request, { logger, params });
}

export const PATCH = apiHandler(markAllAsRead);
