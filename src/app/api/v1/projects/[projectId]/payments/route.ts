import { apiHandler } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { PaymentService } from '@/lib/services/payments';

export const GET = apiHandler(async (request, context) => {
  const authResult = await getAuthenticatedUser(context.logger);
  if (!authResult.success) {
    return authResult.response;
  }

  // Basic authorization: Project manager, district officer, and admin can view full details
  if (!['admin', 'project_manager', 'district_officer'].includes(authResult.user.role)) {
    return errorResponse('FORBIDDEN', 'You do not have permission to view payments.');
  }

  const projectId = context.params?.projectId;
  if (!projectId || typeof projectId !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required');
  }

  const payments = await PaymentService.getPaymentsForProject(projectId);
  
  return successResponse(payments);
});
