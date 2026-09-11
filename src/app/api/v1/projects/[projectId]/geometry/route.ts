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
import { getProjectGeometry } from '@/lib/db/spatial-queries';

async function getGeometry(request: NextRequest, { logger, params }: ApiHandlerContext) {
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

  try {
    const geomResult = await getProjectGeometry(projectId);

    if (!geomResult) {
      return errorResponse('NOT_FOUND', 'No active geometry found for this project.');
    }

    // Build GeoJSON Feature
    const feature = {
      type: 'Feature' as const,
      properties: {
        projectId,
        sourceDataset: geomResult.sourceDataset,
        sourceIdentifier: geomResult.sourceIdentifier,
        sourceVersion: geomResult.sourceVersion,
        sourceDate: geomResult.sourceDate,
        sourceCrs: geomResult.sourceCrs,
        confidence: geomResult.confidence,
        verificationStatus: geomResult.verificationStatus,
      },
      geometry: JSON.parse(geomResult.geometryGeojson),
    };

    return successResponse(feature);
  } catch (err) {
    logger.error('Project geometry query failed.', {
      error: err instanceof Error ? err.message : 'Unknown error',
      projectId,
    });
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve project geometry.');
  }
}

export const GET = apiHandler(getGeometry);
