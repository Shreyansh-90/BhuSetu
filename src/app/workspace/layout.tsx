import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { getUserCapabilities } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const capabilities = await getUserCapabilities();

  // Route protection - UI only (backend still enforces real security)
  if (!capabilities.isAuthenticated) {
    redirect('/auth/login');
  }

  if (!capabilities.canViewWorkspace) {
    // Show unauthorized state
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to view the workspace.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
