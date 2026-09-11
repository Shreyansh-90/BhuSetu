import type { AuthenticatedUser, UserRole } from './auth';
import { errorResponse } from './response';

// ---------------------------------------------------------------------------
// Authorization helpers (per shared contract §Security baseline:
// "Authorization must be enforced on the server, not only by hiding UI
// controls. Use role-based access control plus administrative scope.")
// ---------------------------------------------------------------------------

export interface ScopeRequirement {
  stateCode?: string;
  districtCode?: string;
  organizationId?: string;
}

/**
 * Role hierarchy for determining access levels.
 * Higher index = more restricted. Admin has unrestricted access.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 0,
  ministry_officer: 1,
  state_officer: 2,
  district_officer: 3,
  project_manager: 4,
  rehabilitation_officer: 5,
  field_officer: 6,
  viewer: 7,
};

// ---------------------------------------------------------------------------
// Role check
// ---------------------------------------------------------------------------

/**
 * Require the user to have one of the specified roles.
 * Returns void on success, or a 403 error response on failure.
 */
export function requireRole(
  user: AuthenticatedUser,
  ...allowedRoles: UserRole[]
): ReturnType<typeof errorResponse> | null {
  // Admin always passes role checks
  if (user.role === 'admin') return null;

  if (!allowedRoles.includes(user.role)) {
    return errorResponse(
      'FORBIDDEN',
      'You do not have the required role to perform this action.',
    );
  }

  return null;
}

/**
 * Require the user to have at least the specified role level (inclusive).
 * Uses the role hierarchy: admin > ministry > state > district > project_manager > rehabilitation > field > viewer.
 */
export function requireMinimumRole(
  user: AuthenticatedUser,
  minimumRole: UserRole,
): ReturnType<typeof errorResponse> | null {
  if (user.role === 'admin') return null;

  if (ROLE_HIERARCHY[user.role] > ROLE_HIERARCHY[minimumRole]) {
    return errorResponse(
      'FORBIDDEN',
      'You do not have sufficient privileges for this action.',
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Scope check
// ---------------------------------------------------------------------------

/**
 * Require the user's administrative scope to cover the requested resource.
 *
 * Rules:
 * - Admin/ministry_officer: no scope restriction.
 * - state_officer: must match stateCode.
 * - district_officer: must match stateCode AND districtCode.
 * - Others: must match stateCode (and districtCode if present on user).
 *
 * Returns null on success, or a 403 error response on failure.
 */
export function requireScope(
  user: AuthenticatedUser,
  resource: ScopeRequirement,
): ReturnType<typeof errorResponse> | null {
  // Admin and ministry officers have national scope
  if (user.role === 'admin' || user.role === 'ministry_officer') {
    return null;
  }

  // State-level check
  if (resource.stateCode && user.stateCode) {
    if (user.stateCode !== resource.stateCode) {
      return errorResponse(
        'FORBIDDEN',
        'You do not have access to resources in this state.',
      );
    }
  }

  // District-level check (for district_officer, field_officer, etc.)
  if (resource.districtCode && user.districtCode) {
    if (user.districtCode !== resource.districtCode) {
      return errorResponse(
        'FORBIDDEN',
        'You do not have access to resources in this district.',
      );
    }
  }

  // Organization-level check
  if (resource.organizationId && user.organizationId) {
    if (user.organizationId !== resource.organizationId) {
      return errorResponse(
        'FORBIDDEN',
        'You do not have access to resources in this organization.',
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Self-approval prevention
// ---------------------------------------------------------------------------

/**
 * Prevent a user from approving/completing their own submission.
 *
 * Per shared contract: "Field users can submit evidence but cannot approve
 * their own submissions."
 *
 * @param user        The authenticated user attempting the approval.
 * @param submitterId The user ID of the original submitter.
 */
export function preventSelfApproval(
  user: AuthenticatedUser,
  submitterId: string,
): ReturnType<typeof errorResponse> | null {
  // Admin override: admins can still approve their own in emergency
  // but this should be flagged in audit. For now we enforce the rule
  // for all non-admin users.
  if (user.role === 'admin') return null;

  if (user.id === submitterId) {
    return errorResponse(
      'FORBIDDEN',
      'You cannot approve or complete your own submission.',
    );
  }

  return null;
}

// Re-export the role hierarchy for testing
export { ROLE_HIERARCHY };
