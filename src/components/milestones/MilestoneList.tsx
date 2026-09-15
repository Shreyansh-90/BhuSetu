'use client';

import { useState, useEffect } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import CreateMilestoneDialog from './CreateMilestoneDialog';
import UpdateMilestoneStatus from './UpdateMilestoneStatus';

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped';
  dueDate: string | null;
  completedDate: string | null;
  slaDays: number | null;
  assignedTo: string | null;
  sortOrder: number;
};

export default function MilestoneList({ projectId }: { projectId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated } = useAuth();

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/milestones`);
      if (!res.ok) throw new Error('Failed to fetch milestones');
      const json = await res.json();
      setMilestones(json.data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const canManageMilestones = user?.role === 'project_manager' || user?.role === 'admin';

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'overdue': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Milestone['status']) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completed</Badge>;
      case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">In Progress</Badge>;
      case 'skipped': return <Badge variant="outline">Skipped</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm font-medium flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Project Milestones</h3>
        {canManageMilestones && (
          <CreateMilestoneDialog projectId={projectId} onSuccess={fetchMilestones} />
        )}
      </div>

      {milestones.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <h4 className="text-lg font-medium mb-1">No milestones defined</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Track project progress by defining key milestones and SLAs.
            </p>
            {canManageMilestones && (
              <CreateMilestoneDialog projectId={projectId} onSuccess={fetchMilestones} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white dark:border-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                {getStatusIcon(milestone.status)}
              </div>
              
              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-none">
                      {milestone.title}
                    </CardTitle>
                    {milestone.dueDate && (
                      <div className="flex items-center text-xs text-muted-foreground pt-1">
                        <Calendar className="mr-1 h-3 w-3" />
                        Due: {format(parseISO(milestone.dueDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  {getStatusBadge(milestone.status)}
                </CardHeader>
                <CardContent className="pt-0">
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {milestone.description}
                    </p>
                  )}
                  <div className="flex justify-between items-end mt-2 pt-3 border-t">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                       {milestone.slaDays && <span>SLA: {milestone.slaDays} days</span>}
                    </div>
                    {isAuthenticated && (
                      <UpdateMilestoneStatus 
                        milestone={milestone} 
                        onSuccess={fetchMilestones}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
