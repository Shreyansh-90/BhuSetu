import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects, workflowTasks, auditEvents, userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function submitProject(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { logger } = context;
  const projectId = context.params?.projectId as string;

  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  
  // Must be at least a field officer to submit a project
  const authzError = requireMinimumRole(authResult.user, 'field_officer');
  if (authzError) return authzError;

  try {
    // 1. Get current project
    const projectRows = await db.select().from(projects).where(eq(projects.id, projectId));
    if (projectRows.length === 0) {
      return errorResponse('NOT_FOUND', 'Project not found');
    }
    const project = projectRows[0];

    // 2. Validate state
    if (project.status !== 'draft' && project.status !== 'clarification_requested') {
      return errorResponse('INVALID_STATE', 'Only draft projects or those requesting clarification can be submitted.');
    }

    // 3. Find a higher authority to assign the task to.
    // For demo purposes, we assign it to the first 'district_officer' found in the same district.
    const districtOfficers = await db.select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.role, 'district_officer'))
      .limit(1);

    const assignedTo = districtOfficers.length > 0 ? districtOfficers[0].id : null;

    // 4. Perform the updates (Ideally in a transaction, but we execute sequentially here for simplicity)
    const [updatedProject] = await db.update(projects)
      .set({ 
        status: 'under_scrutiny',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    // 5. Create workflow task
    await db.insert(workflowTasks).values({
      projectId,
      title: 'Scrutinize Project Proposal',
      description: `Review the submitted proposal for ${project.title}`,
      status: 'pending',
      assignedBy: authResult.user.id,
      assignedTo: assignedTo,
    });

    // 6. Log audit event
    await db.insert(auditEvents).values({
      eventType: 'PROJECT_SUBMITTED',
      entityType: 'project',
      entityId: projectId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      oldValues: { status: project.status },
      newValues: { status: 'under_scrutiny' },
    });

    logger.info('Project submitted for scrutiny', { projectId });
    return successResponse(updatedProject);
  } catch (err) {
    logger.error('Failed to submit project', { error: err instanceof Error ? err.message : 'Unknown' });
    return errorResponse('INTERNAL_ERROR', 'Failed to submit project');
  }
}

export const POST = apiHandler(submitProject);
