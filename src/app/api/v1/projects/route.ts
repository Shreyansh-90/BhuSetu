import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects, projectGeometries } from '@/lib/db/schema';
import { createProjectSchema } from '@/lib/dtos/projects';
import { eq, desc, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function listProjects(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context;
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;

  // Enforce access control based on user role (viewer and above can list)
  const authzError = requireMinimumRole(authResult.user, 'viewer');
  if (authzError) return authzError;

  // Basic role-based filtering:
  // - Admin, Ministry: see all
  // - State: see projects in their state
  // - District: see projects in their district
  // - Others: might be restricted to their org or created_by
  
  const role = authResult.user.role;
  const stateCode = authResult.user.stateCode;
  const districtCode = authResult.user.districtCode;

  try {
    let query = db.select().from(projects);

    if (role === 'state_officer' && stateCode) {
      query = query.where(eq(projects.stateCode, stateCode)) as any;
    } else if (role === 'district_officer' && districtCode) {
      query = query.where(eq(projects.districtCode, districtCode)) as any;
    } else if (role !== 'admin' && role !== 'ministry_officer') {
      // For field officers, project managers, etc - strictly scoped
      query = query.where(
        and(
          eq(projects.createdBy, authResult.user.id),
          // Fallbacks for safe measure
          stateCode ? eq(projects.stateCode, stateCode) : undefined
        )
      ) as any;
    }

    const results = await query.orderBy(desc(projects.createdAt));
    return successResponse(results);
  } catch (err) {
    logger.error('Failed to list projects', { error: err instanceof Error ? err.message : 'Unknown' });
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch projects');
  }
}

async function createProject(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context;
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;

  // Only project_manager, field_officer, or admin can create draft projects
  const authzError = requireMinimumRole(authResult.user, 'field_officer');
  if (authzError) return authzError;

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('INVALID_REQUEST', 'Invalid project data', parsed.error.format());
    }

    const data = parsed.data;
    
    // We need an organization ID. If not provided, fallback to the user's org.
    const requestingOrgId = data.requestingOrgId || authResult.user.organizationId;
    
    if (!requestingOrgId) {
      return errorResponse('INVALID_REQUEST', 'User is not associated with an organization and no requestingOrgId provided.');
    }

    // 1. Create the project row
    const [newProject] = await db.insert(projects).values({
      title: data.title,
      description: data.description,
      category: data.category,
      purpose: data.purpose,
      stateCode: data.stateCode,
      districtCode: data.districtCode,
      requestingOrgId: requestingOrgId,
      createdBy: authResult.user.id,
      status: 'draft'
    }).returning();

    // 2. Insert dummy Gujarat bounding box geometry for testing purposes (Slice 1 Map test)
    // A small rectangle near Gandhinagar, Gujarat
    const dummyWkt = `POLYGON((72.5 23.0, 72.7 23.0, 72.7 23.2, 72.5 23.2, 72.5 23.0))`;
    
    await db.execute(sql`
      INSERT INTO project_geometries (
        project_id, 
        geometry, 
        source_dataset, 
        source_crs, 
        verification_status, 
        is_active
      ) VALUES (
        ${newProject.id}, 
        ST_GeomFromText(${dummyWkt}, 4326)::geography, 
        'TEST_MOCK_DATA_GUJARAT', 
        'EPSG:4326', 
        'unverified', 
        true
      )
    `);

    logger.info('Project created successfully with dummy geometry', { projectId: newProject.id });
    return successResponse(newProject);
  } catch (err) {
    logger.error('Failed to create project', { error: err instanceof Error ? err.message : 'Unknown error' });
    return errorResponse('INTERNAL_ERROR', 'Failed to create project');
  }
}

export const GET = apiHandler(listProjects);
export const POST = apiHandler(createProject);
