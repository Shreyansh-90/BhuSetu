import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { workflowTasks, projects, userProfiles, auditEvents, notifications, milestones } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getStage, getNextStatus } from '@/lib/workflow/state-machine';
import { extractClientIp } from '@/lib/api/utils';

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
  status: z.enum(['approved', 'rejected']),
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
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Invalid payload. Allowed status: approved | rejected.');
  const { status: action, resolution } = parsed.data;

  // Fetch the task and its project
  const currentTaskRes = await db.select({
    task: workflowTasks,
    project: projects,
  })
  .from(workflowTasks)
  .leftJoin(projects, eq(workflowTasks.projectId, projects.id))
  .where(eq(workflowTasks.id, taskId));

  if (currentTaskRes.length === 0 || !currentTaskRes[0].project) {
    return errorResponse('NOT_FOUND', 'Task not found');
  }

  const task = currentTaskRes[0].task;
  const project = currentTaskRes[0].project;

  if (task.status !== 'pending' && task.status !== 'in_progress') {
    return errorResponse('CONFLICT', 'This task is no longer actionable.');
  }

  // Use state machine to compute the next project status
  const transitionAction = action === 'approved' ? 'approve' : 'reject';
  const nextProjectStatus = getNextStatus(project.status, transitionAction);
  const nextStage = nextProjectStatus ? getStage(nextProjectStatus) : null;

  // Authorization: Check the user has the minimum role for this stage action
  const currentStage = getStage(project.status);
  if (currentStage) {
    const authzError = requireMinimumRole(user, currentStage.minimumRole as Parameters<typeof requireMinimumRole>[1]);
    if (authzError) return authzError;
  }

  // Scope check
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (!user.stateCode || project.stateCode !== user.stateCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this project.');
    }
    if (user.role !== 'state_officer') {
      if (!user.districtCode || project.districtCode !== user.districtCode) {
        return errorResponse('FORBIDDEN', 'You do not have access to this project.');
      }
    }
  }

  await db.transaction(async (tx) => {
    // 1. Complete the current task
    await tx.update(workflowTasks)
      .set({ 
        status: action === 'rejected' ? 'rejected' : 'completed', 
        resolution, 
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflowTasks.id, taskId));

    // 2. Transition the project status
    if (nextProjectStatus) {
      await tx.update(projects)
        .set({ 
          status: nextProjectStatus,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, task.projectId));
    }

    // 3. Create a milestone record for the completed stage
    if (currentStage) {
      await tx.insert(milestones).values({
        projectId: task.projectId,
        title: currentStage.label,
        description: `${currentStage.section}: ${action === 'approved' ? 'Approved' : 'Rejected'}. ${resolution || ''}`.trim(),
        status: 'completed',
        completedDate: new Date().toISOString().split('T')[0],
        sortOrder: currentStage.sortOrder,
      });
    }

    // 4. Create the next workflow task (if the project advanced)
    if (nextStage && nextProjectStatus !== 'closed' && nextProjectStatus !== 'rejected') {
      const dueDateMs = Date.now() + nextStage.slaDays * 24 * 60 * 60 * 1000;
      await tx.insert(workflowTasks).values({
        projectId: task.projectId,
        title: nextStage.taskTitle,
        description: nextStage.taskDescription,
        status: 'pending',
        assignedBy: user.id,
        dueDate: new Date(dueDateMs).toISOString().split('T')[0],
      });
    }

    // 5. Audit event
    await tx.insert(auditEvents).values({
      entityType: 'project',
      entityId: task.projectId,
      eventType: action === 'approved' ? 'stage_approved' : 'stage_rejected',
      actorId: user.id,
      actorRole: user.role,
      actorIp: extractClientIp(request),
      oldValues: { status: project.status },
      newValues: { status: nextProjectStatus },
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        note: resolution,
        section: currentStage?.section,
      },
    });

    // 6. Notify the project creator
    const projectRows = await tx.select({ createdBy: projects.createdBy, title: projects.title })
      .from(projects)
      .where(eq(projects.id, task.projectId));
    
    if (projectRows.length > 0) {
      const proj = projectRows[0];
      const statusLabel = nextStage?.label || nextProjectStatus || 'Unknown';
      await tx.insert(notifications).values({
        userId: proj.createdBy,
        title: action === 'approved' 
          ? `Project "${proj.title}" advanced to: ${statusLabel}` 
          : `Project "${proj.title}" — action required: ${statusLabel}`,
        message: resolution || undefined,
        type: 'status_change',
        entityType: 'project',
        entityId: task.projectId,
      });
    }
  });

  return successResponse({ 
    success: true, 
    newProjectStatus: nextProjectStatus,
    nextStage: nextStage ? { title: nextStage.taskTitle, slaDays: nextStage.slaDays } : null,
  });
}

export const GET = apiHandler(getTask);
export const PATCH = apiHandler(updateTask);
