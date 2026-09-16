import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getProject(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { logger } = context;
  const projectId = context.params?.projectId as string;

  if (!projectId) {
    return errorResponse('INVALID_REQUEST', 'Project ID is required');
  }

  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;

  // Enforce access control
  const authzError = requireMinimumRole(authResult.user, 'viewer');
  if (authzError) return authzError;

  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return errorResponse('NOT_FOUND', 'Project not found');
    }

    return successResponse(project);
  } catch (err) {
    logger.error('Failed to get project', { error: err instanceof Error ? err.message : 'Unknown' });
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch project');
  }
}

export const GET = apiHandler(getProject);
