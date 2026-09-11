import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole, requireScope } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { projectIdParamSchema } from '@/lib/dtos/spatial';
import { findProjectIntersections } from '@/lib/db/spatial-queries';

async function getIntersections(request: NextRequest, { logger, params }: ApiHandlerContext) {
  // Auth
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  // Validate params
  const validReq = await validateRequest(
    request,
    { params: projectIdParamSchema },
    params as Record<string, string>,
  );
  if (!validReq.success) return validReq.response;
  const { projectId } = validReq.data.params;

  // Fetch project for existence + scope check
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found.');
  }

  // Scope check
  const scopeError = requireScope(user, {
    stateCode: project.stateCode,
    districtCode: project.districtCode,
  });
  if (scopeError) return scopeError;

  // Run PostGIS intersection query
  try {
    const intersections = await findProjectIntersections(projectId);

    if (intersections.length === 0) {
      return successResponse({
        projectId,
        message: 'No parcel intersections found. The project may have no active geometry or no nearby parcels.',
        intersections: [],
      });
    }

    // Build GeoJSON features
    const features = intersections.map((row) => ({
      type: 'Feature' as const,
      properties: {
        parcelId: row.parcelId,
        surveyNumber: row.surveyNumber,
        village: row.village,
        tehsil: row.tehsil,
        district: row.district,
        stateCode: row.stateCode,
        parcelType: row.parcelType,
        parcelAreaSqm: row.parcelAreaSqm,
        intersectionAreaSqm: Number(row.intersectionAreaSqm),
        overlapPercent: row.overlapPercent ? Number(row.overlapPercent) : null,
      },
      geometry: JSON.parse(row.intersectionGeojson),
    }));

    return successResponse({
      projectId,
      intersections: features,
      count: features.length,
    });
  } catch (err) {
    logger.error('PostGIS intersection query failed.', {
      error: err instanceof Error ? err.message : 'Unknown error',
      projectId,
    });
    return errorResponse('INTERNAL_ERROR', 'Spatial analysis failed.');
  }
}

export const GET = apiHandler(getIntersections);
