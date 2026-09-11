import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects, auditEvents, workflowTasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { extractClientIp } from '@/lib/api/utils';

const paramSchema = z.object({
  projectId: z.string().uuid(),
});

async function submitProject(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  // Only project_manager and above can submit
  const authzError = requireMinimumRole(user, 'project_manager');
  if (authzError) return authzError;

  const validReq = await validateRequest(request, { params: paramSchema }, params as Record<string, string>);
  if (!validReq.success) return validReq.response;
  const { projectId } = validReq.data.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found.');
  }

  if (project.status !== 'draft') {
    return errorResponse('CONFLICT', 'Only draft projects can be submitted.');
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

  // Optional: check if all required fields (like estimatedAreaSqm) are filled
  // This depends on the exact business rules. For now, we assume simple transition.

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Update project status
      const [updatedProject] = await tx.update(projects)
        .set({
          status: 'submitted',
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning();

      // 2. Create workflow task for scrutiny
      const [task] = await tx.insert(workflowTasks).values({
        projectId: project.id,
        title: 'Initial Scrutiny',
        description: 'Review the newly submitted project proposal.',
        status: 'pending',
        assignedBy: user.id,
        // Optional: calculate a due date based on SLA
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
      }).returning();

      // 3. Create audit event
      await tx.insert(auditEvents).values({
        eventType: 'project_submitted',
        entityType: 'project',
        entityId: project.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        oldValues: { status: 'draft' },
        newValues: { status: 'submitted', workflowTaskId: task.id },
      });

      return { project: updatedProject, task };
    });

    return successResponse(result);
  } catch (err) {
    logger.error('Failed to submit project', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to submit project.');
  }
}

export const POST = apiHandler(submitProject);
