'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, CheckCircle2, XCircle, FileText, Calendar, Building2, MapPin } from 'lucide-react';
import TaskActionDialog from '@/components/tasks/TaskActionDialog';

type TaskDetail = {
  task: {
    id: string;
    title: string;
    description: string;
    status: string;
    dueDate: string | null;
    createdAt: string;
    resolution: string | null;
  };
  project: {
    id: string;
    title: string;
    description: string;
    category: string;
    stateCode: string;
    districtCode: string;
    estimatedAreaSqm: number;
    status: string;
  };
  assignedBy: {
    name: string;
    role: string;
  } | null;
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/workflow/tasks/${resolvedParams.id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch task', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [resolvedParams.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="pending" showDot>Pending Review</Badge>;
      case 'in_progress':
        return <Badge variant="pending" showDot>In Progress</Badge>;
      case 'completed':
      case 'approved':
        return <Badge variant="success" showDot>Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive" showDot>Rejected</Badge>;
      default:
        return <Badge variant="outline" showDot>{status.replace('_', ' ')}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 w-full" role="status" aria-live="polite">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium">Loading task dossier...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-64 border rounded-xl bg-card">
        <FileText className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold tracking-tight">Task not found</h2>
        <p className="text-muted-foreground mt-2 mb-4 text-sm">This task may have been completed or you lack permission to view it.</p>
        <Button onClick={() => router.push('/workspace/tasks')}>Return to Tasks</Button>
      </div>
    );
  }

  const { task, project } = data;
  const canAction = task.status === 'pending' || task.status === 'in_progress';

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl">
      
      {/* ── Left Column: Task Context & Actions ── */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        
        <Card className="shadow-md border-t-4 border-t-accent">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workflow Task</span>
              {getStatusBadge(task.status)}
            </div>
            <CardTitle className="text-xl">{task.title}</CardTitle>
            <CardDescription className="text-foreground/80 mt-2">
              {task.description || 'No specific instructions provided.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border border-border/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Due Date</span>
                <span className="text-sm font-medium text-foreground">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No deadline'}
                </span>
              </div>
            </div>
          </CardContent>
          {canAction && (
            <CardFooter className="bg-muted/10 border-t flex flex-col gap-3 p-4">
              <p className="text-sm font-medium text-muted-foreground w-full mb-1">Take Action</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <TaskActionDialog 
                  taskId={task.id} 
                  actionType="approve" 
                  trigger={
                    <Button variant="default" className="w-full bg-success hover:bg-success/90">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  } 
                />
                <TaskActionDialog 
                  taskId={task.id} 
                  actionType="reject" 
                  trigger={
                    <Button variant="destructive" className="w-full">
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  } 
                />
              </div>
            </CardFooter>
          )}
          {!canAction && task.resolution && (
            <CardFooter className="bg-muted/10 border-t flex flex-col items-start gap-2 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resolution Note</span>
              <p className="text-sm text-foreground italic">"{task.resolution}"</p>
            </CardFooter>
          )}
        </Card>

      </div>

      {/* ── Right Column: Project Context ── */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Project Dossier Summary
            </CardTitle>
            <CardDescription>Read-only view of the submitted project details.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6 flex flex-col gap-6">
              
              <div>
                <h3 className="text-xl font-bold tracking-tight mb-2">{project.title}</h3>
                <p className="text-muted-foreground">{project.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</h4>
                  <p className="capitalize font-medium text-foreground">{project.category}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estimated Area</h4>
                  <p className="font-medium text-foreground">
                    {project.estimatedAreaSqm ? `${project.estimatedAreaSqm.toLocaleString()} sq.m` : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/5 flex items-start gap-3">
                <MapPin className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</h4>
                  <p className="font-medium text-foreground">District: {project.districtCode}, State: {project.stateCode}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Reviewer Guidelines</span>
                  <p>Please ensure that the estimated area and purpose align with the National Highways Act requirements. For full spatial verification, open the project map view.</p>
                  <Button variant="link" className="px-0 text-blue-700 h-auto w-fit" onClick={() => window.open(`/workspace/projects/${project.id}`, '_blank')}>
                    Open Full Project View →
                  </Button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
