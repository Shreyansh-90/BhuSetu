import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { projects, parcels, projectGeometries, parcelGeometries, auditEvents } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { extractClientIp } from '@/lib/api/utils';

const paramSchema = z.object({
  projectId: z.string().uuid(),
});

async function getProjectSpatial(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const validReq = await validateRequest(request, { params: paramSchema }, params as Record<string, string>);
  if (!validReq.success) return validReq.response;
  const { projectId } = validReq.data.params;

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found.');
  }

  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (!user.stateCode || project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.role !== 'state_officer') {
      if (!user.districtCode || project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
    }
  }

  // Fetch project geometry as GeoJSON
  const projectGeoResult = await db.execute(sql`
    SELECT id, ST_AsGeoJSON(geometry) as geojson
    FROM project_geometries
    WHERE project_id = ${projectId} AND is_active = true
    LIMIT 1
  `);

  let projectGeometry = null;
  if (projectGeoResult.length > 0) {
    projectGeometry = JSON.parse(projectGeoResult[0].geojson as string);
  }

  // Fetch parcel geometries as GeoJSON
  const parcelGeoResult = await db.execute(sql`
    SELECT pg.id, p.parcel_type, p.survey_number, ST_AsGeoJSON(pg.geometry) as geojson
    FROM parcel_geometries pg
    JOIN parcels p ON p.id = pg.parcel_id
    WHERE p.project_id = ${projectId} AND pg.is_active = true
  `);

  const parcelGeometries = parcelGeoResult.map((row: any) => ({
    type: 'Feature',
    geometry: JSON.parse(row.geojson),
    properties: {
      id: row.id,
      parcelType: row.parcel_type,
      surveyNumber: row.survey_number
    }
  }));

  return successResponse({
    projectGeometry,
    parcelGeometries
  });
}

export const GET = apiHandler(getProjectSpatial);

const postSpatialSchema = z.object({
  projectGeoJson: z.record(z.string(), z.any()).nullable().optional(),
  parcels: z.array(z.object({
    ulpin: z.string().optional().nullable(),
    surveyNumber: z.string().optional().nullable(),
    ownerName: z.string().optional().nullable(),
    village: z.string().optional().nullable(),
    tehsil: z.string().optional().nullable(),
    areaSqm: z.number().optional().nullable(),
    geoJson: z.record(z.string(), z.any()),
  })),
});

async function createProjectSpatial(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const validReq = await validateRequest(request, { params: paramSchema }, params as Record<string, string>);
  if (!validReq.success) return validReq.response;
  const { projectId } = validReq.data.params;

  const authzError = requireMinimumRole(user, 'project_manager');
  if (authzError) return authzError;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');
  if (project.status !== 'draft') return errorResponse('CONFLICT', 'GIS data can only be modified in draft state.');

  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (!user.stateCode || project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.role !== 'state_officer') {
      if (!user.districtCode || project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
    }
  }

  try {
    const body = await request.json();
    const result = postSpatialSchema.safeParse(body);
    if (!result.success) return errorResponse('VALIDATION_ERROR', result.error.issues[0].message);
    const data = result.data;

    await db.transaction(async (tx) => {
      // 1. Invalidate old geometries
      await tx.execute(sql`UPDATE project_geometries SET is_active = false WHERE project_id = ${projectId}`);
      await tx.execute(sql`
        UPDATE parcel_geometries 
        SET is_active = false 
        WHERE parcel_id IN (SELECT id FROM parcels WHERE project_id = ${projectId})
      `);

      // 2. Insert project geometry (let PostGIS validate it)
      if (data.projectGeoJson) {
        await tx.execute(sql`
          INSERT INTO project_geometries (project_id, geometry)
          VALUES (${projectId}, ST_GeomFromGeoJSON(${JSON.stringify(data.projectGeoJson)}))
        `);
      }

      // 3. Insert parcels and their geometries
      for (const p of data.parcels) {
        const [insertedParcel] = await tx.insert(parcels).values({
          projectId,
          ulpin: p.ulpin || undefined,
          surveyNumber: p.surveyNumber || null,
          ownerName: p.ownerName || null,
          village: p.village || null,
          tehsil: p.tehsil || null,
          areaSqm: p.areaSqm || null,
          district: project.districtCode,
          stateCode: project.stateCode,
        }).returning();

        await tx.execute(sql`
          INSERT INTO parcel_geometries (parcel_id, geometry)
          VALUES (${insertedParcel.id}, ST_GeomFromGeoJSON(${JSON.stringify(p.geoJson)}))
        `);
      }

      await tx.insert(auditEvents).values({
        eventType: 'gis_data_uploaded',
        entityType: 'project',
        entityId: projectId,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        metadata: { parcelsCount: data.parcels.length, updatedProjectGeo: !!data.projectGeoJson }
      });
    });

    return successResponse({ message: 'Spatial data successfully updated' });
  } catch (err: any) {
    logger.error('Failed to create spatial data', { error: err });
    
    // Check if it's a PostGIS invalid geometry error
    if (err.message?.includes('parse error') || err.message?.includes('Geometry')) {
      return errorResponse('VALIDATION_ERROR', 'Invalid GeoJSON geometry provided.');
    }
    
    return errorResponse('INTERNAL_ERROR', 'Failed to create spatial data.');
  }
}

export const POST = apiHandler(createProjectSpatial);
