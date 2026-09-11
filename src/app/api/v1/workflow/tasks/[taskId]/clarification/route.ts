import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole, preventSelfApproval } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { workflowTasks, projects, auditEvents } from '@/lib/db/schema';
import { clarificationSchema } from '@/lib/dtos/workflow';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { extractClientIp } from '@/lib/api/utils';

const paramSchema = z.object({
  taskId: z.string().uuid(),
});

async function addClarification(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const validReq = await validateRequest(request, { 
    params: paramSchema,
    body: clarificationSchema 
  }, params as Record<string, string>);
  if (!validReq.success) return validReq.response;
  const { taskId } = validReq.data.params;
  const body = validReq.data.body;

  const authzError = requireMinimumRole(user, 'viewer'); // Any authenticated officer might add clarification if authorized by scope
  if (authzError) return authzError;

  const [row] = await db.select({
    task: workflowTasks,
    project: projects,
  })
  .from(workflowTasks)
  .leftJoin(projects, eq(workflowTasks.projectId, projects.id))
  .where(eq(workflowTasks.id, taskId))
  .limit(1);

  if (!row || !row.task || !row.project) {
    return errorResponse('NOT_FOUND', 'Workflow task not found.');
  }
  
  const task = row.task;
  const project = row.project;

  if (task.status !== 'pending' && task.status !== 'in_progress') {
    return errorResponse('CONFLICT', 'Clarifications can only be added to open tasks.');
  }

  // Scope check on the underlying project
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && project.stateCode !== user.stateCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this workflow task.');
    }
    if (user.districtCode && project.districtCode !== user.districtCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this workflow task.');
    }
  }

  // If the user is the original submitter (creator) of the project, they shouldn't approve it.
  // But clarification is NOT approval. If this endpoint was 'approve', we would use preventSelfApproval.
  // Here, we just log the clarification. However, we could enforce that only the assigned person can clarify.
  // We'll leave it simple for now, relying on audit trail.

  try {
    const updatedTask = await db.transaction(async (tx) => {
      const [updated] = await tx.update(workflowTasks)
        .set({
          resolution: body.resolution,
          status: 'completed', // For simplicity, clarification resolves this specific task.
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowTasks.id, taskId))
        .returning();

      await tx.insert(auditEvents).values({
        eventType: 'workflow_task_clarification',
        entityType: 'workflow_task',
        entityId: task.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        oldValues: { status: task.status, resolution: task.resolution },
        newValues: { status: 'completed', resolution: body.resolution },
        metadata: { projectId: task.projectId },
      });

      return updated;
    });

    return successResponse(updatedTask);
  } catch (err) {
    logger.error('Failed to add clarification', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to process clarification.');
  }
}

export const POST = apiHandler(addClarification);
