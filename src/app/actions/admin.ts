'use strict';
'use server';

import { requireRole } from '@/lib/auth/guards';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Reset a user's password securely (Admin only).
 */
export async function adminResetUserPassword(authUserId: string, newPassword: string) {
  const authCheck = await requireRole(['admin']);
  if (!authCheck.success) return { success: false, error: { message: 'Unauthorized' } };

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: newPassword,
  });

  if (error) {
    return { success: false, error: { message: error.message } };
  }

  return { success: true, message: 'Password reset successfully.' };
}

/**
 * Update a user's role (Admin only).
 */
export async function adminUpdateUserRole(profileId: string, newRole: string) {
  const authCheck = await requireRole(['admin']);
  if (!authCheck.success) return { success: false, error: { message: 'Unauthorized' } };

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ role: newRole })
    .eq('id', profileId);

  if (error) {
    return { success: false, error: { message: error.message } };
  }
  
  revalidatePath('/workspace/admin/users');
  return { success: true, message: 'Role updated successfully.' };
}

/**
 * Deactivate a user account (Admin only).
 */
export async function adminDeactivateUser(profileId: string) {
  const authCheck = await requireRole(['admin']);
  if (!authCheck.success) return { success: false, error: { message: 'Unauthorized' } };

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ is_active: false })
    .eq('id', profileId);

  if (error) {
    return { success: false, error: { message: error.message } };
  }

  revalidatePath('/workspace/admin/users');
  return { success: true, message: 'User deactivated successfully.' };
}

/**
 * Get all user profiles (Admin only).
 */
export async function adminGetUsers() {
  const authCheck = await requireRole(['admin']);
  if (!authCheck.success) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
