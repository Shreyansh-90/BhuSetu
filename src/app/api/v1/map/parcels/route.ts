import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { findParcelsInBbox } from '@/lib/db/spatial-queries';
import { z } from 'zod';

const bboxQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "Invalid bbox format. Expected minLng,minLat,maxLng,maxLat"),
  zoom: z.string().regex(/^\d+(\.\d+)?$/, "Invalid zoom format"),
});

async function getParcels(request: NextRequest, { logger }: ApiHandlerContext) {
  // Auth
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  const url = new URL(request.url);
  const bboxRaw = url.searchParams.get('bbox');
  const zoomRaw = url.searchParams.get('zoom');

  if (!bboxRaw || !zoomRaw) {
    return errorResponse('VALIDATION_ERROR', 'Missing bbox or zoom parameters');
  }

  const parseResult = bboxQuerySchema.safeParse({ bbox: bboxRaw, zoom: zoomRaw });
  if (!parseResult.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid query parameters');
  }

  const [minLng, minLat, maxLng, maxLat] = parseResult.data.bbox.split(',').map(Number);
  const zoom = Number(parseResult.data.zoom);

  // Role-based filtering
  // If user is 'viewer', they can only see their own lands.
  // Other roles can see all parcels within their state/district scope. 
  // (For this endpoint, we'll allow large bbox queries but limited by owner if viewer).
  const ownerFilter = user.role === 'viewer' ? user.fullName : undefined;

  try {
    const { rows } = await findParcelsInBbox(
      minLng,
      minLat,
      maxLng,
      maxLat,
      zoom,
      { ownerName: ownerFilter },
      500, // Limit
      0    // Offset
    );

    const features = rows.map((parcel) => {
      const geometry = parcel.geometryGeojson 
        ? JSON.parse(parcel.geometryGeojson) 
        : null;

      return {
        type: 'Feature' as const,
        geometry,
        properties: {
          parcelId: parcel.parcelId,
          surveyNumber: parcel.surveyNumber,
          village: parcel.village,
          tehsil: parcel.tehsil,
          district: parcel.district,
          stateCode: parcel.stateCode,
          parcelType: parcel.parcelType,
          ownerName: parcel.ownerName,
          areaSqm: parcel.areaSqm,
        },
      };
    }).filter(f => f.geometry !== null);

    const featureCollection = {
      type: 'FeatureCollection' as const,
      features,
    };

    return successResponse(featureCollection);
  } catch (err) {
    logger.error('Parcels bbox query failed.', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve parcels.');
  }
}

export const GET = apiHandler(getParcels);
