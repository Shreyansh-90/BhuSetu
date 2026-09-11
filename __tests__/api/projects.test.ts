import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as submitProject } from '../../src/app/api/v1/projects/[projectId]/submit/route';
import { POST as createProject } from '../../src/app/api/v1/projects/route';
import { PATCH as updateProjectDraft } from '../../src/app/api/v1/projects/[projectId]/route';
import { extractClientIp } from '../../src/lib/api/utils';
import { db } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api/auth';

// Mock auth
vi.mock('@/lib/api/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      projects: {
        findFirst: vi.fn(),
      },
      workflowTasks: {
        findFirst: vi.fn(),
      }
    },
    transaction: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    })),
  },
}));

// Mock schema
vi.mock('@/lib/db/schema', () => ({
  projects: {
    id: 'projects.id',
    status: 'projects.status',
    stateCode: 'projects.stateCode',
    districtCode: 'projects.districtCode',
    createdAt: 'projects.createdAt',
  },
  workflowTasks: { id: 'workflowTasks.id' },
  auditEvents: { id: 'auditEvents.id' },
}));

function makeRequest(body?: unknown, url = 'http://localhost/api/v1/projects') {
  if (body !== undefined) {
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new NextRequest(url, { method: 'GET' });
}

describe('Project REST API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthenticatedUser as any).mockResolvedValue({
      success: true,
      user: {
        id: 'user-001',
        role: 'project_manager',
        stateCode: 'MP',
        districtCode: 'BPL',
      },
    });
  });

  describe('Submit Project (Draft -> Submitted)', () => {
    it('returns 409 CONFLICT if project is not in draft status', async () => {
      (db.query.projects.findFirst as any).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'submitted',
        stateCode: 'MP',
        districtCode: 'BPL',
      });

      const request = makeRequest(undefined, 'http://localhost/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/submit');
      const response = await submitProject(request, { 
        params: Promise.resolve({ projectId: '123e4567-e89b-12d3-a456-426614174000' }) 
      } as any);

      expect(response.status).toBe(409);
    });

    it('returns 403 FORBIDDEN if user scope does not match project', async () => {
      (db.query.projects.findFirst as any).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'draft',
        stateCode: 'RJ', // User is MP
        districtCode: 'JOD',
      });

      const request = makeRequest(undefined, 'http://localhost/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/submit');
      const response = await submitProject(request, { 
        params: Promise.resolve({ projectId: '123e4567-e89b-12d3-a456-426614174000' }) 
      } as any);

      expect(response.status).toBe(403);
    });

    it('processes submission successfully and creates workflow task', async () => {
      (db.query.projects.findFirst as any).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'draft',
        stateCode: 'MP',
        districtCode: 'BPL',
      });

      (db.transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => ({
                returning: vi.fn().mockResolvedValue([{ id: 'proj-1', status: 'submitted' }])
              }))
            }))
          })),
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([{ id: 'task-1' }])
            }))
          })),
        };
        return cb(tx);
      });

      const request = makeRequest(undefined, 'http://localhost/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/submit');
      const response = await submitProject(request, { 
        params: Promise.resolve({ projectId: '123e4567-e89b-12d3-a456-426614174000' }) 
      } as any);

      expect(response.status).toBe(200);
      expect(db.transaction).toHaveBeenCalled();
  });

  describe('Create Project', () => {
    it('creates project securely with user.organizationId', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-001',
          role: 'project_manager',
          organizationId: 'org-001',
        },
      });

      const txMock = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([{ id: 'proj-1', requestingOrgId: 'org-001' }])
          }))
        }))
      };
      (db.transaction as any).mockImplementation(async (cb: any) => {
        return cb(txMock);
      });

      const body = {
        title: 'Test Project',
        purpose: 'Testing',
        category: 'normal',
        stateCode: 'MP',
        districtCode: 'BPL',
      };

      const request = makeRequest(body, 'http://localhost/api/v1/projects');
      const response = await createProject(request, { logger: console } as any);
      
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.requestingOrgId).toBe('org-001');
    });

    it('returns 403 FORBIDDEN if user has no organizationId', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-001',
          role: 'project_manager',
          organizationId: null, // No organization
        },
      });

      const body = {
        title: 'Test Project',
        purpose: 'Testing',
        category: 'normal',
        stateCode: 'MP',
        districtCode: 'BPL',
      };

      const request = makeRequest(body, 'http://localhost/api/v1/projects');
      const response = await createProject(request, { logger: console } as any);
      
      expect(response.status).toBe(403);
    });
  });
  describe('Edit Project Draft (PATCH)', () => {
    it('updates draft project successfully', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-001',
          role: 'project_manager',
          stateCode: 'MP',
        },
      });

      (db.query.projects.findFirst as any).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'draft',
        stateCode: 'MP',
        districtCode: 'BPL',
      });

      const txMock = {
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([{ id: 'proj-1', title: 'Updated Title' }])
            }))
          }))
        })),
        insert: vi.fn(() => ({
          values: vi.fn().mockResolvedValue({})
        }))
      };
      (db.transaction as any).mockImplementation(async (cb: any) => {
        return cb(txMock);
      });

      const body = { title: 'Updated Title' };
      const request = new NextRequest('http://localhost/api/v1/projects/123e4567-e89b-12d3-a456-426614174000', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProjectDraft(request, { 
        params: Promise.resolve({ projectId: '123e4567-e89b-12d3-a456-426614174000' }),
        logger: console 
      } as any);

      expect(response.status).toBe(200);
    });

    it('prevents updating non-draft project', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: { id: 'user-001', role: 'project_manager', stateCode: 'MP' },
      });

      (db.query.projects.findFirst as any).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'submitted', // NOT DRAFT
        stateCode: 'MP',
        districtCode: 'BPL',
      });

      const body = { title: 'Updated Title' };
      const request = new NextRequest('http://localhost/api/v1/projects/123e4567-e89b-12d3-a456-426614174000', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProjectDraft(request, { 
        params: Promise.resolve({ projectId: '123e4567-e89b-12d3-a456-426614174000' }),
        logger: console 
      } as any);

      expect(response.status).toBe(409); // CONFLICT
    });
  });
});

describe('extractClientIp', () => {
  it('extracts valid IPv4 from x-forwarded-for', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1' }
    });
    expect(extractClientIp(req)).toBe('192.168.1.1');
  });

  it('extracts first valid IPv4 from comma-separated x-forwarded-for', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' }
    });
    expect(extractClientIp(req)).toBe('10.0.0.1');
  });

  it('extracts valid IPv6 from x-real-ip', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-real-ip': '2001:0db8:85a3:0000:0000:8a2e:0370:7334' }
    });
    expect(extractClientIp(req)).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });

  it('returns null for missing IP headers', () => {
    const req = new NextRequest('http://localhost');
    expect(extractClientIp(req)).toBeNull();
  });

  it('returns null for invalid IP format', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': 'unknown' }
    });
    expect(extractClientIp(req)).toBeNull();
  });
});
});
