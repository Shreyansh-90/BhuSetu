import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { milestones, auditEvents } from '@/lib/db/schema';
import { createMilestoneDto } from '@/lib/dtos/milestones';
import { extractClientIp } from '@/lib/api/utils';
import { eq, asc } from 'drizzle-orm';

async function listMilestones(
  request: NextRequest,
  { logger, params }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  
  const authzError = requireMinimumRole(authResult.user, 'viewer');
  if (authzError) return authzError;

  const projectId = params?.projectId as string;

  try {
    const rows = await db.select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.sortOrder), asc(milestones.dueDate));

    return successResponse(rows);
  } catch (err) {
    logger.error('Failed to list milestones', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch milestones.');
  }
}

async function createMilestone(
  request: NextRequest,
  { logger, params }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;
  
  const authzError = requireMinimumRole(user, 'project_manager');
  if (authzError) return authzError;

  const validReq = await validateRequest(request, { body: createMilestoneDto });
  if (!validReq.success) return validReq.response;
  const { body } = validReq.data;
  const projectId = params?.projectId as string;

  try {
    const newMilestone = await db.transaction(async (tx) => {
      const [milestone] = await tx.insert(milestones).values({
        projectId,
        title: body.title,
        description: body.description,
        dueDate: body.dueDate,
        slaDays: body.slaDays,
        assignedTo: body.assignedTo,
        sortOrder: body.sortOrder,
        status: 'pending',
      }).returning();

      await tx.insert(auditEvents).values({
        eventType: 'milestone_created',
        entityType: 'milestone',
        entityId: milestone.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        newValues: milestone,
      });

      return milestone;
    });

    return createdResponse(newMilestone);
  } catch (err) {
    logger.error('Failed to create milestone', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to create milestone.');
  }
}

export const GET = apiHandler(listMilestones);
export const POST = apiHandler(createMilestone);
