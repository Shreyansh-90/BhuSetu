import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getIntersections } from '../../src/app/api/v1/map/projects/[projectId]/intersections/route';
import { GET as getParcelsInBbox } from '../../src/app/api/v1/map/parcels/route';
import { GET as getProjectGeometry } from '../../src/app/api/v1/projects/[projectId]/geometry/route';
import { GET as getParcelDetail } from '../../src/app/api/v1/parcels/[parcelId]/route';
import { db } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api/auth';

// --- Mocks ---

vi.mock('@/lib/api/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      projects: { findFirst: vi.fn() },
    },
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  projects: {
    id: 'projects.id',
    stateCode: 'projects.stateCode',
    districtCode: 'projects.districtCode',
  },
  parcels: { id: 'parcels.id' },
  projectGeometries: { id: 'projectGeometries.id' },
  parcelGeometries: { id: 'parcelGeometries.id' },
}));

// Mock the spatial-queries module so we don't hit real PostGIS
vi.mock('@/lib/db/spatial-queries', () => ({
  findProjectIntersections: vi.fn().mockResolvedValue([]),
  findParcelsInBbox: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  getProjectGeometry: vi.fn().mockResolvedValue(null),
  getParcelWithGeometry: vi.fn().mockResolvedValue(null),
}));

import {
  findProjectIntersections,
  findParcelsInBbox,
  getProjectGeometry as getProjectGeometryQuery,
  getParcelWithGeometry,
} from '@/lib/db/spatial-queries';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

function mockAuth(overrides?: Partial<{ role: string; stateCode: string | null; districtCode: string | null }>) {
  (getAuthenticatedUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    user: {
      id: 'user-001',
      role: overrides?.role ?? 'viewer',
      stateCode: overrides?.stateCode ?? 'MP',
      districtCode: overrides?.districtCode ?? 'BPL',
      organizationId: 'org-001',
    },
  });
}

// ============================================================================
// Intersection Endpoint
// ============================================================================

describe('GET /api/v1/map/projects/:projectId/intersections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns 404 when project does not exist', async () => {
    (db.query.projects.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/v1/map/projects/${VALID_UUID}/intersections`);
    const res = await getIntersections(req, {
      params: Promise.resolve({ projectId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(404);
  });

  it('returns empty intersections when project has no geometry overlap', async () => {
    (db.query.projects.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VALID_UUID,
      stateCode: 'MP',
      districtCode: 'BPL',
    });
    (findProjectIntersections as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new NextRequest(`http://localhost/api/v1/map/projects/${VALID_UUID}/intersections`);
    const res = await getIntersections(req, {
      params: Promise.resolve({ projectId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.intersections).toEqual([]);
  });

  it('returns intersection features with correct shape', async () => {
    (db.query.projects.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VALID_UUID,
      stateCode: 'MP',
      districtCode: 'BPL',
    });
    (findProjectIntersections as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        parcelId: 'parcel-001',
        surveyNumber: 'SN-42',
        village: 'Raipur',
        tehsil: 'Huzur',
        district: 'Bhopal',
        stateCode: 'MP',
        parcelType: 'government',
        parcelAreaSqm: 5000,
        intersectionAreaSqm: 1200,
        overlapPercent: 24.0,
        intersectionGeojson: '{"type":"Polygon","coordinates":[[[77.4,23.2],[77.5,23.2],[77.5,23.3],[77.4,23.3],[77.4,23.2]]]}',
      },
    ]);

    const req = new NextRequest(`http://localhost/api/v1/map/projects/${VALID_UUID}/intersections`);
    const res = await getIntersections(req, {
      params: Promise.resolve({ projectId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.intersections).toHaveLength(1);
    expect(json.data.intersections[0].properties.parcelId).toBe('parcel-001');
    expect(json.data.intersections[0].properties.intersectionAreaSqm).toBe(1200);
    expect(json.data.intersections[0].geometry.type).toBe('Polygon');
    // owner_name must NOT be present
    expect(json.data.intersections[0].properties.ownerName).toBeUndefined();
  });

  it('returns 403 for out-of-scope user', async () => {
    mockAuth({ stateCode: 'RJ' }); // User is Rajasthan
    (db.query.projects.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VALID_UUID,
      stateCode: 'MP', // Project is MP
      districtCode: 'BPL',
    });

    const req = new NextRequest(`http://localhost/api/v1/map/projects/${VALID_UUID}/intersections`);
    const res = await getIntersections(req, {
      params: Promise.resolve({ projectId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(403);
  });
});

// ============================================================================
// Bbox Parcel Query
// ============================================================================

describe('GET /api/v1/map/parcels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns 422 when bbox param is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/map/parcels');
    const res = await getParcelsInBbox(req, {} as never);

    expect(res.status).toBe(422);
  });

  it('returns 422 when bbox is too large (> 25 sq degrees)', async () => {
    const req = new NextRequest('http://localhost/api/v1/map/parcels?bbox=0,0,20,20&zoom=5');
    const res = await getParcelsInBbox(req, {} as never);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.message).toContain('validation');
  });

  it('returns 422 for invalid coordinates (lat > 90)', async () => {
    const req = new NextRequest('http://localhost/api/v1/map/parcels?bbox=77,95,78,96&zoom=12');
    const res = await getParcelsInBbox(req, {} as never);

    expect(res.status).toBe(422);
  });

  it('returns 422 when min >= max', async () => {
    const req = new NextRequest('http://localhost/api/v1/map/parcels?bbox=78,24,77,23&zoom=12');
    const res = await getParcelsInBbox(req, {} as never);

    expect(res.status).toBe(422);
  });

  it('returns valid FeatureCollection for correct bbox', async () => {
    (findParcelsInBbox as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [
        {
          parcelId: 'p-1',
          surveyNumber: 'SN-1',
          village: 'TestVillage',
          tehsil: 'TestTehsil',
          district: 'Bhopal',
          stateCode: 'MP',
          parcelType: 'private',
          areaSqm: 1000,
          geometryGeojson: '{"type":"Polygon","coordinates":[[[77.4,23.2],[77.41,23.2],[77.41,23.21],[77.4,23.21],[77.4,23.2]]]}',
        },
      ],
      total: 1,
    });

    const req = new NextRequest('http://localhost/api/v1/map/parcels?bbox=77.3,23.1,77.5,23.3&zoom=14');
    const res = await getParcelsInBbox(req, {} as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.type).toBe('FeatureCollection');
    expect(json.data.features).toHaveLength(1);
    expect(json.data.features[0].properties.parcelId).toBe('p-1');
    // owner_name must NOT appear
    expect(json.data.features[0].properties.ownerName).toBeUndefined();
    // Pagination meta
    expect(json.meta.total).toBe(1);
  });
});

