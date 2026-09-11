import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/projects/[projectId]/milestones/route';
import { PATCH } from '@/app/api/v1/projects/[projectId]/milestones/[milestoneId]/route';
import { POST as CHECK_OVERDUE } from '@/app/api/v1/jobs/milestones/check-overdue/route';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { extractClientIp } from '@/lib/api/utils';
import { format, subDays } from 'date-fns';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/postgres',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service-key',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: 'mock-token',
  }
}));
vi.mock('@/lib/api/auth');
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
    query: {
      milestones: {
        findFirst: vi.fn(),
      },
      projects: {
        findFirst: vi.fn(),
      }
    }
  },
}));
vi.mock('@/lib/api/utils');

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(),
};

describe('Milestones API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (extractClientIp as any).mockReturnValue('127.0.0.1');
  });

  describe('GET /api/v1/projects/:projectId/milestones', () => {
    it('returns 401 if unauthenticated', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED' } }), { status: 401 }),
      });
      const req = new NextRequest('http://localhost/api/v1/projects/123/milestones');
      const res = await GET(req, { params: Promise.resolve({ projectId: '123' }) } as any);
      expect(res.status).toBe(401);
    });

    it('returns milestones for viewer', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: { id: 'u1', role: 'viewer' },
      });
      
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([{ id: 'm1', title: 'Test Milestone' }]),
      };
      (db.select as any).mockReturnValue(mockChain);

      const req = new NextRequest('http://localhost/api/v1/projects/123/milestones');
      const res = await GET(req, { params: Promise.resolve({ projectId: '123' }) } as any);
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].id).toBe('m1');
    });
  });

  describe('POST /api/v1/projects/:projectId/milestones', () => {
    it('returns 403 for viewer', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: { id: 'u1', role: 'viewer' },
      });
      const req = new NextRequest('http://localhost/api/v1/projects/123/milestones', {
        method: 'POST',
        body: JSON.stringify({ title: 'New', dueDate: '2026-10-10' }),
      });
      const res = await POST(req, { params: Promise.resolve({ projectId: '123' }) } as any);
      expect(res.status).toBe(403);
    });

    it('creates milestone for project_manager', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: { id: 'u1', role: 'project_manager' },
      });
      
      (db.transaction as any).mockImplementation(async (cb: any) => {
        return { id: 'm2', title: 'New' };
      });

      const req = new NextRequest('http://localhost/api/v1/projects/123/milestones', {
        method: 'POST',
        body: JSON.stringify({ title: 'New', dueDate: '2026-10-10' }),
      });
      const res = await POST(req, { params: Promise.resolve({ projectId: '123' }) } as any);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.id).toBe('m2');
    });
  });

  describe('PATCH /api/v1/projects/:projectId/milestones/:milestoneId', () => {
    it('allows updating if assigned user', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: { id: 'u1', role: 'field_officer' },
      });

      (db.query.milestones.findFirst as any).mockResolvedValue({
        id: 'm1',
        projectId: '123',
        assignedTo: 'u1',
      });

      (db.transaction as any).mockImplementation(async (cb: any) => {
        return { id: 'm1', status: 'completed' };
      });

      const req = new NextRequest('http://localhost/api/v1/projects/123/milestones/m1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ projectId: '123', milestoneId: 'm1' }) } as any);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/jobs/milestones/check-overdue', () => {
    it('returns 403 if not admin', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: { id: 'u1', role: 'project_manager' },
      });
      const req = new NextRequest('http://localhost/api/v1/jobs/milestones/check-overdue', { method: 'POST' });
      const res = await CHECK_OVERDUE(req, {} as any);
      expect(res.status).toBe(403);
    });

    it('processes overdue milestones for admin', async () => {
      (getAuthenticatedUser as any).mockResolvedValue({
        success: true,
        user: { id: 'admin1', role: 'admin' },
      });

      const pastDate = format(subDays(new Date(), 2), 'yyyy-MM-dd');

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: 'm1', title: 'Late 1', projectId: 'p1', dueDate: pastDate, status: 'pending' }
        ]),
      };
      (db.select as any).mockReturnValue(mockChain);

      (db.transaction as any).mockImplementation(async (cb: any) => {
        const mockTx = {
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'task1' }]),
          }),
          query: {
            projects: {
              findFirst: vi.fn().mockResolvedValue({ createdBy: 'owner1' })
            }
          }
        };
        await cb(mockTx);
      });

      const req = new NextRequest('http://localhost/api/v1/jobs/milestones/check-overdue', { method: 'POST' });
      const res = await CHECK_OVERDUE(req, {} as any);
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.count).toBe(1);
    });
  });
});
