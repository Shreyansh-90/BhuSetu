import { getUserCapabilities } from '@/app/actions/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Map, 
  ListTodo, 
  PlusCircle, 
  ArrowRight,
  Activity,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

export default async function WorkspacePage() {
  const capabilities = await getUserCapabilities();
  const user = capabilities.user;

  // Formatting role to be human readable
  const formattedRole = user?.role?.replace(/_/g, ' ') || 'Guest';

  // These will be wired to the API in the next conversation
  const stats = {
    activeProjects: 0,
    pendingTasks: 0,
    notifications: 0,
  };
  
  const recentActivities: any[] = []; // Intentionally left empty per user request

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

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Active Projects
            </CardTitle>
            <Map className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{stats.activeProjects}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pending Tasks
            </CardTitle>
            <ListTodo className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{stats.pendingTasks}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-success sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Unread Notifications
            </CardTitle>
            <Activity className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{stats.notifications}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
        
        {/* ── Quick Actions Grid (Left 2/3) ── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <Link href="/workspace/projects">
              <Card className="group cursor-pointer hover:border-primary/50 transition-colors shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">Project Directory</span>
                    <span className="text-sm text-muted-foreground">View all land acquisition projects</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/workspace/tasks">
              <Card className="group cursor-pointer hover:border-accent/50 transition-colors shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-accent/10 text-accent rounded-xl group-hover:scale-110 transition-transform">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">Task Management</span>
                    <span className="text-sm text-muted-foreground">Review and approve pending tasks</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/workspace/documents">
              <Card className="group cursor-pointer hover:border-success/50 transition-colors shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-success/10 text-success rounded-xl group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">Document Archive</span>
                    <span className="text-sm text-muted-foreground">Access official records and maps</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

          </div>
        </div>

        {/* ── Recent Activity Feed (Right 1/3) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
            <Link href="/workspace/notifications" className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {recentActivities.length > 0 ? (
                <div className="flex flex-col divide-y divide-border">
                  {recentActivities.map((activity, idx) => (
                    <div key={idx} className="p-4">
                      {/* To be implemented in next conversation */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <Activity className="h-8 w-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No recent activity.</p>
                  <p className="text-xs mt-1">Actions performed on the platform will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
