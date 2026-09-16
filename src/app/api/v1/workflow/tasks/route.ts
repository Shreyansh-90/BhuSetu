import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { workflowTasks, projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function getTasks(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const rows = await db.select({
    id: workflowTasks.id,
    title: workflowTasks.title,
    description: workflowTasks.description,
    status: workflowTasks.status,
    dueDate: workflowTasks.dueDate,
    createdAt: workflowTasks.createdAt,
    project: {
      id: projects.id,
      title: projects.title,
      status: projects.status
    }
  })
  .from(workflowTasks)
  .leftJoin(projects, eq(workflowTasks.projectId, projects.id))
  .where(eq(workflowTasks.assignedTo, user.id))
  .orderBy(desc(workflowTasks.createdAt));

  return successResponse(rows);
}

export const GET = apiHandler(getTasks);
