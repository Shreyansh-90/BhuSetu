import { apiHandler } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response';
import { AwardService } from '@/lib/services/awards';
import { CreateAwardRequestSchema } from '@/lib/dtos/awards';

export const GET = apiHandler(async (request, context) => {
  const authResult = await getAuthenticatedUser(context.logger);
  if (!authResult.success) {
    return authResult.response;
  }

  const projectId = context.params?.projectId;
  if (!projectId || typeof projectId !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required');
  }

  const awards = await AwardService.getAwardsForProject(projectId);
  
  return successResponse(awards);
});

export const POST = apiHandler(async (request, context) => {
  const authResult = await getAuthenticatedUser(context.logger);
  if (!authResult.success) {
    return authResult.response;
  }

  // Basic authorization: Project manager, district officer, and admin can assess and award
  if (!['admin', 'project_manager', 'district_officer'].includes(authResult.user.role)) {
    return errorResponse('FORBIDDEN', 'You do not have permission to create an award.');
  }

  const projectId = context.params?.projectId;
  if (!projectId || typeof projectId !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required');
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parseResult = CreateAwardRequestSchema.safeParse(body);
  if (!parseResult.success) {
    console.error(parseResult.error);
    return errorResponse('VALIDATION_ERROR', 'Invalid request body');
  }

  const award = await AwardService.createAward(projectId, parseResult.data);
  return createdResponse(award);
});
