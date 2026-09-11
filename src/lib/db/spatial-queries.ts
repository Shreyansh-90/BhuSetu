import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from './index';

// ---------------------------------------------------------------------------
// PostGIS raw SQL query helpers
//
// These use db.execute(sql`...`) because Drizzle ORM does not natively
// support PostGIS spatial functions like ST_Intersects, ST_Intersection,
// ST_Area, ST_AsGeoJSON, ST_MakeEnvelope, or ST_SimplifyPreserveTopology.
//
// Schema reference: docs/database-schema.md
// Geometry type: geography(Geometry, 4326) — GiST-indexed, is_active filtered.
// ---------------------------------------------------------------------------

/**
 * Compute zoom-based simplification tolerance.
 * Roughly 1 pixel at the given zoom level in degrees.
 */
function simplificationTolerance(zoom: number): number {
  return 180 / (Math.pow(2, zoom) * 256);
}

// ---------------------------------------------------------------------------
// 1. Find all parcel intersections for a project's active geometry
// ---------------------------------------------------------------------------

export interface IntersectionResult {
  parcelId: string;
  surveyNumber: string | null;
  village: string | null;
  tehsil: string | null;
  district: string;
  stateCode: string;
  parcelType: string;
  parcelAreaSqm: number | null;
  intersectionAreaSqm: number;
  overlapPercent: number | null;
  intersectionGeojson: string;
}

export async function findProjectIntersections(projectId: string): Promise<IntersectionResult[]> {
  const result = await db.execute(sql`
    SELECT
      p.id                AS "parcelId",
      p.survey_number     AS "surveyNumber",
      p.village           AS "village",
      p.tehsil            AS "tehsil",
      p.district          AS "district",
      p.state_code        AS "stateCode",
      p.parcel_type       AS "parcelType",
      p.area_sqm          AS "parcelAreaSqm",
      ST_Area(
        ST_Intersection(pg.geometry::geometry, pag.geometry::geometry)::geography
      )                   AS "intersectionAreaSqm",
      CASE
        WHEN p.area_sqm IS NOT NULL AND p.area_sqm > 0
        THEN (ST_Area(
          ST_Intersection(pg.geometry::geometry, pag.geometry::geometry)::geography
        ) / p.area_sqm) * 100
        ELSE NULL
      END                 AS "overlapPercent",
      ST_AsGeoJSON(
        ST_Intersection(pg.geometry::geometry, pag.geometry::geometry)
      )                   AS "intersectionGeojson"
    FROM project_geometries pg
    JOIN parcel_geometries pag ON pag.is_active = true
    JOIN parcels p ON p.id = pag.parcel_id
    WHERE pg.project_id = ${projectId}
      AND pg.is_active = true
      AND ST_Intersects(pg.geometry, pag.geometry)
    ORDER BY "intersectionAreaSqm" DESC
  `);

  return result as unknown as IntersectionResult[];
}

// ---------------------------------------------------------------------------
// 2. Find parcels within a bounding box (viewport query)
// ---------------------------------------------------------------------------

export interface BboxParcelResult {
  parcelId: string;
  surveyNumber: string | null;
  village: string | null;
  tehsil: string | null;
  district: string;
  stateCode: string;
  parcelType: string;
  areaSqm: number | null;
  geometryGeojson: string;
}

