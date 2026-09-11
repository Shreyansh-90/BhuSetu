import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as addClarification } from '../../src/app/api/v1/workflow/tasks/[taskId]/clarification/route';
import { db } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api/auth';

// Mock auth
vi.mock('@/lib/api/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

// Mock db
const mockLimit = vi.fn().mockResolvedValue([]);
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockLeftJoin = vi.fn(() => ({ where: mockWhere }));
const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin }));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
    transaction: vi.fn(),
  },
}));

// Mock schema
vi.mock('@/lib/db/schema', () => ({
  projects: { id: 'projects.id', stateCode: 'projects.stateCode', districtCode: 'projects.districtCode' },
  workflowTasks: { id: 'workflowTasks.id', projectId: 'workflowTasks.projectId', status: 'workflowTasks.status' },
  auditEvents: { id: 'auditEvents.id' },
}));

function makeRequest(body: unknown, url = 'http://localhost/api/v1/workflow/tasks/taskId/clarification') {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Workflow Task REST API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthenticatedUser as any).mockResolvedValue({
      success: true,
      user: {
        id: 'user-001',
        role: 'viewer',
        stateCode: 'MP',
        districtCode: 'BPL',
      },
    });
  });

  describe('Add Clarification', () => {
    it('returns 409 CONFLICT if task is not open', async () => {
      mockLimit.mockResolvedValueOnce([{
        task: { id: 'task-1', status: 'completed' },
        project: { id: 'proj-1', stateCode: 'MP', districtCode: 'BPL' },
      }]);

      const request = makeRequest({ resolution: 'This is the answer' });
      const response = await addClarification(request, { 
        params: Promise.resolve({ taskId: '123e4567-e89b-12d3-a456-426614174000' }),
        logger: console 
      } as any);

      expect(response.status).toBe(409);
    });

    it('processes clarification successfully', async () => {
      mockLimit.mockResolvedValueOnce([{
        task: { id: 'task-1', status: 'pending', projectId: 'proj-1' },
        project: { id: 'proj-1', stateCode: 'MP', districtCode: 'BPL' },
      }]);

      const txMock = {
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([{ id: 'task-1', status: 'completed', resolution: 'Fixed' }])
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

      const request = makeRequest({ resolution: 'This is the answer' });
      const response = await addClarification(request, { 
        params: Promise.resolve({ taskId: '123e4567-e89b-12d3-a456-426614174000' }),
        logger: console 
      } as any);

      expect(response.status).toBe(200);
      expect(db.transaction).toHaveBeenCalled();
    });
  });
});
