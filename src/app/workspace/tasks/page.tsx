'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyState
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  project: {
    id: string;
    title: string;
    status: string;
  } | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/workflow/tasks');
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="pending" showDot>Pending</Badge>;
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

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Review and action assigned workflow tasks and proposals.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle>Assigned Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Title</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="animate-pulse flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium text-sm">Loading tasks...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableEmptyState colSpan={6} message="No pending tasks assigned to you." />
              ) : (
                tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{t.project?.title || 'System Task'}</TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.dueDate ? format(new Date(t.dueDate), 'MMM d, yyyy') : 'No due date'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(t.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="default" size="sm" onClick={() => router.push(`/workspace/tasks/${t.id}`)}>
                        {t.status === 'pending' || t.status === 'in_progress' ? 'Review' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
