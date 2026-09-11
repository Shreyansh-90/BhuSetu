import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects, auditEvents } from '@/lib/db/schema';
import { createProjectSchema, projectQuerySchema } from '@/lib/dtos/projects';
import { eq, and, desc, count } from 'drizzle-orm';
import { extractClientIp } from '@/lib/api/utils';

async function listProjects(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  // Validate query parameters
  const validReq = await validateRequest(request, { query: projectQuerySchema });
  if (!validReq.success) return validReq.response;
  const { query } = validReq.data;

  // Authorization: minimum viewer
  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  // Construct filters based on user scope and query params
  const filters = [];

  // Enforce administrative scope
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode) filters.push(eq(projects.stateCode, user.stateCode));
    if (user.districtCode) filters.push(eq(projects.districtCode, user.districtCode));
  }

  if (query.status) filters.push(eq(projects.status, query.status));
  if (query.stateCode) filters.push(eq(projects.stateCode, query.stateCode));
  if (query.districtCode) filters.push(eq(projects.districtCode, query.districtCode));

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const offset = (query.page - 1) * query.limit;

  const [totalCount, rows] = await Promise.all([
    db.select({ value: count() }).from(projects).where(whereClause),
    db.select()
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.createdAt))
      .limit(query.limit)
      .offset(offset),
  ]);

  const total = totalCount[0].value;

  return successResponse(
    rows,
    {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }
  );
}

async function createProject(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  // Only project_manager and above can create projects
  const authzError = requireMinimumRole(user, 'project_manager');
  if (authzError) return authzError;

  const validReq = await validateRequest(request, { body: createProjectSchema });
  if (!validReq.success) return validReq.response;
  const { body } = validReq.data;

  // Enforce scope: user cannot create project in state/district they don't have access to
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && body.stateCode !== user.stateCode) {
      return errorResponse('FORBIDDEN', 'You cannot create projects outside your assigned state.');
    }
    if (user.districtCode && body.districtCode !== user.districtCode) {
      return errorResponse('FORBIDDEN', 'You cannot create projects outside your assigned district.');
    }
  }

  // Ensure user has an organization ID before creating the project
  const orgId = user.organizationId;
  if (!orgId) {
    return errorResponse('FORBIDDEN', 'You must be assigned to an organization to create projects.');
  }

  // Insert project and audit event in a transaction
  try {
    const newProject = await db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({
        title: body.title,
        description: body.description,
        category: body.category,
        purpose: body.purpose,
        stateCode: body.stateCode,
        districtCode: body.districtCode,
        requestingOrgId: orgId,
        acquiringOrgId: body.acquiringOrgId,
        estimatedAreaSqm: body.estimatedAreaSqm,
        createdBy: user.id,
        status: 'draft',
      }).returning();

      await tx.insert(auditEvents).values({
        eventType: 'project_created',
        entityType: 'project',
        entityId: project.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        newValues: project,
      });

      return project;
    });

    return createdResponse(newProject);
  } catch (err) {
    logger.error('Failed to create project', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to create project due to an internal error.');
  }
}

export const GET = apiHandler(listProjects);
export const POST = apiHandler(createProject);
