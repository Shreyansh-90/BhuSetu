import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('Environment Variables Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    // reset modules to ensure env.ts re-evaluates
    vi.resetModules();
  });

  it('1. Server-only environment variables are never returned by the public configuration module.', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'TEST_SECRET_KEY';
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_ACCESS_KEY = 'minioadmin';
    process.env.MINIO_SECRET_KEY = 'minioadmin';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';

    const { publicEnv } = await import('../src/lib/env');
    
    // Check that publicEnv only contains NEXT_PUBLIC_ keys
    expect(publicEnv).toHaveProperty('NEXT_PUBLIC_SUPABASE_URL');
    expect(publicEnv).not.toHaveProperty('DATABASE_URL');
    expect(publicEnv).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('2. Fake sentinel secrets such as TEST_DATABASE_SECRET do not appear in public configuration.', async () => {
    process.env.DATABASE_URL = 'postgres://TEST_DATABASE_SECRET@localhost/test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'TEST_SUPABASE_SECRET';
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_ACCESS_KEY = 'minioadmin';
    process.env.MINIO_SECRET_KEY = 'TEST_MINIO_SECRET';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';

    const { publicEnv } = await import('../src/lib/env');
    const publicEnvString = JSON.stringify(publicEnv);

    expect(publicEnvString).not.toContain('TEST_DATABASE_SECRET');
    expect(publicEnvString).not.toContain('TEST_MINIO_SECRET');
  });

  it('3. Missing required environment variables fail with a safe error.', async () => {
    // Intentionally omit required variables
    process.env.DATABASE_URL = undefined;
    
    await expect(import('../src/lib/env')).rejects.toThrowError(
      /Environment validation failed\. Invalid environment variables: DATABASE_URL/
    );
  });

  it('4. Error messages never contain actual secret values.', async () => {
    process.env.DATABASE_URL = 'invalid-url-with-secret-password123';
    
    let error: Error | undefined;
    try {
      await import('../src/lib/env');
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error?.message).not.toContain('invalid-url-with-secret-password123');
  });

  it('5. Only explicitly approved NEXT_PUBLIC_* variables are exposed.', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'TEST_SECRET_KEY';
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_ACCESS_KEY = 'minioadmin';
    process.env.MINIO_SECRET_KEY = 'minioadmin';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';

    const { publicEnv } = await import('../src/lib/env');
    
    // We only expect 2 specific keys in the public config
    expect(Object.keys(publicEnv)).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]);
  });
});
