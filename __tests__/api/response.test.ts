import { describe, it, expect } from 'vitest';
import { successResponse, errorResponse, createdResponse } from '../../src/lib/api/response';

describe('API Response Helpers', () => {
  it('successResponse returns stable success shape with status 200', async () => {
    const response = successResponse({ id: '123', name: 'Test' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { id: '123', name: 'Test' },
    });
  });

  it('successResponse includes pagination meta when provided', async () => {
    const meta = { page: 1, limit: 20, total: 100, totalPages: 5 };
    const response = successResponse([{ id: '1' }], meta);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.meta).toEqual(meta);
  });

  it('createdResponse returns status 201', async () => {
    const response = createdResponse({ id: 'new-id' });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 'new-id' });
  });

  it('errorResponse returns stable error shape with correct status code', async () => {
    const response = errorResponse('VALIDATION_ERROR', 'Name is required.', [
      { field: 'name', message: 'Required' },
    ]);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name is required.',
        details: [{ field: 'name', message: 'Required' }],
      },
    });
  });

  it('errorResponse maps UNAUTHENTICATED to 401', async () => {
    const response = errorResponse('UNAUTHENTICATED', 'Auth required.');
    expect(response.status).toBe(401);
  });

  it('errorResponse maps FORBIDDEN to 403', async () => {
    const response = errorResponse('FORBIDDEN', 'Not allowed.');
    expect(response.status).toBe(403);
  });

  it('errorResponse maps NOT_FOUND to 404', async () => {
    const response = errorResponse('NOT_FOUND', 'Resource not found.');
    expect(response.status).toBe(404);
  });

  it('errorResponse maps CONFLICT to 409', async () => {
    const response = errorResponse('CONFLICT', 'State conflict.');
    expect(response.status).toBe(409);
  });

  it('errorResponse maps INTERNAL_ERROR to 500', async () => {
    const response = errorResponse('INTERNAL_ERROR', 'Something went wrong.');
    expect(response.status).toBe(500);
  });

  it('error shape never includes details when not provided', async () => {
    const response = errorResponse('NOT_FOUND', 'Gone.');
    const body = await response.json();

    expect(body.error).not.toHaveProperty('details');
  });
});
