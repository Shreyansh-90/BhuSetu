'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { FileText, PlusCircle, Activity, CheckCircle2, XCircle } from 'lucide-react';

export default function ProjectTimeline({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/timeline`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setEvents(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch timeline', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [projectId]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'project_created': return <PlusCircle className="h-4 w-4" />;
      case 'status_updated': return <Activity className="h-4 w-4" />;
      case 'project_submitted': return <FileText className="h-4 w-4" />;
      case 'task_approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'task_rejected': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'project_created': return 'bg-muted text-muted-foreground border-background';
      case 'project_submitted': return 'bg-blue-100 text-blue-600 border-background';
      case 'task_approved': return 'bg-success/20 text-success border-background';
      case 'task_rejected': return 'bg-destructive/20 text-destructive border-background';
      default: return 'bg-accent/20 text-accent border-background';
    }
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="border-b border-border/50">
        <CardTitle>Activity Audit Trail</CardTitle>
        <CardDescription>Immutable log of workflow changes and approvals.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex justify-center p-8 text-muted-foreground" role="status" aria-live="polite">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No events recorded yet.</div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {events.map((event) => (
              <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${getEventColor(event.eventType)}`}>
                  {getEventIcon(event.eventType)}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border shadow-sm bg-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium text-muted-foreground">{format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  {event.metadata?.note && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{event.metadata.note}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
