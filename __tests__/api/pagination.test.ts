import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginationMeta } from '../../src/lib/api/pagination';

describe('parsePagination', () => {
  it('returns defaults when no params provided', () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('parses page and limit correctly', () => {
    const params = new URLSearchParams({ page: '3', limit: '50' });
    const result = parsePagination(params);

    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(100); // (3-1)*50
  });

  it('clamps limit to max 100', () => {
    const params = new URLSearchParams({ page: '1', limit: '500' });
    const result = parsePagination(params);

    // Should fall back to default because 500 > 100 fails validation
    expect(result.limit).toBeLessThanOrEqual(100);
  });

  it('falls back to defaults for non-numeric values', () => {
    const params = new URLSearchParams({ page: 'abc', limit: 'xyz' });
    const result = parsePagination(params);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('falls back to defaults for negative values', () => {
    const params = new URLSearchParams({ page: '-1', limit: '-5' });
    const result = parsePagination(params);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe('buildPaginationMeta', () => {
  it('calculates totalPages correctly', () => {
    const meta = buildPaginationMeta(95, 1, 20);

    expect(meta.total).toBe(95);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(20);
    expect(meta.totalPages).toBe(5); // ceil(95/20)
  });

  it('handles exact division', () => {
    const meta = buildPaginationMeta(100, 1, 20);
    expect(meta.totalPages).toBe(5);
  });

  it('handles zero total', () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
  });
});
