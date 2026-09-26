import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { rehabilitation, projects, parcels, auditEvents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { extractClientIp } from '@/lib/api/utils';

async function getRehabilitation(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');

  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.districtCode && project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
  }

  const rows = await db.select().from(rehabilitation).where(eq(rehabilitation.projectId, projectId));
  return successResponse(rows);
}

const createSchema = z.object({
  parcelId: z.string().uuid(),
  familyHeadName: z.string().min(1, 'Family head name is required'),
  category: z.enum(['landowner', 'tenant', 'laborer']),
  housingProvided: z.boolean().default(false),
  employmentProvided: z.boolean().default(false),
  annuityProvided: z.boolean().default(false),
  oneTimeAllowanceAmount: z.number().optional(),
});

async function createRehabilitation(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'rehabilitation_officer');
  if (authzError) return authzError;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');

  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.districtCode && project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
  }

  try {
    const body = await request.json();
    const result = createSchema.safeParse(body);
    if (!result.success) {
       return errorResponse('VALIDATION_ERROR', result.error.issues[0].message);
    }

    // Verify parcel belongs to project
    const parcel = await db.query.parcels.findFirst({
      where: and(eq(parcels.id, result.data.parcelId), eq(parcels.projectId, projectId))
    });
    
    if (!parcel) {
      return errorResponse('NOT_FOUND', 'Parcel not found in this project.');
    }

    // Transaction for creation and audit event
    const inserted = await db.transaction(async (tx) => {
      // Check for duplicates
      const existing = await tx.query.rehabilitation.findFirst({
        where: and(
          eq(rehabilitation.parcelId, result.data.parcelId),
          eq(rehabilitation.familyHeadName, result.data.familyHeadName),
          eq(rehabilitation.category, result.data.category)
        )
      });
      if (existing) {
        throw new Error('DUPLICATE_RECORD');
      }

      const [record] = await tx.insert(rehabilitation).values({
        projectId,
        ...result.data,
      }).returning();

      await tx.insert(auditEvents).values({
        eventType: 'rehabilitation_record_created',
        entityType: 'rehabilitation',
        entityId: record.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        newValues: record,
        metadata: { projectId, parcelId: result.data.parcelId }
      });

      return record;
    });

    return successResponse(inserted);
  } catch (err: any) {
    if (err.message === 'DUPLICATE_RECORD') {
      return errorResponse('CONFLICT', 'An R&R record for this family and parcel already exists.');
    }
    logger.error('Failed to create rehabilitation record', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to create rehabilitation record.');
  }
}

export const GET = apiHandler(getRehabilitation);
export const POST = apiHandler(createRehabilitation);
