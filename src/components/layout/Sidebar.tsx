'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { FileText, LayoutDashboard, Map, Settings, ListTodo, Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  show: boolean;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, canSubmitProposals, canApproveProposals, canViewNationalDashboard } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator': return 'bg-destructive/10 text-destructive';
      case 'acquiring_authority': return 'bg-primary/10 text-primary';
      case 'district_collector': return 'bg-accent/10 text-accent';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const navItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/workspace', icon: LayoutDashboard, show: true },
    { name: 'National Dashboard', href: '/workspace/national', icon: LayoutDashboard, show: canViewNationalDashboard },
    { name: 'Projects', href: '/workspace/projects', icon: Map, show: true },
    { name: 'My Tasks', href: '/workspace/tasks', icon: ListTodo, show: canApproveProposals },
    { name: 'Notifications', href: '/workspace/notifications', icon: Bell, show: true, badge: 3 }, // Example badge
  ];

  const managementItems: SidebarItem[] = [
    { name: 'Documents', href: '/workspace/documents', icon: FileText, show: true },
    { name: 'Settings', href: '/workspace/settings', icon: Settings, show: true },
  ];

  const renderNavGroup = (title: string, items: SidebarItem[]) => {
    const visibleItems = items.filter(i => i.show);
    if (visibleItems.length === 0) return null;

    return (
      <div className="flex flex-col gap-1 mb-6">
        <h4 className="px-4 text-xs font-semibold text-muted-foreground tracking-wider mb-2">{title}</h4>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/workspace' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-2.5 text-[15px] font-medium transition-all hover:bg-muted/50 border-l-4",
                isActive 
                  ? "border-accent bg-accent/5 text-foreground font-semibold" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-5 w-5", isActive ? "text-accent" : "text-muted-foreground")} />
                {item.name}
              </div>
              {item.badge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-card h-[calc(100vh-3.5rem)] sticky top-14 shrink-0 overflow-y-auto overflow-x-hidden">
      
      {/* User Profile Card */}
      <div className="p-4 border-b border-border/50 mb-4 bg-muted/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate text-foreground">{user?.email || 'Unknown User'}</span>
            <span className={cn(
              "text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded w-fit mt-1",
              getRoleColor(user?.role || '')
            )}>
              {user?.role?.replace(/_/g, ' ') || 'Guest'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 pb-4">
        {renderNavGroup("NAVIGATION", navItems)}
        {renderNavGroup("MANAGEMENT", managementItems)}
      </nav>
      
    </aside>
  );
}
