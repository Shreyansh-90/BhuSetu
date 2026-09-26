import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { parcels, projects, compensations, rehabilitation } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function trackCitizenStatus(request: NextRequest, { logger }: ApiHandlerContext) {
  const { searchParams } = new URL(request.url);
  const ulpin = searchParams.get('ulpin');

  if (!ulpin) {
    return errorResponse('VALIDATION_ERROR', 'ULPIN (Bhu-Aadhaar) is required to track status.');
  }

  // Find parcel
  const parcel = await db.query.parcels.findFirst({
    where: eq(parcels.ulpin, ulpin),
  });

  if (!parcel) {
    return errorResponse('NOT_FOUND', 'No land acquisition record found for this ULPIN.');
  }

  // Find project
  let project = null;
  if (parcel.projectId) {
    project = await db.query.projects.findFirst({
      where: eq(projects.id, parcel.projectId),
    });
  }

  // Find compensation
  const compensation = await db.query.compensations.findFirst({
    where: eq(compensations.parcelId, parcel.id),
  });

  return successResponse({
    parcel: {
      surveyNumber: parcel.surveyNumber,
      village: parcel.village,
      tehsil: parcel.tehsil,
      district: parcel.district,
      stateCode: parcel.stateCode,
      areaSqm: parcel.areaSqm,
      ownerName: parcel.ownerName,
    },
    project: project ? {
      title: project.title,
      status: project.status,
      purpose: project.purpose,
      category: project.category,
    } : null,
    compensation: compensation ? {
      status: compensation.status,
      totalAwardAmount: compensation.totalAwardAmount,
      awardDocumentHash: compensation.awardDocumentHash,
    } : null,
  });
}

// Ensure this route doesn't require authentication in the middleware
// The middleware usually checks /api/v1 routes unless specified otherwise.
// If the middleware enforces auth for all /api/v1, we might need a workaround or a public prefix.
// The problem said "No frontend routes or logic for landowners to track their status."
export const GET = apiHandler(trackCitizenStatus);
