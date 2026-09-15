import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/v1/projects/[projectId]/awards/route';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { AwardService } from '@/lib/services/awards';

vi.mock('@/lib/api/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/services/awards', () => ({
  AwardService: {
    getAwardsForProject: vi.fn(),
    createAward: vi.fn(),
  },
}));

describe('Awards API', () => {
  const mockUser = {
    id: 'user-123',
    authUserId: 'auth-123',
    email: 'test@example.com',
    role: 'project_manager',
    organizationId: 'org-1',
    stateCode: 'MH',
    districtCode: 'PUN',
  };

  const mockViewer = {
    ...mockUser,
    role: 'viewer',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/projects/:projectId/awards', () => {
    it('returns 401 if unauthenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: false,
        response: NextResponse.json({ error: 'Auth error' }, { status: 401 }) as any,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/awards');
      const res = await GET(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      expect(res.status).toBe(401);
    });

    it('returns awards for a valid project', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      const mockAwards = [{
        id: 'award-1',
        projectId: 'proj-1',
        parcelId: 'd346b9a8-3850-4ab3-9c8a-c21ea6e2d96c',
        assessedAmount: 5000,
        awardDate: '2026-09-11',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];

      vi.mocked(AwardService.getAwardsForProject).mockResolvedValue(mockAwards as any);

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/awards');
      const res = await GET(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual(mockAwards);
    });
  });

  describe('POST /api/v1/projects/:projectId/awards', () => {
    it('returns 403 if user role is unauthorized', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockViewer as any,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/awards', {
        method: 'POST',
        body: JSON.stringify({ parcelId: 'd346b9a8-3850-4ab3-9c8a-c21ea6e2d96c', assessedAmount: 1000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      expect(res.status).toBe(403);
    });

    it('returns 422 if validation fails', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/awards', {
        method: 'POST',
        body: JSON.stringify({ assessedAmount: 1000 }), // missing parcelId
      });
      const res = await POST(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      expect(res.status).toBe(422);
    });

    it('creates an award successfully', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      const mockCreated = {
        id: 'award-2',
        projectId: 'proj-1',
        parcelId: 'a9914948-47bc-40d1-93e1-d64e9a3b98c5',
        assessedAmount: 2000,
        awardDate: null,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(AwardService.createAward).mockResolvedValue(mockCreated as any);

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/awards', {
        method: 'POST',
        body: JSON.stringify({ parcelId: 'a9914948-47bc-40d1-93e1-d64e9a3b98c5', assessedAmount: 2000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data).toEqual(mockCreated);
    });
  });
});
