import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects, auditEvents } from '@/lib/db/schema';
import { updateProjectSchema } from '@/lib/dtos/projects';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { extractClientIp } from '@/lib/api/utils';

const paramSchema = z.object({
  projectId: z.string().uuid(),
});

async function getProjectDetail(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const validReq = await validateRequest(request, { params: paramSchema }, params as Record<string, string>);
  if (!validReq.success) return validReq.response;
  const { projectId } = validReq.data.params;

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found.');
  }

  // Scope check
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && project.stateCode !== user.stateCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this project.');
    }
    if (user.districtCode && project.districtCode !== user.districtCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this project.');
    }
  }

  return successResponse(project);
}

async function updateProjectDraft(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'project_manager');
  if (authzError) return authzError;

  const validReq = await validateRequest(request, { 
    params: paramSchema,
    body: updateProjectSchema 
  }, params as Record<string, string>);
  if (!validReq.success) return validReq.response;
  const { projectId } = validReq.data.params;
  const body = validReq.data.body;

  if (Object.keys(body).length === 0) {
    return errorResponse('VALIDATION_ERROR', 'No fields provided to update.');
  }

  // Find project and verify ownership/scope and status
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found.');
  }

  if (project.status !== 'draft') {
    return errorResponse('CONFLICT', 'Only draft projects can be updated directly.');
  }

  // Scope check
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && project.stateCode !== user.stateCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this project.');
    }
    if (user.districtCode && project.districtCode !== user.districtCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this project.');
    }
  }

  try {
    const updatedProject = await db.transaction(async (tx) => {
      const [updated] = await tx.update(projects)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning();

      await tx.insert(auditEvents).values({
        eventType: 'project_updated',
        entityType: 'project',
        entityId: project.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        oldValues: project,
        newValues: updated,
      });

      return updated;
    });

    return successResponse(updatedProject);
  } catch (err) {
    logger.error('Failed to update project', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to update project.');
  }
}

export const GET = apiHandler(getProjectDetail);
export const PATCH = apiHandler(updateProjectDraft);
