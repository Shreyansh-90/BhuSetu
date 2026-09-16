import { getAuthenticatedUser } from '@/lib/api/auth';
import { AwardService } from '@/lib/services/awards';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.success) return authResult.response;
    
    const resolvedParams = await params;
    const awards = await AwardService.getAwardsForProject(resolvedParams.projectId);
    return successResponse(awards);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.success) return authResult.response;
    
    const resolvedParams = await params;
    const body = await request.json();
    const award = await AwardService.createAward(resolvedParams.projectId, body);
    return successResponse(award);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}
