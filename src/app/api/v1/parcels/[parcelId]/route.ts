import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireMinimumRole } from '@/lib/api/authorize';
import { db } from '@/lib/db';
import { parcels, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
  ulpin: z.string().length(14, "ULPIN must be exactly 14 characters").regex(/^[A-Z0-9]+$/, "ULPIN must be alphanumeric").optional().nullable()
});

async function updateParcel(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const parcelId = params?.parcelId as string;
  if (!parcelId) return errorResponse('VALIDATION_ERROR', 'Parcel ID is required.');

  // RBAC check: only project managers or above can edit parcels
  const authzError = requireMinimumRole(user, 'project_manager');
  if (authzError) return authzError;

  try {
    // Scope check: Ensure the user belongs to the same state/district as the project
    const parcelRecord = await db.query.parcels.findFirst({ where: eq(parcels.id, parcelId) });
    if (!parcelRecord) return errorResponse('NOT_FOUND', 'Parcel not found.');
    
    if (parcelRecord.projectId) {
      const project = await db.query.projects.findFirst({ where: eq(projects.id, parcelRecord.projectId) });
      if (project && user.role !== 'admin' && user.role !== 'ministry_officer') {
        if (!user.stateCode || project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
        if (user.role !== 'state_officer') {
          if (!user.districtCode || project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
        }
      }
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
       return errorResponse('VALIDATION_ERROR', result.error.issues[0].message);
    }

    const [updated] = await db.update(parcels)
      .set({ ulpin: result.data.ulpin, updatedAt: new Date() })
      .where(eq(parcels.id, parcelId))
      .returning();

    return successResponse(updated);
  } catch (err) {
    logger.error('Failed to update parcel', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to update parcel.');
  }
}

export const PATCH = apiHandler(updateParcel);
