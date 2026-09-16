import { getAuthenticatedUser } from '@/lib/api/auth';
import { PaymentService } from '@/lib/services/payments';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.success) return authResult.response;

    const resolvedParams = await params;
    const payments = await PaymentService.getPaymentsForProject(resolvedParams.projectId);
    return successResponse(payments);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}
