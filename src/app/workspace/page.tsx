import Link from 'next/link';
import { getUserCapabilities } from '@/app/actions/auth';
import { FolderOpen, ClipboardList, FileText, Map, ArrowRight, Shield } from 'lucide-react';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function WorkspacePage() {
  const capabilities = await getUserCapabilities();
  const name = capabilities.user?.email?.split('@')[0] ?? '';

  const links = [
    {
      label: 'Projects',
      description: 'Land acquisition proposals and lifecycle management.',
      href: '/workspace/projects',
      icon: FolderOpen,
      show: true,
    },
    {
      label: 'Tasks',
      description: 'Pending scrutiny, approvals, and clarification requests.',
      href: '/workspace/tasks',
      icon: ClipboardList,
      show: capabilities.canApproveProposals,
    },
    {
      label: 'Documents',
      description: 'Official notices, maps, and evidence files.',
      href: '/workspace/documents',
      icon: FileText,
      show: true,
    },
    {
      label: 'Map Overview',
      description: 'Spatial view of project boundaries and land parcels.',
      href: '/workspace/map',
      icon: Map,
      show: true,
    },
  ].filter((l) => l.show);

  return (
    <div className="max-w-xl space-y-10">
      {/* Greeting */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}{name ? `, ${name}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate()}</p>
      </div>

      {/* Role badge */}
      {capabilities.user?.role && (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border rounded-full px-3 py-1">
          <Shield className="h-3 w-3" />
          <span className="capitalize">{capabilities.user.role.replace(/_/g, ' ')}</span>
        </div>
      )}

      {/* Navigation cards */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Quick access
        </p>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between px-4 py-3.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <link.icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium leading-tight">{link.label}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {link.description}
                </p>
              </div>
            </div>
            <ArrowRight
              className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      {/* Help note */}
      <p className="text-xs text-muted-foreground">
        All data displayed is based on your administrative scope and authorised access level.
        Contact your administrator if you believe your access is incorrect.
      </p>
    </div>
  );
}
