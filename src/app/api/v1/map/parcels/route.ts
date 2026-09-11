import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { buildPaginationMeta } from '@/lib/api/pagination';
import { bboxQuerySchema } from '@/lib/dtos/spatial';
import { findParcelsInBbox } from '@/lib/db/spatial-queries';

async function getParcelsInBbox(request: NextRequest, { logger }: ApiHandlerContext) {
  // Auth
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  // Validate query params
  const validReq = await validateRequest(request, { query: bboxQuerySchema });
  if (!validReq.success) return validReq.response;

  const { bbox, zoom, parcelType, stateCode, page, limit } = validReq.data.query;
  const offset = (page - 1) * limit;

  try {
    const { rows, total } = await findParcelsInBbox(
      bbox.minLng,
      bbox.minLat,
      bbox.maxLng,
      bbox.maxLat,
      zoom,
      { parcelType, stateCode },
      limit,
      offset,
    );

    // Build GeoJSON FeatureCollection
    const features = rows.map((row) => ({
      type: 'Feature' as const,
      properties: {
        parcelId: row.parcelId,
        surveyNumber: row.surveyNumber,
        village: row.village,
        tehsil: row.tehsil,
        district: row.district,
        stateCode: row.stateCode,
        parcelType: row.parcelType,
        areaSqm: row.areaSqm,
        // owner_name deliberately excluded from map responses
      },
      geometry: row.geometryGeojson ? JSON.parse(row.geometryGeojson) : null,
    }));

    const featureCollection = {
      type: 'FeatureCollection' as const,
      features,
    };

    const meta = buildPaginationMeta(total, page, limit);

    return successResponse(featureCollection, meta);
  } catch (err) {
    logger.error('Bbox parcel query failed.', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return errorResponse('INTERNAL_ERROR', 'Parcel query failed.');
  }
}

export const GET = apiHandler(getParcelsInBbox);
