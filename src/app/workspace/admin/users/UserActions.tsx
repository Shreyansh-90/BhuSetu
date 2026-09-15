'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { adminResetUserPassword, adminUpdateUserRole, adminDeactivateUser } from '@/app/actions/admin';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, Key, Shield, UserX, UserCheck } from 'lucide-react';

interface UserActionsProps {
  userId: string;
  authUserId: string;
  currentRole: string;
  isActive: boolean;
  email: string;
}

export function UserActions({ userId, authUserId, currentRole, isActive, email }: UserActionsProps) {
  const [loading, setLoading] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState(currentRole);
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRoleChange = async () => {
    setLoading(true);
    setFeedback(null);
    const result = await adminUpdateUserRole(userId, newRole);
    setLoading(false);
    
    if (result.success) {
      setRoleDialogOpen(false);
    } else {
      setFeedback({ type: 'error', message: result.error?.message || 'Failed to update role' });
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setFeedback(null);
    const result = await adminResetUserPassword(authUserId, newPassword);
    setLoading(false);
    
    if (result.success) {
      setFeedback({ type: 'success', message: 'Password reset successfully. Please share the new password securely.' });
    } else {
      setFeedback({ type: 'error', message: result.error?.message || 'Failed to reset password' });
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    const result = await adminDeactivateUser(userId); // Simplified for deactivate only for now
    setLoading(false);
    if (!result.success) {
      alert('Failed to deactivate user: ' + result.error?.message);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setRoleDialogOpen(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Change Role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isActive && (
            <DropdownMenuItem onClick={handleToggleActive} className="text-destructive focus:text-destructive">
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role and permissions for {email}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(val) => setNewRole(val || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="field_officer">Field Officer</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="district_officer">District Officer</SelectItem>
                <SelectItem value="state_officer">State Officer</SelectItem>
                <SelectItem value="ministry_officer">Ministry Officer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {feedback && feedback.type === 'error' && (
              <p className="text-sm text-destructive mt-2">{feedback.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={loading}>{loading ? 'Saving...' : 'Save Role'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Manually reset the password for {email}. Ensure the new password meets complexity requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <input
              type="text"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            {feedback && (
              <div className={`p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-destructive/10 text-destructive'}`}>
                {feedback.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialogOpen(false);
              setFeedback(null);
              setNewPassword('');
            }} disabled={loading}>Close</Button>
            <Button onClick={handlePasswordReset} disabled={loading || !newPassword}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
