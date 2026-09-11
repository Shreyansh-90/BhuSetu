'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Human-readable labels for known path segments. */
const SEGMENT_LABELS: Record<string, string> = {
  workspace: 'Workspace',
  projects: 'Projects',
  tasks: 'Tasks',
  documents: 'Documents',
  settings: 'Settings',
  national: 'National Dashboard',
};

interface Crumb {
  label: string;
  href: string;
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Only render inside /workspace with more than one segment
  if (!segments.includes('workspace') || segments.length <= 1) return null;

  const crumbs: Crumb[] = [];
  let path = '';

  for (const segment of segments) {
    path += `/${segment}`;
    // Use a human label if known, otherwise show the raw segment (e.g. a UUID)
    const label = SEGMENT_LABELS[segment] ?? segment;
    crumbs.push({ label, href: path });
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm mb-5', className)}>
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, idx) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
          {idx === crumbs.length - 1 ? (
            <span className="text-foreground font-medium" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
