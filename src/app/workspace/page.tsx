import { getUserCapabilities } from '@/app/actions/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
} from 'lucide-react';
import DashboardData from './DashboardData';

export default async function WorkspacePage() {
  const capabilities = await getUserCapabilities();
  const user = capabilities.user;

  // Formatting role to be human readable
  const formattedRole = user?.role?.replace(/_/g, ' ') || 'Guest';

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto py-6">
      
      {/* ── Greeting Card ── */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md relative overflow-hidden">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} 
        />
        
        <div className="flex items-center gap-6 relative z-10">
          <Avatar className="h-20 w-20 border-4 border-primary-foreground/20 shadow-lg">
            <AvatarFallback className="bg-background text-foreground text-2xl font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
              Welcome back,
            </h1>
            <p className="text-lg opacity-90 font-medium truncate max-w-[300px] sm:max-w-md">
              {user?.email}
            </p>
            <span className="mt-3 text-xs uppercase tracking-wider font-bold px-3 py-1 bg-accent text-accent-foreground rounded-full w-fit shadow-sm">
              {formattedRole}
            </span>
          </div>
        </div>
        
        {capabilities.canSubmitProposals && (
          <div className="relative z-10 w-full md:w-auto">
            <Button size="lg" className="w-full md:w-auto bg-background text-foreground hover:bg-muted font-bold gap-2">
              <PlusCircle className="h-5 w-5" /> New Proposal
            </Button>
          </div>
        )}
      </div>

      <DashboardData />
    </div>
  );
}
