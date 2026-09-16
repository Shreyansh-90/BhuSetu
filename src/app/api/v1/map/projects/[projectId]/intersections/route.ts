import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { findProjectIntersections } from '@/lib/db/spatial-queries';

function getBaseRate(parcelType: string | null | undefined): number {
  switch ((parcelType || '').toLowerCase()) {
    case 'agricultural': return 2000;
    case 'commercial': return 15000;
    case 'residential': return 8000;
    default: return 5000;
  }
}

async function getIntersections(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { logger } = context;
  const projectId = context.params?.projectId as string;

  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  
  const authzError = requireMinimumRole(authResult.user, 'viewer');
  if (authzError) return authzError;

  // Viewers can only see their own intersections. Others see all intersections for the project.
  const ownerFilter = authResult.user.role === 'viewer' ? authResult.user.fullName : undefined;

  try {
    const intersections = await findProjectIntersections(projectId, ownerFilter);
    
    const features = intersections.map((intersection) => {
      const geometry = intersection.intersectionGeojson 
        ? JSON.parse(intersection.intersectionGeojson) 
        : null;

      const ratePerSqm = getBaseRate(intersection.parcelType);
      const baseCompensation = Math.round(intersection.intersectionAreaSqm * ratePerSqm);
      const solatium = baseCompensation * 1.0; // 100% statutory solatium
      const totalCompensation = baseCompensation + solatium;

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
          ownerName: intersection.ownerName,
          parcelAreaSqm: intersection.parcelAreaSqm,
          intersectionAreaSqm: intersection.intersectionAreaSqm,
          overlapPercent: intersection.overlapPercent,
          ratePerSqm,
          baseCompensation,
          solatium,
          estimatedCompensation: totalCompensation,
        },
      };
    }).filter(f => f.geometry !== null);

    const featureCollection = {
      type: 'FeatureCollection' as const,
      features,
    };

    return successResponse(featureCollection);
  } catch (err) {
    logger.error('Failed to calculate project intersections', { error: err instanceof Error ? err.message : 'Unknown error' });
    return errorResponse('INTERNAL_ERROR', 'Failed to calculate intersections');
  }
}

export const GET = apiHandler(getIntersections);
