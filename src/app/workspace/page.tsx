import { getUserCapabilities } from '@/app/actions/auth';

export default async function WorkspacePage() {
  const capabilities = await getUserCapabilities();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Authority Workspace</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {capabilities.user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards for dashboard */}
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Pending Tasks</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">12</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Projects</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">4</div>
          </div>
        </div>
      </div>
    </div>
  );
}