export async function findParcelsInBbox(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  zoom: number,
  filters: { parcelType?: string; stateCode?: string },
  limit: number,
  offset: number,
): Promise<{ rows: BboxParcelResult[]; total: number }> {
  const tolerance = simplificationTolerance(zoom);

  // Build WHERE conditions
  const conditions = sql`
    pag.is_active = true
    AND ST_Intersects(
      pag.geometry,
      ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography
    )
  `;

  // Count query
  const countResult = await db.execute(sql`
    SELECT COUNT(DISTINCT p.id) AS total
    FROM parcel_geometries pag
    JOIN parcels p ON p.id = pag.parcel_id
    WHERE ${conditions}
      ${filters.parcelType ? sql`AND p.parcel_type = ${filters.parcelType}` : sql``}
      ${filters.stateCode ? sql`AND p.state_code = ${filters.stateCode}` : sql``}
      AND p.archived_at IS NULL
  `);

  const total = Number((countResult[0] as unknown as { total: string })?.total ?? 0);

  // Data query with simplified geometry
  const dataResult = await db.execute(sql`
    SELECT
      p.id                AS "parcelId",
      p.survey_number     AS "surveyNumber",
      p.village           AS "village",
      p.tehsil            AS "tehsil",
      p.district          AS "district",
      p.state_code        AS "stateCode",
      p.parcel_type       AS "parcelType",
      p.area_sqm          AS "areaSqm",
      ST_AsGeoJSON(
        ST_SimplifyPreserveTopology(pag.geometry::geometry, ${tolerance})
      )                   AS "geometryGeojson"
    FROM parcel_geometries pag
    JOIN parcels p ON p.id = pag.parcel_id
    WHERE ${conditions}
      ${filters.parcelType ? sql`AND p.parcel_type = ${filters.parcelType}` : sql``}
      ${filters.stateCode ? sql`AND p.state_code = ${filters.stateCode}` : sql``}
      AND p.archived_at IS NULL
    ORDER BY p.district, p.survey_number
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return {
    rows: dataResult as unknown as BboxParcelResult[],
    total,
  };
}

// ---------------------------------------------------------------------------
// 3. Get active project geometry as GeoJSON
// ---------------------------------------------------------------------------

export interface ProjectGeometryResult {
  id: string;
  geometryGeojson: string;
  sourceDataset: string | null;
  sourceIdentifier: string | null;
  sourceVersion: string | null;
  sourceDate: string | null;
  sourceCrs: string;
  confidence: number | null;
  verificationStatus: string;
}

export async function getProjectGeometry(projectId: string): Promise<ProjectGeometryResult | null> {
  const result = await db.execute(sql`
    SELECT
      id,
      ST_AsGeoJSON(geometry)    AS "geometryGeojson",
      source_dataset            AS "sourceDataset",
      source_identifier         AS "sourceIdentifier",
      source_version            AS "sourceVersion",
      source_date               AS "sourceDate",
      source_crs                AS "sourceCrs",
      confidence,
      verification_status       AS "verificationStatus"
    FROM project_geometries
    WHERE project_id = ${projectId}
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (result.length === 0) return null;
  return result[0] as unknown as ProjectGeometryResult;
}

// ---------------------------------------------------------------------------
// 4. Get parcel with geometry
// ---------------------------------------------------------------------------

export interface ParcelWithGeometryResult {
  parcelId: string;
  surveyNumber: string | null;
  village: string | null;
  tehsil: string | null;
  district: string;
  stateCode: string;
  parcelType: string;
  areaSqm: number | null;
  ownerName: string | null;
  projectId: string | null;
  acquisitionCaseId: string | null;
  geometryGeojson: string | null;
  sourceDataset: string | null;
  sourceCrs: string | null;
  verificationStatus: string | null;
  confidence: number | null;
}

export async function getParcelWithGeometry(parcelId: string): Promise<ParcelWithGeometryResult | null> {
  const result = await db.execute(sql`
    SELECT
      p.id                      AS "parcelId",
      p.survey_number           AS "surveyNumber",
      p.village                 AS "village",
      p.tehsil                  AS "tehsil",
      p.district                AS "district",
      p.state_code              AS "stateCode",
      p.parcel_type             AS "parcelType",
      p.area_sqm                AS "areaSqm",
      p.owner_name              AS "ownerName",
      p.project_id              AS "projectId",
      p.acquisition_case_id     AS "acquisitionCaseId",
      ST_AsGeoJSON(pag.geometry) AS "geometryGeojson",
      pag.source_dataset        AS "sourceDataset",
      pag.source_crs            AS "sourceCrs",
      pag.verification_status   AS "verificationStatus",
      pag.confidence            AS "confidence"
    FROM parcels p
    LEFT JOIN parcel_geometries pag
      ON pag.parcel_id = p.id AND pag.is_active = true
    WHERE p.id = ${parcelId}
      AND p.archived_at IS NULL
    ORDER BY pag.created_at DESC NULLS LAST
    LIMIT 1
  `);

  if (result.length === 0) return null;
  return result[0] as unknown as ParcelWithGeometryResult;
}
