import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { workflowTasks, projects, userProfiles, auditEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

async function getTask(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  
  const taskId = params?.taskId as string;
  if (!taskId) return errorResponse('VALIDATION_ERROR', 'Task ID required');

  const rows = await db.select({
    task: workflowTasks,
    project: projects,
    assignedBy: userProfiles
  })
  .from(workflowTasks)
  .leftJoin(projects, eq(workflowTasks.projectId, projects.id))
  .leftJoin(userProfiles, eq(workflowTasks.assignedBy, userProfiles.id))
  .where(eq(workflowTasks.id, taskId));

  if (rows.length === 0) return errorResponse('NOT_FOUND', 'Task not found');

  return successResponse(rows[0]);
}

const patchSchema = z.object({
  status: z.enum(['completed', 'approved', 'rejected']),
  resolution: z.string().optional()
});

async function updateTask(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const taskId = params?.taskId as string;
  if (!taskId) return errorResponse('VALIDATION_ERROR', 'Task ID required');

  let body;
  try { body = await request.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Invalid JSON'); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Invalid payload');
  const { status, resolution } = parsed.data;

  const currentTaskRes = await db.select().from(workflowTasks).where(eq(workflowTasks.id, taskId));
  if (currentTaskRes.length === 0) return errorResponse('NOT_FOUND', 'Task not found');
  const task = currentTaskRes[0];

  const targetTaskStatus = status === 'rejected' ? 'rejected' : 'completed';

  await db.transaction(async (tx) => {
    // 1. Update Task
    await tx.update(workflowTasks)
      .set({ 
        status: targetTaskStatus, 
        resolution, 
        completedAt: new Date() 
      })
      .where(eq(workflowTasks.id, taskId));

    // 2. Update Project (if approved or rejected)
    if (status === 'approved' || status === 'rejected') {
      const projectStatus = status === 'approved' ? 'approved' : 'rejected';
      await tx.update(projects)
        .set({ status: projectStatus })
        .where(eq(projects.id, task.projectId));

      // 3. Log Audit Event
      await tx.insert(auditEvents).values({
        entityType: 'project',
        entityId: task.projectId,
        eventType: status === 'approved' ? 'task_approved' : 'task_rejected',
        actorId: user.id,
        actorRole: user.role,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          note: resolution
        }
      });
    }
  });

  return successResponse({ success: true });
}

export const GET = apiHandler(getTask);
export const PATCH = apiHandler(updateTask);
