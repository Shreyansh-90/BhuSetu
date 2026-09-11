import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole, requireScope } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { parcelIdParamSchema } from '@/lib/dtos/spatial';
import { getParcelWithGeometry } from '@/lib/db/spatial-queries';
import type { UserRole } from '@/lib/api/auth';

// Roles that can see the sensitive owner_name field
const OWNER_VISIBLE_ROLES: UserRole[] = [
  'admin',
  'ministry_officer',
  'state_officer',
  'district_officer',
];

async function getParcelDetail(request: NextRequest, { logger, params }: ApiHandlerContext) {
  // Auth
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  // Validate params
  const validReq = await validateRequest(
    request,
    { params: parcelIdParamSchema },
    params as Record<string, string>,
  );
  if (!validReq.success) return validReq.response;
  const { parcelId } = validReq.data.params;

  try {
    const parcel = await getParcelWithGeometry(parcelId);

    if (!parcel) {
      return errorResponse('NOT_FOUND', 'Parcel not found.');
    }

    // Scope check against parcel's state
    const scopeError = requireScope(user, { stateCode: parcel.stateCode });
    if (scopeError) return scopeError;

    // Build response — conditionally include owner_name
    const canSeeOwner = OWNER_VISIBLE_ROLES.includes(user.role);

    const responseData: Record<string, unknown> = {
      parcelId: parcel.parcelId,
      surveyNumber: parcel.surveyNumber,
      village: parcel.village,
      tehsil: parcel.tehsil,
      district: parcel.district,
      stateCode: parcel.stateCode,
      parcelType: parcel.parcelType,
      areaSqm: parcel.areaSqm,
      projectId: parcel.projectId,
      acquisitionCaseId: parcel.acquisitionCaseId,
    };

    if (canSeeOwner) {
      responseData.ownerName = parcel.ownerName;
    }

    // Add geometry as GeoJSON if available
    if (parcel.geometryGeojson) {
      responseData.geometry = {
        type: 'Feature' as const,
        geometry: JSON.parse(parcel.geometryGeojson),
        properties: {
          sourceDataset: parcel.sourceDataset,
          sourceCrs: parcel.sourceCrs,
          verificationStatus: parcel.verificationStatus,
          confidence: parcel.confidence,
        },
      };
    }

    return successResponse(responseData);
  } catch (err) {
    logger.error('Parcel detail query failed.', {
      error: err instanceof Error ? err.message : 'Unknown error',
      parcelId,
    });
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve parcel details.');
  }
}

export const GET = apiHandler(getParcelDetail);
