import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { milestones, auditEvents } from '@/lib/db/schema';
import { updateMilestoneDto } from '@/lib/dtos/milestones';
import { extractClientIp } from '@/lib/api/utils';
import { eq, and } from 'drizzle-orm';

async function updateMilestone(
  request: NextRequest,
  { logger, params }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  // Minimum role to update is field_officer, but we also check assignment/admin later if needed
  const authzError = requireMinimumRole(user, 'field_officer');
  if (authzError) return authzError;

  const validReq = await validateRequest(request, { body: updateMilestoneDto });
  if (!validReq.success) return validReq.response;
  const { body } = validReq.data;
  
  const projectId = params?.projectId as string;
  const milestoneId = params?.milestoneId as string;

  try {
    const existing = await db.query.milestones.findFirst({
      where: and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Milestone not found.');
    }

    // Role check: Only admin, project_manager, or assigned user can update
    if (
      user.role !== 'admin' &&
      user.role !== 'project_manager' &&
      existing.assignedTo !== user.id
    ) {
      return errorResponse('FORBIDDEN', 'You do not have permission to update this milestone.');
    }

    const updated = await db.transaction(async (tx) => {
      const [milestone] = await tx.update(milestones).set({
        ...body,
        updatedAt: new Date(),
      }).where(eq(milestones.id, milestoneId)).returning();

      await tx.insert(auditEvents).values({
        eventType: 'milestone_updated',
        entityType: 'milestone',
        entityId: milestone.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        oldValues: existing,
        newValues: milestone,
      });

      return milestone;
    });

    return successResponse(updated);
  } catch (err) {
    logger.error('Failed to update milestone', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to update milestone.');
  }
}

export const PATCH = apiHandler(updateMilestone);
