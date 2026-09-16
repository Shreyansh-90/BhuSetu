'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage your account profile, application preferences, and security settings.
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details. Some fields are locked by your organization administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={user?.fullName || ''} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" defaultValue={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Assigned Role</Label>
                  <Input id="role" defaultValue={user?.role?.replace(/_/g, ' ') || 'viewer'} disabled className="capitalize" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input id="organization" defaultValue="Ministry of Rural Development" disabled />
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>
                Customize your BhuSetu workspace experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive daily summaries of pending workflow tasks.</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>Enabled</Button>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Toggle the application theme.</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>System Default</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and active sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Password</Label>
                    <p className="text-sm text-muted-foreground">Last changed 3 months ago.</p>
                  </div>
                  <Button variant="outline" size="sm">Update Password</Button>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Two-Factor Authentication (2FA)</Label>
                    <p className="text-sm text-muted-foreground">Required by organizational policy.</p>
                  </div>
                  <Button variant="secondary" size="sm" disabled>Enforced</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
