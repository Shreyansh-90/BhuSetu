'use client';

import Link from 'next/link';
import { Menu, LogOut, Landmark, LayoutDashboard, Map, Settings, ListTodo, FileText, Bell } from 'lucide-react';
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
import { useRouter, usePathname } from 'next/navigation';
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
    { name: 'Home', href: '/' },
    ...(canViewWorkspace ? [{ name: 'Workspace', href: '/workspace' }] : []),
  ];

  return (
    <div className="flex flex-col w-full">
      {/* U2.1 - National Identity Strip */}
      <div className="w-full bg-primary text-primary-foreground h-8 flex items-center justify-between px-4 md:px-8 text-[11px] md:text-xs">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4" /> {/* Placeholder for Ashoka Emblem */}
          <span className="font-medium tracking-wide">भारत सरकार | Government of India</span>
        </div>
        <div className="hidden sm:block font-medium">
          भूमि अधिग्रहण एवं प्रबंधन मंच
        </div>
      </div>

      {/* U2.2 - Main Header */}
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
                <SheetTitle className="text-left font-bold text-lg mb-2 text-primary">BhuSetu Nav</SheetTitle>
                <SheetDescription className="sr-only">Main application navigation</SheetDescription>
                <nav className="flex flex-col mt-6 overflow-y-auto max-h-[80vh]">
                <div className="flex flex-col gap-1 mb-6">
                  <h4 className="px-2 text-xs font-semibold text-muted-foreground tracking-wider mb-2">NAVIGATION</h4>
                  
                  <Link href="/" className={cn("flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium transition-all rounded-md", pathname === '/' ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                    <Landmark className="h-5 w-5" /> Home
                  </Link>
                  
                  {canViewWorkspace && (
                    <Link href="/workspace" className={cn("flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium transition-all rounded-md", pathname === '/workspace' ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                      <LayoutDashboard className="h-5 w-5" /> Dashboard
                    </Link>
                  )}
                  
                  {canViewWorkspace && (
                    <Link href="/workspace/projects" className={cn("flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium transition-all rounded-md", pathname.startsWith('/workspace/projects') ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                      <Map className="h-5 w-5" /> Projects
                    </Link>
                  )}

                  {canViewWorkspace && (
                    <Link href="/workspace/tasks" className={cn("flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium transition-all rounded-md", pathname.startsWith('/workspace/tasks') ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                      <ListTodo className="h-5 w-5" /> My Tasks
                    </Link>
                  )}

                  {canViewWorkspace && (
                    <Link href="/workspace/notifications" className={cn("flex items-center justify-between px-3 py-2.5 text-[15px] font-medium transition-all rounded-md", pathname.startsWith('/workspace/notifications') ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5" /> Notifications
                      </div>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">3</span>
                    </Link>
                  )}
                </div>

                {canViewWorkspace && (
                  <div className="flex flex-col gap-1 mb-6">
                    <h4 className="px-2 text-xs font-semibold text-muted-foreground tracking-wider mb-2">MANAGEMENT</h4>
                    
                    <Link href="/workspace/documents" className={cn("flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium transition-all rounded-md", pathname.startsWith('/workspace/documents') ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                      <FileText className="h-5 w-5" /> Documents
                    </Link>
                    
                    <Link href="/workspace/settings" className={cn("flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium transition-all rounded-md", pathname.startsWith('/workspace/settings') ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                      <Settings className="h-5 w-5" /> Settings
                    </Link>
                  </div>
                )}
              </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo / Brand Block */}
          <div className="flex items-center gap-3">
            <Landmark className="h-8 w-8 text-primary hidden sm:block" />
            <Link href="/" className="flex flex-col justify-center">
              <span className="font-bold text-lg md:text-xl tracking-tight leading-none text-primary">
                भू-सेतु / BhuSetu
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground font-medium mt-0.5 hidden sm:block">
                National Land Acquisition Portal
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium ml-10 h-full">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={cn(
                    "relative flex items-center h-full transition-colors hover:text-primary text-muted-foreground",
                    isActive && "text-foreground font-semibold"
                  )}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-accent rounded-t-sm" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Auth / Right side */}
          <div className="flex flex-1 items-center justify-end gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-1 ring-border">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">{user?.email}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        Role: {user?.role.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canViewWorkspace && (
                    <Link href="/workspace">
                      <DropdownMenuItem className="cursor-pointer">Workspace</DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-sm">
                  Authority Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
