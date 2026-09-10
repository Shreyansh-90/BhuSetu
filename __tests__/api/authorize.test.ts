import { describe, it, expect } from 'vitest';
import { requireRole, requireMinimumRole, requireScope, preventSelfApproval } from '../../src/lib/api/authorize';
import type { AuthenticatedUser } from '../../src/lib/api/auth';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-001',
    authUserId: 'auth-001',
    email: 'test@example.com',
    role: 'viewer',
    organizationId: null,
    stateCode: null,
    districtCode: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------
describe('requireRole', () => {
  it('admin always passes any role check', () => {
    const user = makeUser({ role: 'admin' });
    const result = requireRole(user, 'state_officer', 'district_officer');
    expect(result).toBeNull();
  });

  it('returns null when user has one of the allowed roles', () => {
    const user = makeUser({ role: 'state_officer' });
    const result = requireRole(user, 'state_officer', 'district_officer');
    expect(result).toBeNull();
  });

  it('returns 403 when user does not have the allowed role', async () => {
    const user = makeUser({ role: 'viewer' });
    const result = requireRole(user, 'state_officer', 'district_officer');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// requireMinimumRole
// ---------------------------------------------------------------------------
describe('requireMinimumRole', () => {
  it('admin always passes minimum role check', () => {
    const user = makeUser({ role: 'admin' });
    const result = requireMinimumRole(user, 'field_officer');
    expect(result).toBeNull();
  });

  it('passes when user meets the minimum role level', () => {
    const user = makeUser({ role: 'state_officer' });
    // state_officer (2) is higher than district_officer (3)
    const result = requireMinimumRole(user, 'district_officer');
    expect(result).toBeNull();
  });

  it('returns 403 when user is below the minimum role level', async () => {
    const user = makeUser({ role: 'viewer' });
    const result = requireMinimumRole(user, 'district_officer');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// requireScope — scope leakage tests
// ---------------------------------------------------------------------------
describe('requireScope', () => {
  it('admin has no scope restriction', () => {
    const user = makeUser({ role: 'admin' });
    const result = requireScope(user, { stateCode: 'RJ', districtCode: 'JOD' });
    expect(result).toBeNull();
  });

  it('ministry_officer has national scope — no restriction', () => {
    const user = makeUser({ role: 'ministry_officer' });
    const result = requireScope(user, { stateCode: 'MP', districtCode: 'BPL' });
    expect(result).toBeNull();
  });

  it('state_officer can access resources in their own state', () => {
    const user = makeUser({ role: 'state_officer', stateCode: 'MP' });
    const result = requireScope(user, { stateCode: 'MP' });
    expect(result).toBeNull();
  });

  it('state_officer CANNOT access resources in a different state (scope leakage)', async () => {
    const user = makeUser({ role: 'state_officer', stateCode: 'MP' });
    const result = requireScope(user, { stateCode: 'RJ' });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('district_officer can access resources in their own district', () => {
    const user = makeUser({
      role: 'district_officer',
      stateCode: 'MP',
      districtCode: 'BPL',
    });
    const result = requireScope(user, { stateCode: 'MP', districtCode: 'BPL' });
    expect(result).toBeNull();
  });

  it('district_officer CANNOT access resources in a different district (scope leakage)', async () => {
    const user = makeUser({
      role: 'district_officer',
      stateCode: 'MP',
      districtCode: 'BPL',
    });
    const result = requireScope(user, { stateCode: 'MP', districtCode: 'IDR' });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('district_officer CANNOT access resources in a different state (scope leakage)', async () => {
    const user = makeUser({
      role: 'district_officer',
      stateCode: 'MP',
      districtCode: 'BPL',
    });
    const result = requireScope(user, { stateCode: 'RJ', districtCode: 'JOD' });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('field_officer is scoped to their state', async () => {
    const user = makeUser({ role: 'field_officer', stateCode: 'KA' });
    const result = requireScope(user, { stateCode: 'TN' });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// preventSelfApproval
// ---------------------------------------------------------------------------
describe('preventSelfApproval', () => {
  it('non-admin user CANNOT approve their own submission', async () => {
    const user = makeUser({ id: 'user-001', role: 'field_officer' });
    const result = preventSelfApproval(user, 'user-001');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error.message).toContain('cannot approve');
  });

  it('non-admin user CAN approve a different user\'s submission', () => {
    const user = makeUser({ id: 'user-001', role: 'district_officer' });
    const result = preventSelfApproval(user, 'user-002');
    expect(result).toBeNull();
  });

  it('admin CAN approve their own submission (emergency override)', () => {
    const user = makeUser({ id: 'user-001', role: 'admin' });
    const result = preventSelfApproval(user, 'user-001');
    expect(result).toBeNull();
  });

  it('state_officer CANNOT approve their own submission', async () => {
    const user = makeUser({ id: 'user-003', role: 'state_officer' });
    const result = preventSelfApproval(user, 'user-003');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
