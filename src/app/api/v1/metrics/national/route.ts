import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { ne, sql } from 'drizzle-orm';

async function getNationalMetrics(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  
  const user = authResult.user;
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    return errorResponse('FORBIDDEN', 'Insufficient permissions to view national dashboard');
  }

  // Aggregate Total Area and Total Projects (excluding drafts)
  const totalsRes = await db
    .select({
      totalProjects: sql<number>`count(*)`,
      totalAreaSqm: sql<number>`sum(${projects.estimatedAreaSqm})`
    })
    .from(projects)
    .where(ne(projects.status, 'draft'));

  const totals = totalsRes[0] || { totalProjects: 0, totalAreaSqm: 0 };

  // Aggregate Projects by Status
  const statusDistRes = await db
    .select({
      status: projects.status,
      count: sql<number>`count(*)`
    })
    .from(projects)
    .where(ne(projects.status, 'draft'))
    .groupBy(projects.status);

  // Aggregate Projects by State
  const stateDistRes = await db
    .select({
      stateCode: projects.stateCode,
      count: sql<number>`count(*)`
    })
    .from(projects)
    .where(ne(projects.status, 'draft'))
    .groupBy(projects.stateCode);

  return successResponse({
    overview: {
      totalProjects: Number(totals.totalProjects) || 0,
      totalAreaSqm: Number(totals.totalAreaSqm) || 0,
    },
    byStatus: statusDistRes.map(s => ({ status: s.status, count: Number(s.count) })),
    byState: stateDistRes.map(s => ({ stateCode: s.stateCode, count: Number(s.count) }))
  });
}

export const GET = apiHandler(getNationalMetrics);
