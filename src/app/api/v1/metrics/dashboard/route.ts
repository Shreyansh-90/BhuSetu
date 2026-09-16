import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects, workflowTasks } from '@/lib/db/schema';
import { eq, and, not, count } from 'drizzle-orm';

async function getDashboardMetrics(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  // Active Projects (not draft, scoped to user)
  const projectFilters = [not(eq(projects.status, 'draft'))];
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode) projectFilters.push(eq(projects.stateCode, user.stateCode));
    if (user.districtCode) projectFilters.push(eq(projects.districtCode, user.districtCode));
  }

  // Pending Tasks
  const taskFilters = [
    eq(workflowTasks.assignedTo, user.id),
    eq(workflowTasks.status, 'pending')
  ];

  const [activeProjectsRes, pendingTasksRes] = await Promise.all([
    db.select({ value: count() }).from(projects).where(and(...projectFilters)),
    db.select({ value: count() }).from(workflowTasks).where(and(...taskFilters))
  ]);

  return successResponse({
    activeProjects: activeProjectsRes[0].value,
    pendingTasks: pendingTasksRes[0].value,
    unreadNotifications: 0 // Placeholder for Phase 4
  });
}

export const GET = apiHandler(getDashboardMetrics);
