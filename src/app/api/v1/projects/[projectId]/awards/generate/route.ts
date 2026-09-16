import { getAuthenticatedUser } from '@/lib/api/auth';
import { AwardService } from '@/lib/services/awards';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { findProjectIntersections } from '@/lib/db/spatial-queries';
import { CreateAwardRequest } from '@/lib/dtos/awards';

function getBaseRate(parcelType: string | null | undefined): number {
  switch ((parcelType || '').toLowerCase()) {
    case 'agricultural': return 2000;
    case 'commercial': return 15000;
    case 'residential': return 8000;
    default: return 5000;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.success) return authResult.response;
    
    // Only managers and admins can generate awards
    const authzError = requireMinimumRole(authResult.user, 'manager');
    if (authzError) return authzError;

    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    // 1. Fetch intersections (just like the map does)
    const intersections = await findProjectIntersections(projectId);

    if (intersections.length === 0) {
      return errorResponse('BAD_REQUEST', 'No affected parcels found for this project.');
    }

    // 2. Prepare the batch data
    const awardsData: CreateAwardRequest[] = intersections.map((intersection) => {
      const ratePerSqm = getBaseRate(intersection.parcelType);
      const baseAmount = Math.round(intersection.intersectionAreaSqm * ratePerSqm);
      const solatiumAmount = baseAmount * 1.0; // 100% statutory solatium
      const assessedAmount = baseAmount + solatiumAmount;

      return {
        parcelId: intersection.parcelId,
        baseAmount,
        solatiumAmount,
        multiplierUsed: 1.0,
        assessedAmount,
        status: 'draft',
      };
    });

    // 3. Batch insert awards
    const generatedAwards = await AwardService.createAwardsBatch(projectId, awardsData);

    return successResponse({
      message: `Successfully generated ${generatedAwards.length} draft awards.`,
      awards: generatedAwards
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}
