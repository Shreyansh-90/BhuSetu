import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse } from './response';
import type { RequestLogger } from './logger';

// ---------------------------------------------------------------------------
// User role type (mirrors the user_role enum from schema)
// ---------------------------------------------------------------------------
export type UserRole =
  | 'admin'
  | 'ministry_officer'
  | 'state_officer'
  | 'district_officer'
  | 'field_officer'
  | 'project_manager'
  | 'rehabilitation_officer'
  | 'viewer';

// ---------------------------------------------------------------------------
// Authenticated user shape returned from auth extraction
// ---------------------------------------------------------------------------
export interface AuthenticatedUser {
  /** user_profiles.id */
  id: string;
  /** Supabase auth.users.id */
  authUserId: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  stateCode: string | null;
  districtCode: string | null;
}

// ---------------------------------------------------------------------------
// Auth extraction
// ---------------------------------------------------------------------------

/**
 * Extract and verify the authenticated user from the current request.
 *
 * 1. Reads the Supabase session from cookies (server-side SSR client).
 * 2. Looks up the user_profiles row via the admin client (bypasses RLS).
 * 3. Returns the AuthenticatedUser or a 401 error response.
 */
export async function getAuthenticatedUser(
  logger?: RequestLogger,
): Promise<
  | { success: true; user: AuthenticatedUser }
  | { success: false; response: ReturnType<typeof errorResponse> }
> {
  try {
    // Step 1: Get Supabase session user from cookies
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      logger?.warn('Authentication failed: no valid session.', {
        authError: authError?.message,
      });
      return {
        success: false,
        response: errorResponse('UNAUTHENTICATED', 'Authentication required.'),
      };
    }

    // Step 2: Look up user profile (using admin client to bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, email, full_name, role, organization_id, state_code, district_code, is_active')
      .eq('auth_user_id', authUser.id)
      .single();

    if (profileError || !profile) {
      logger?.warn('Authenticated user has no profile.', {
        authUserId: authUser.id,
        profileError: profileError?.message,
      });
      return {
        success: false,
        response: errorResponse('FORBIDDEN', 'User profile not found. Contact an administrator.'),
      };
    }

    if (!profile.is_active) {
      logger?.warn('Inactive user attempted access.', {
        userId: profile.id,
      });
      return {
        success: false,
        response: errorResponse('FORBIDDEN', 'User account is inactive.'),
      };
    }

    const authenticatedUser: AuthenticatedUser = {
      id: profile.id,
      authUserId: profile.auth_user_id,
      email: profile.email,
      role: profile.role as UserRole,
      organizationId: profile.organization_id,
      stateCode: profile.state_code,
      districtCode: profile.district_code,
    };

    return { success: true, user: authenticatedUser };
  } catch (err) {
    logger?.error('Unexpected auth extraction error.', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return {
      success: false,
      response: errorResponse('INTERNAL_ERROR', 'Authentication check failed.'),
    };
  }
}
