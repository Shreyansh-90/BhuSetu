import { apiHandler } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/response';
import { NotificationService } from '@/lib/services/notifications';

export const GET = apiHandler(async (request, context) => {
  const authResult = await getAuthenticatedUser(context.logger);
  if (!authResult.success) {
    return authResult.response;
  }

  const notifications = await NotificationService.getNotificationsForUser(authResult.user.id);
  
  return successResponse(notifications);
});
