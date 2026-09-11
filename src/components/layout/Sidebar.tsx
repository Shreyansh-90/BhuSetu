'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  FileText,
  LayoutDashboard,
  FolderOpen,
  ClipboardList,
  Settings,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  show: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { canApproveProposals, canViewNationalDashboard } = useAuth();

  const items: NavItem[] = [
    {
      label: 'Overview',
      href: '/workspace',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Projects',
      href: '/workspace/projects',
      icon: FolderOpen,
      show: true,
    },
    {
      label: 'Tasks',
      href: '/workspace/tasks',
      icon: ClipboardList,
      show: canApproveProposals,
    },
    {
      label: 'Documents',
      href: '/workspace/documents',
      icon: FileText,
      show: true,
    },
    {
      label: 'Settings',
      href: '/workspace/settings',
      icon: Settings,
      show: true,
    },
  ];

  const visible = items.filter((i) => i.show);

  return (
    <nav
      aria-label="Workspace navigation"
      className="w-52 shrink-0 h-[calc(100vh-3rem)] sticky top-12 flex flex-col border-r bg-background"
    >
      <div className="flex-1 py-2 px-2 space-y-0.5">
        {visible.map((item) => {
          const isActive =
            item.href === '/workspace'
              ? pathname === '/workspace'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
