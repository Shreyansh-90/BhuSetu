import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '../../src/lib/api/validation';

vi.mock('server-only', () => ({}));

function makeRequest(body?: unknown, url = 'http://localhost/api/v1/test?page=1&limit=10') {
  if (body !== undefined) {
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new NextRequest(url, { method: 'POST' });
}

describe('validateRequest', () => {
  const bodySchema = z.object({
    title: z.string().min(1),
    stateCode: z.string().length(2),
  });

  const paramsSchema = z.object({
    projectId: z.string().uuid(),
  });

  const querySchema = z.object({
    page: z.coerce.number().int().min(1),
    limit: z.coerce.number().int().min(1).max(100),
  });

  it('validates body successfully', async () => {
    const request = makeRequest({ title: 'Test Project', stateCode: 'MP' });
    const result = await validateRequest(request, { body: bodySchema });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toEqual({ title: 'Test Project', stateCode: 'MP' });
    }
  });

  it('returns 422 for invalid body', async () => {
    const request = makeRequest({ title: '', stateCode: 'TOOLONG' });
    const result = await validateRequest(request, { body: bodySchema });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(422);
      const body = await result.response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toBeInstanceOf(Array);
      expect(body.error.details.length).toBeGreaterThan(0);
    }
  });

  it('returns 422 for missing JSON body when schema is required', async () => {
    const request = new NextRequest('http://localhost/api/v1/test', { method: 'POST' });
    const result = await validateRequest(request, { body: bodySchema });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(422);
    }
  });

  it('validates route params successfully', async () => {
    const request = makeRequest({ title: 'Test', stateCode: 'MP' });
    const routeParams = { projectId: '550e8400-e29b-41d4-a716-446655440000' };
    const result = await validateRequest(request, { body: bodySchema, params: paramsSchema }, routeParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.params).toEqual(routeParams);
    }
  });

  it('returns 422 for invalid route params', async () => {
    const request = makeRequest({ title: 'Test', stateCode: 'MP' });
    const routeParams = { projectId: 'not-a-uuid' };
    const result = await validateRequest(request, { body: bodySchema, params: paramsSchema }, routeParams);

    expect(result.success).toBe(false);
  });

  it('validates query params successfully', async () => {
    const request = makeRequest(undefined, 'http://localhost/api/v1/test?page=2&limit=50');
    const result = await validateRequest(request, { query: querySchema });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toEqual({ page: 2, limit: 50 });
    }
  });

  it('error details never contain raw field values', async () => {
    const request = makeRequest({ title: '', stateCode: 'TOOLONG' });
    const result = await validateRequest(request, { body: bodySchema });

    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      const detailsStr = JSON.stringify(body.error.details);
      // Should only contain field names and error messages, not the raw values
      expect(detailsStr).not.toContain('TOOLONG');
    }
  });
});
