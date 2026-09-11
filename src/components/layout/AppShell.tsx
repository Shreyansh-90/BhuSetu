import { ReactNode } from 'react';
import { Header } from './Header';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex-1 flex w-full flex-col">
        {children}
      </div>
    </div>
  );
}
