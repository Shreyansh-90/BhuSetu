import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { workflowTasks, notifications, auditEvents } from '@/lib/db/schema';
import { eq, inArray, and, lt } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function checkSla(request: NextRequest, { logger }: ApiHandlerContext) {
  // A simple security check: verify an authorization header for cron
  // For Vercel Cron, you can check request.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`
  const authHeader = request.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return errorResponse('UNAUTHENTICATED', 'Invalid cron secret');
  }

  logger.info('Starting SLA cron check...');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Find all tasks that are pending/assigned/in_progress and overdue
  const overdueTasks = await db.select().from(workflowTasks).where(
    and(
      inArray(workflowTasks.status, ['pending', 'assigned', 'in_progress']),
      lt(workflowTasks.dueDate, today) // dueDate < today
    )
  );

  let escalatedCount = 0;

  for (const task of overdueTasks) {
    // 1. Mark task as escalated
    await db.update(workflowTasks)
      .set({ status: 'escalated', updatedAt: new Date() })
      .where(eq(workflowTasks.id, task.id));

    // 2. Create an alert notification for the assigned user (if any) or project manager
    if (task.assignedTo) {
      await db.insert(notifications).values({
        userId: task.assignedTo,
        type: 'system',
        title: 'SLA Breach: Task Overdue',
        message: `The task "${task.title}" has breached its Service Level Agreement (SLA) due date of ${task.dueDate}. It has been escalated.`,
        isRead: false,
        entityType: 'workflow_task',
        entityId: task.id,
      });
    }

    // 3. Log Audit Event
    await db.insert(auditEvents).values({
      eventType: 'task_escalated',
      entityType: 'workflow_task',
      entityId: task.id,
      actorId: 'system', // System triggered
      actorRole: 'admin',
      actorIp: '127.0.0.1',
      newValues: { status: 'escalated' },
      metadata: { note: 'System automatically escalated task due to SLA breach' }
    });

    escalatedCount++;
  }

  logger.info(`SLA cron check completed. Escalated ${escalatedCount} tasks.`);

  return successResponse({ 
    message: 'SLA check complete', 
    escalatedCount 
  });
}

// In Next.js, API Routes for cron jobs should ideally be GET or POST.
export const GET = apiHandler(checkSla);
export const POST = apiHandler(checkSla);
