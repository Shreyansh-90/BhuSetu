'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Map, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { signOutAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { isAuthenticated, user, canViewWorkspace } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOutAction();
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    ...(canViewWorkspace ? [{ href: '/workspace', label: 'Workspace' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 h-12 w-full border-b bg-background flex items-center px-4 md:px-6">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 mr-6 font-semibold text-sm tracking-tight shrink-0"
      >
        <Map className="h-4 w-4 text-primary" />
        <span>BhuSetu</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label="Main navigation">
        {navLinks.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Auth controls */}
      <div className="ml-auto flex items-center">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-normal rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="User menu"
            >
              <span className="max-w-[160px] truncate text-muted-foreground">{user?.email}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal space-y-0.5">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role.replace(/_/g, ' ')}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canViewWorkspace && (
                <Link href="/workspace">
                  <DropdownMenuItem>Workspace</DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/auth/login">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