// ============================================================================
// Project Geometry Endpoint
// ============================================================================

describe('GET /api/v1/projects/:projectId/geometry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns 404 when project does not exist', async () => {
    (db.query.projects.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/v1/projects/${VALID_UUID}/geometry`);
    const res = await getProjectGeometry(req, {
      params: Promise.resolve({ projectId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(404);
  });

  it('returns 404 when project has no active geometry', async () => {
    (db.query.projects.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VALID_UUID,
      stateCode: 'MP',
      districtCode: 'BPL',
    });
    (getProjectGeometryQuery as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/v1/projects/${VALID_UUID}/geometry`);
    const res = await getProjectGeometry(req, {
      params: Promise.resolve({ projectId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.message).toContain('No active geometry');
  });

  it('returns GeoJSON Feature for valid project with geometry', async () => {
    (db.query.projects.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VALID_UUID,
      stateCode: 'MP',
      districtCode: 'BPL',
    });
    (getProjectGeometryQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'geom-1',
      geometryGeojson: '{"type":"Polygon","coordinates":[[[77.4,23.2],[77.5,23.2],[77.5,23.3],[77.4,23.3],[77.4,23.2]]]}',
      sourceDataset: 'Survey of India',
      sourceIdentifier: 'SOI-2024-001',
      sourceVersion: '1.0',
      sourceDate: '2024-01-15',
      sourceCrs: 'EPSG:4326',
      confidence: 0.95,
      verificationStatus: 'verified',
    });

    const req = new NextRequest(`http://localhost/api/v1/projects/${VALID_UUID}/geometry`);
    const res = await getProjectGeometry(req, {
      params: Promise.resolve({ projectId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.type).toBe('Feature');
    expect(json.data.properties.sourceCrs).toBe('EPSG:4326');
    expect(json.data.properties.confidence).toBe(0.95);
    expect(json.data.geometry.type).toBe('Polygon');
  });
});

// ============================================================================
// Parcel Detail Endpoint
// ============================================================================

describe('GET /api/v1/parcels/:parcelId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when parcel does not exist', async () => {
    mockAuth();
    (getParcelWithGeometry as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/v1/parcels/${VALID_UUID}`);
    const res = await getParcelDetail(req, {
      params: Promise.resolve({ parcelId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(404);
  });

  it('excludes ownerName for viewer role', async () => {
    mockAuth({ role: 'viewer' });
    (getParcelWithGeometry as ReturnType<typeof vi.fn>).mockResolvedValue({
      parcelId: VALID_UUID,
      surveyNumber: 'SN-99',
      village: 'TestVillage',
      tehsil: 'TestTehsil',
      district: 'Bhopal',
      stateCode: 'MP',
      parcelType: 'private',
      areaSqm: 2000,
      ownerName: 'Sensitive Name',
      projectId: null,
      acquisitionCaseId: null,
      geometryGeojson: null,
      sourceDataset: null,
      sourceCrs: null,
      verificationStatus: null,
      confidence: null,
    });

    const req = new NextRequest(`http://localhost/api/v1/parcels/${VALID_UUID}`);
    const res = await getParcelDetail(req, {
      params: Promise.resolve({ parcelId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ownerName).toBeUndefined();
    expect(json.data.parcelId).toBe(VALID_UUID);
  });

  it('includes ownerName for district_officer role', async () => {
    mockAuth({ role: 'district_officer' });
    (getParcelWithGeometry as ReturnType<typeof vi.fn>).mockResolvedValue({
      parcelId: VALID_UUID,
      surveyNumber: 'SN-99',
      village: 'TestVillage',
      tehsil: 'TestTehsil',
      district: 'Bhopal',
      stateCode: 'MP',
      parcelType: 'private',
      areaSqm: 2000,
      ownerName: 'Sensitive Name',
      projectId: null,
      acquisitionCaseId: null,
      geometryGeojson: null,
      sourceDataset: null,
      sourceCrs: null,
      verificationStatus: null,
      confidence: null,
    });

    const req = new NextRequest(`http://localhost/api/v1/parcels/${VALID_UUID}`);
    const res = await getParcelDetail(req, {
      params: Promise.resolve({ parcelId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ownerName).toBe('Sensitive Name');
  });

  it('includes ownerName for admin role', async () => {
    mockAuth({ role: 'admin' });
    (getParcelWithGeometry as ReturnType<typeof vi.fn>).mockResolvedValue({
      parcelId: VALID_UUID,
      surveyNumber: 'SN-99',
      village: 'TestVillage',
      tehsil: 'TestTehsil',
      district: 'Bhopal',
      stateCode: 'MP',
      parcelType: 'government',
      areaSqm: 3000,
      ownerName: 'Admin-Visible Name',
      projectId: null,
      acquisitionCaseId: null,
      geometryGeojson: '{"type":"Polygon","coordinates":[[[77.4,23.2],[77.5,23.2],[77.5,23.3],[77.4,23.3],[77.4,23.2]]]}',
      sourceDataset: 'Revenue Dept',
      sourceCrs: 'EPSG:4326',
      verificationStatus: 'verified',
      confidence: 0.9,
    });

    const req = new NextRequest(`http://localhost/api/v1/parcels/${VALID_UUID}`);
    const res = await getParcelDetail(req, {
      params: Promise.resolve({ parcelId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ownerName).toBe('Admin-Visible Name');
    expect(json.data.geometry).toBeDefined();
    expect(json.data.geometry.geometry.type).toBe('Polygon');
  });

  it('returns 403 for out-of-scope user', async () => {
    mockAuth({ role: 'viewer', stateCode: 'RJ' }); // Rajasthan user
    (getParcelWithGeometry as ReturnType<typeof vi.fn>).mockResolvedValue({
      parcelId: VALID_UUID,
      surveyNumber: 'SN-99',
      village: 'TestVillage',
      tehsil: 'TestTehsil',
      district: 'Bhopal',
      stateCode: 'MP', // MP parcel
      parcelType: 'private',
      areaSqm: 2000,
      ownerName: null,
      projectId: null,
      acquisitionCaseId: null,
      geometryGeojson: null,
      sourceDataset: null,
      sourceCrs: null,
      verificationStatus: null,
      confidence: null,
    });

    const req = new NextRequest(`http://localhost/api/v1/parcels/${VALID_UUID}`);
    const res = await getParcelDetail(req, {
      params: Promise.resolve({ parcelId: VALID_UUID }),
    } as never);

    expect(res.status).toBe(403);
  });
});
