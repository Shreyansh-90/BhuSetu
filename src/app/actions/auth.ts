'use server';

import { getAuthenticatedUser, type AuthenticatedUser } from '@/lib/api/auth';
import { createClient } from '@/lib/supabase/server';

export type UserCapabilities = {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null;
  // Based on user role, what can they do in the UI?
  // Note: True authorization is still enforced on the server for all data/actions.
  canViewWorkspace: boolean;
  canSubmitProposals: boolean;
  canApproveProposals: boolean;
  canViewNationalDashboard: boolean;
};

export async function getUserCapabilities(): Promise<UserCapabilities> {
  const result = await getAuthenticatedUser();
  
  if (!result.success) {
    return {
      isAuthenticated: false,
      user: null,
      canViewWorkspace: false,
      canSubmitProposals: false,
      canApproveProposals: false,
      canViewNationalDashboard: false,
    };
  }

  const { user } = result;

  // Derive capabilities from role for UI rendering
  const canViewWorkspace = user.role !== 'viewer';
  const canSubmitProposals = ['field_officer', 'project_manager'].includes(user.role);
  const canApproveProposals = ['district_officer', 'state_officer', 'ministry_officer', 'admin'].includes(user.role);
  const canViewNationalDashboard = ['ministry_officer', 'admin'].includes(user.role);

  return {
    isAuthenticated: true,
    user,
    canViewWorkspace,
    canSubmitProposals,
    canApproveProposals,
    canViewNationalDashboard,
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
