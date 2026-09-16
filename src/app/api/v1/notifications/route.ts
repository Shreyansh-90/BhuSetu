import { getAuthenticatedUser } from '@/lib/api/auth';
import { NotificationService } from '@/lib/services/notifications';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.success) return authResult.response;

    const notifications = await NotificationService.getNotificationsForUser(authResult.user.id);
    return successResponse(notifications);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}
