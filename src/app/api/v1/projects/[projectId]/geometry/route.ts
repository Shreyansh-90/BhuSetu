import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getProjectGeometry } from '@/lib/db/spatial-queries';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getGeometry(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { logger } = context;
  const projectId = context.params?.projectId as string;

  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  
  const authzError = requireMinimumRole(authResult.user, 'viewer');
  if (authzError) return authzError;

  // Ensure project exists
  const projectRows = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
  if (projectRows.length === 0) {
    return errorResponse('NOT_FOUND', 'Project not found');
  }

  try {
    const projectGeo = await getProjectGeometry(projectId);
    
    if (!projectGeo) {
      return successResponse(null); // No geometry yet
    }

    const feature = {
      type: 'Feature' as const,
      geometry: JSON.parse(projectGeo.geometryGeojson),
      properties: {
        id: projectGeo.id,
        sourceDataset: projectGeo.sourceDataset,
        sourceIdentifier: projectGeo.sourceIdentifier,
        sourceVersion: projectGeo.sourceVersion,
        sourceDate: projectGeo.sourceDate,
        sourceCrs: projectGeo.sourceCrs,
        confidence: projectGeo.confidence,
        verificationStatus: projectGeo.verificationStatus
      }
    };

    return successResponse(feature);
  } catch (err) {
    logger.error('Failed to get project geometry', { error: err instanceof Error ? err.message : 'Unknown error' });
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve project geometry');
  }
}

export const GET = apiHandler(getGeometry);
