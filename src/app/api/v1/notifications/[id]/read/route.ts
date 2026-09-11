import { apiHandler } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { NotificationService } from '@/lib/services/notifications';

export const PATCH = apiHandler(async (request, context) => {
  const authResult = await getAuthenticatedUser(context.logger);
  if (!authResult.success) {
    return authResult.response;
  }

  const id = context.params?.id;
  if (!id || typeof id !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'Notification ID is required');
  }

  const notification = await NotificationService.markAsRead(id, authResult.user.id);

  if (!notification) {
    return errorResponse('NOT_FOUND', 'Notification not found or access denied');
  }

  return successResponse(notification);
});
