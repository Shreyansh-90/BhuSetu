'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { FileText, LayoutDashboard, Map, Settings, ListTodo } from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  show: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { canSubmitProposals, canApproveProposals, canViewNationalDashboard } = useAuth();

  const items: SidebarItem[] = [
    {
      name: 'Dashboard',
      href: '/workspace',
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: 'National Dashboard',
      href: '/workspace/national',
      icon: LayoutDashboard,
      show: canViewNationalDashboard,
    },
    {
      name: 'Projects',
      href: '/workspace/projects',
      icon: Map,
      show: true, // everyone in workspace can see project lists
    },
    {
      name: 'My Tasks',
      href: '/workspace/tasks',
      icon: ListTodo,
      show: canApproveProposals, // simplification for now
    },
    {
      name: 'Documents',
      href: '/workspace/documents',
      icon: FileText,
      show: true,
    },
    {
      name: 'Settings',
      href: '/workspace/settings',
      icon: Settings,
      show: true,
    },
  ];

  return (
    <nav className="flex w-64 flex-col gap-2 border-r bg-muted/20 p-4 h-[calc(100vh-3.5rem)] sticky top-14">
      {items.filter(i => i.show).map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
              isActive ? "bg-muted text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
