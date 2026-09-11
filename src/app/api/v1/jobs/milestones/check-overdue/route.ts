import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { milestones, workflowTasks, auditEvents, projects } from '@/lib/db/schema';
import { extractClientIp } from '@/lib/api/utils';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { format } from 'date-fns';

async function checkOverdueMilestones(
  request: NextRequest,
  { logger }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  // This is a system job endpoint, typically called by a cron scheduler.
  // It should be restricted to admin.
  if (user.role !== 'admin') {
    return errorResponse('FORBIDDEN', 'Only administrators can run system jobs.');
  }

  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Find all milestones that are pending/in_progress and past their dueDate
    const overdueCandidates = await db.select()
      .from(milestones)
      .where(
        and(
          inArray(milestones.status, ['pending', 'in_progress']),
          lt(milestones.dueDate, today)
        )
      );

    if (overdueCandidates.length === 0) {
      return successResponse({ message: 'No overdue milestones found.', count: 0 });
    }

    let escalatedCount = 0;

    // Process each overdue milestone
    for (const milestone of overdueCandidates) {
      await db.transaction(async (tx) => {
        // Mark milestone as overdue
        await tx.update(milestones)
          .set({ status: 'overdue', updatedAt: new Date() })
          .where(eq(milestones.id, milestone.id));

        // Get project to find owner
        const projectRecord = await tx.query.projects.findFirst({
          where: eq(projects.id, milestone.projectId),
        });

        const assignedTo = projectRecord?.createdBy || user.id; // Escalate to project owner

        // Create an escalated workflow task
        const [task] = await tx.insert(workflowTasks).values({
          projectId: milestone.projectId,
          milestoneId: milestone.id,
          title: `Escalation: Overdue Milestone - ${milestone.title}`,
          description: `The milestone "${milestone.title}" has missed its due date of ${milestone.dueDate} and requires immediate attention.`,
          status: 'escalated',
          assignedTo: assignedTo,
          assignedBy: user.id, // System/Admin user
        }).returning();

        // Log audit event
        await tx.insert(auditEvents).values({
          eventType: 'milestone_overdue_escalated',
          entityType: 'milestone',
          entityId: milestone.id,
          actorId: user.id,
          actorRole: user.role,
          actorIp: extractClientIp(request),
          metadata: { taskId: task.id },
        });

        escalatedCount++;
      });
    }

    return successResponse({
      message: `Successfully processed ${escalatedCount} overdue milestones.`,
      count: escalatedCount,
    });
  } catch (err) {
    logger.error('Failed to run check-overdue job', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to process overdue milestones.');
  }
}

export const POST = apiHandler(checkOverdueMilestones);
