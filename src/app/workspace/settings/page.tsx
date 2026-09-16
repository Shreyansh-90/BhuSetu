'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, User, MapPin, Building2, Shield, CheckCircle2 } from 'lucide-react';

type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  stateCode: string | null;
  districtCode: string | null;
  organizationId: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      fullName: ''
    }
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/v1/users/me');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setProfile(json.data);
            reset({ fullName: json.data.fullName });
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: { fullName: string }) => {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setProfile(json.data);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      }
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 w-full" role="status" aria-live="polite">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Could not load profile data.</p>
      </div>
    );
  }

  const formattedRole = profile.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and account preferences.
        </p>
      </div>

      {/* ── Profile Info (Read-Only) ── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Account Overview
          </CardTitle>
          <CardDescription>These fields are managed by your administrator.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
            <p className="font-medium text-foreground">{profile.email}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</span>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              <Badge variant="outline" className="capitalize">{formattedRole}</Badge>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jurisdiction</span>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium text-foreground">
                {profile.stateCode || 'N/A'} / {profile.districtCode || 'N/A'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
            <Badge variant={profile.isActive ? 'success' : 'destructive'} showDot>
              {profile.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Editable Profile ── */}
      <Card className="shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" /> Profile Settings
            </CardTitle>
            <CardDescription>Update your display name.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Your full name"
                {...register('fullName', { required: 'Full name is required' })}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 p-4 flex items-center justify-between">
            <div>
              {success && (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Profile updated successfully.
                </div>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
