import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { getUserCapabilities } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const capabilities = await getUserCapabilities();

  // Route protection — UI guard only; backend enforces real authorization.
  if (!capabilities.isAuthenticated) {
    redirect('/auth/login');
  }

  if (!capabilities.canViewWorkspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="text-lg font-semibold mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account does not have permission to access the workspace. Contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-5">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  );
}
