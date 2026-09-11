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

  const ownerFilter = user.role === 'viewer' ? user.fullName : undefined;

  try {
    const intersections = await findProjectIntersections(projectId, ownerFilter);

    // Map PostGIS rows to a standard GeoJSON FeatureCollection
    const features = intersections.map((intersection) => {
      // Parse the GeoJSON string returned by PostGIS ST_AsGeoJSON
      const geometry = intersection.intersectionGeojson 
        ? JSON.parse(intersection.intersectionGeojson) 
        : null;

      return {
        type: 'Feature' as const,
        geometry,
        properties: {
          parcelId: intersection.parcelId,
          surveyNumber: intersection.surveyNumber,
          village: intersection.village,
          tehsil: intersection.tehsil,
          district: intersection.district,
          stateCode: intersection.stateCode,
          parcelType: intersection.parcelType,
          parcelAreaSqm: intersection.parcelAreaSqm,
          intersectionAreaSqm: intersection.intersectionAreaSqm,
          overlapPercent: intersection.overlapPercent,
        },
      };
    }).filter(f => f.geometry !== null); // Drop rows without valid geometries

    const featureCollection = {
      type: 'FeatureCollection' as const,
      features,
    };

    return successResponse(featureCollection);
  } catch (err) {
    logger.error('Project intersections query failed.', {
      error: err instanceof Error ? err.message : 'Unknown error',
      projectId,
    });
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve project intersections.');
  }
}

export const GET = apiHandler(getIntersections);
