import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { compensations, parcels, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

async function getProjectCompensations(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  // RBAC check
  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  // Scope check
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');

  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (!user.stateCode || project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.role !== 'state_officer') {
      if (!user.districtCode || project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
    }
  }

  // Fetch all parcels for the project
  const projectParcels = await db.select().from(parcels).where(eq(parcels.projectId, projectId));
  
  // Fetch existing compensations
  const existingCompensations = await db.select().from(compensations).where(eq(compensations.projectId, projectId));
  
  // For any parcel that doesn't have a compensation record, calculate a draft one based on RFCTLARR Act
  const results = projectParcels.map(parcel => {
    const comp = existingCompensations.find(c => c.parcelId === parcel.id);
    if (comp) return { ...comp, parcel };
    
    // Draft calculation - User must input these values, defaults are zero
    const baseMarketValue = 0; 
    const multiplicationFactor = 1.0; 
    const valueAfterFactor = baseMarketValue * multiplicationFactor;
    const solatiumAmount = valueAfterFactor; // 100% solatium
    const totalAwardAmount = valueAfterFactor + solatiumAmount;
    
    return {
      id: `draft-${parcel.id}`,
      parcelId: parcel.id,
      projectId,
      baseMarketValue,
      multiplicationFactor,
      solatiumAmount,
      totalAwardAmount,
      status: 'draft',
      parcel
    };
  });

  return successResponse(results);
}

export const GET = apiHandler(getProjectCompensations);

const saveCompensationSchema = z.object({
  parcelId: z.string().uuid(),
  baseMarketValue: z.number().min(0, "Market value cannot be negative"),
  multiplicationFactor: z.number().min(1, "Multiplier must be at least 1.0").max(2, "Multiplier cannot exceed 2.0"),
});

async function saveCompensation(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  const authzError = requireMinimumRole(user, 'project_manager');
  if (authzError) return authzError;

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');

  // Only allow saving before the award is declared
  if (project.status === 'award_declared' || project.status === 'possession_taken') {
    return errorResponse('CONFLICT', 'Cannot modify compensation after award declaration.');
  }

  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (!user.stateCode || project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.role !== 'state_officer') {
      if (!user.districtCode || project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
    }
  }

  const body = await request.json();
  const result = saveCompensationSchema.safeParse(body);
  if (!result.success) return errorResponse('VALIDATION_ERROR', result.error.issues[0].message);

  const { parcelId, baseMarketValue, multiplicationFactor } = result.data;

  const parcel = await db.query.parcels.findFirst({
    where: and(eq(parcels.id, parcelId), eq(parcels.projectId, projectId))
  });

  if (!parcel) return errorResponse('NOT_FOUND', 'Parcel not found in this project.');

  // Strict Server-Side Calculation with precision up to 2 decimal places (paise)
  const valueAfterFactor = Math.round(baseMarketValue * multiplicationFactor * 100) / 100;
  const solatiumAmount = Math.round(valueAfterFactor * 1.0 * 100) / 100; // 100% solatium (Sec 30)
  const totalAwardAmount = Math.round((valueAfterFactor + solatiumAmount) * 100) / 100;

  // Check if it exists
  const existing = await db.query.compensations.findFirst({
    where: and(eq(compensations.parcelId, parcelId), eq(compensations.projectId, projectId))
  });

  if (existing) {
    const [updated] = await db.update(compensations).set({
      baseMarketValue,
      multiplicationFactor,
      solatiumAmount,
      totalAwardAmount,
      status: 'draft',
      updatedAt: new Date()
    }).where(eq(compensations.id, existing.id)).returning();
    return successResponse(updated);
  } else {
    const [inserted] = await db.insert(compensations).values({
      parcelId,
      projectId,
      baseMarketValue,
      multiplicationFactor,
      solatiumAmount,
      totalAwardAmount,
      status: 'draft',
    }).returning();
    return successResponse(inserted);
  }
}

export const POST = apiHandler(saveCompensation);
