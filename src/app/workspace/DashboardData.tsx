'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, ListTodo, Activity, Briefcase, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { useMetrics } from '@/hooks/use-metrics';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardData() {
  const { metrics, loading: metricsLoading } = useMetrics();
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetch('/api/v1/audit-events/recent');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setActivities(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch activities', err);
      } finally {
        setLoadingActivity(false);
      }
    }
    fetchActivities();
  }, []);

  const getEventText = (event: any) => {
    switch(event.eventType) {
      case 'project_created': return 'Project created';
      case 'status_updated': return 'Status updated';
      default: return event.eventType.replace(/_/g, ' ');
    }
  };

  return (
    <>
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
            <div className="text-4xl font-extrabold">
              {metricsLoading ? <span className="animate-pulse">...</span> : metrics.activeProjects}
            </div>
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
            <div className="text-4xl font-extrabold">
              {metricsLoading ? <span className="animate-pulse">...</span> : metrics.pendingTasks}
            </div>
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
            <div className="text-4xl font-extrabold">
              {metricsLoading ? <span className="animate-pulse">...</span> : metrics.unreadNotifications}
            </div>
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
              {loadingActivity ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground" role="status" aria-live="polite">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm font-medium">Loading activity...</p>
                </div>
              ) : activities.length > 0 ? (
                <div className="flex flex-col divide-y divide-border">
                  {activities.map((activity, idx) => (
                    <div key={idx} className="p-4 flex gap-4">
                      <div className="mt-0.5 bg-muted p-2 rounded-full h-fit">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium capitalize">{getEventText(activity)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </p>
                      </div>
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
    </>
  );
}
