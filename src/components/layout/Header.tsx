'use client';

import Link from 'next/link';
import { Menu, User, LogOut, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { signOutAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export function Header() {
  const { isAuthenticated, user, canViewWorkspace } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutAction();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-7xl items-center px-4 md:px-8">
        {/* Mobile Nav */}
        <div className="md:hidden mr-4">
          <Sheet>
            <SheetTrigger>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Main application navigation</SheetDescription>
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
                  Home
                </Link>
                {canViewWorkspace && (
                  <Link href="/workspace" className="text-sm font-medium transition-colors hover:text-primary">
                    Workspace
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo / Brand */}
        <div className="flex items-center gap-2 font-bold text-lg md:text-xl tracking-tight">
          <Map className="h-6 w-6 text-primary" />
          <Link href="/">BhuSetu</Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium ml-6">
          <Link href="/" className="transition-colors hover:text-primary text-muted-foreground data-[active=true]:text-foreground">
            Home
          </Link>
          {canViewWorkspace && (
            <Link href="/workspace" className="transition-colors hover:text-primary text-muted-foreground">
              Workspace
            </Link>
          )}
        </nav>

        {/* Auth / Right side */}
        <div className="flex flex-1 items-center justify-end gap-4">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Role: {user?.role.replace('_', ' ')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canViewWorkspace && (
                  <Link href="/workspace">
                    <DropdownMenuItem>Workspace</DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/login">
              <Button variant="default" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
