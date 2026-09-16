import { getUserCapabilities } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import NationalDashboardData from './NationalDashboardData';

export default async function NationalDashboardPage() {
  const capabilities = await getUserCapabilities();

  if (!capabilities.canViewNationalDashboard) {
    redirect('/workspace');
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto py-2">
      <div className="flex flex-col mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">National Overview</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Macro-level analytics and progress tracking for land acquisition projects across the country.
        </p>
      </div>
      
      <NationalDashboardData />
    </div>
  );
}
