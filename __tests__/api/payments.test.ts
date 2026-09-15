import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/v1/projects/[projectId]/payments/route';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { PaymentService } from '@/lib/services/payments';

vi.mock('@/lib/api/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/services/payments', () => ({
  PaymentService: {
    getPaymentsForProject: vi.fn(),
  },
}));

describe('Payments API', () => {
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

  describe('GET /api/v1/projects/:projectId/payments', () => {
    it('returns 401 if unauthenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: false,
        response: NextResponse.json({ error: 'Auth error' }, { status: 401 }) as any,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/payments');
      const res = await GET(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user role is unauthorized', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockViewer as any,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/payments');
      const res = await GET(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      expect(res.status).toBe(403);
    });

    it('returns payment reconciliations for a valid project', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      const mockPayments = [{
        id: 'payment-1',
        projectId: 'proj-1',
        awardId: 'award-1',
        assessedAmount: 5000,
        paidAmount: 5000,
        externalReference: 'TXN-123',
        paymentStatus: 'reconciled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];

      vi.mocked(PaymentService.getPaymentsForProject).mockResolvedValue(mockPayments as any);

      const req = new NextRequest('http://localhost:3000/api/v1/projects/proj-1/payments');
      const res = await GET(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual(mockPayments);
    });
  });
});
