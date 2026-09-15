import { getAuthenticatedUser, UserRole, AuthenticatedUser } from '@/lib/api/auth';
import { errorResponse } from '@/lib/api/response';

/**
 * Ensures the user is authenticated and has one of the allowed roles.
 * Returns the authenticated user or an error response.
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const result = await getAuthenticatedUser();
  
  if (!result.success) {
    return result;
  }

  if (!allowedRoles.includes(result.user.role)) {
    return {
      success: false as const,
      response: errorResponse('FORBIDDEN', 'Insufficient permissions to perform this action.'),
    };
  }

  return {
    success: true as const,
    user: result.user,
  };
}

/**
 * Ensures the user has authorization for the specified jurisdiction (state/district).
 * This usually applies to roles like 'state_officer' or 'district_officer'.
 */
export async function requireJurisdiction(
  user: AuthenticatedUser,
  stateCode: string,
  districtCode?: string
) {
  if (user.role === 'admin' || user.role === 'ministry_officer') {
    return { success: true as const }; // Has global access
  }

  if (user.role === 'state_officer') {
    if (user.stateCode !== stateCode) {
      return {
        success: false as const,
        response: errorResponse('FORBIDDEN', 'Action restricted to your assigned state.'),
      };
    }
    return { success: true as const };
  }

  if (['district_officer', 'field_officer', 'project_manager'].includes(user.role)) {
    if (user.stateCode !== stateCode || (districtCode && user.districtCode !== districtCode)) {
      return {
        success: false as const,
        response: errorResponse('FORBIDDEN', 'Action restricted to your assigned district.'),
      };
    }
    return { success: true as const };
  }

  return {
    success: false as const,
    response: errorResponse('FORBIDDEN', 'Jurisdiction check failed.'),
  };
}
