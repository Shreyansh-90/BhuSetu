import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/v1/notifications/route';
import { PATCH } from '@/app/api/v1/notifications/[id]/read/route';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { NotificationService } from '@/lib/services/notifications';

// Mock dependencies
vi.mock('@/lib/api/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/services/notifications', () => ({
  NotificationService: {
    getNotificationsForUser: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

describe('Notifications API', () => {
  const mockUser = {
    id: 'user-123',
    authUserId: 'auth-123',
    email: 'test@example.com',
    role: 'project_manager',
    organizationId: 'org-1',
    stateCode: 'MH',
    districtCode: 'PUN',
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/notifications', () => {
    it('returns 401 if unauthenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: false,
        response: NextResponse.json({ error: 'Auth error' }, { status: 401 }) as any,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/notifications');
      const res = await GET(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(401);
    });

    it('returns notifications for the authenticated user', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          category: 'alert',
          title: 'Test',
          message: 'Test msg',
          isRead: false,
          referenceId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      vi.mocked(NotificationService.getNotificationsForUser).mockResolvedValue(mockNotifications as any);

      const req = new NextRequest('http://localhost:3000/api/v1/notifications');
      const res = await GET(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual(mockNotifications);
      expect(NotificationService.getNotificationsForUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('returns 400 if ID is missing', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/notifications//read', { method: 'PATCH' });
      // Pass no ID in params
      const res = await PATCH(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(422); // VALIDATION_ERROR is mapped to 422
    });

    it('returns 404 if notification not found or access denied', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      vi.mocked(NotificationService.markAsRead).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/v1/notifications/notif-1/read', { method: 'PATCH' });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'notif-1' }) });

      expect(res.status).toBe(404);
      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-123');
    });

    it('returns 200 and updated notification on success', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        user: mockUser as any,
      });

      const mockUpdated = {
        id: 'notif-1',
        userId: 'user-123',
        category: 'alert',
        title: 'Test',
        message: 'Test msg',
        isRead: true, // Marked as read
        referenceId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(NotificationService.markAsRead).mockResolvedValue(mockUpdated as any);

      const req = new NextRequest('http://localhost:3000/api/v1/notifications/notif-1/read', { method: 'PATCH' });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'notif-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual(mockUpdated);
    });
  });
});
