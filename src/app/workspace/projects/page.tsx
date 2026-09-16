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
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';

type Project = {
  id: string;
  title: string;
  status: string;
  category: string;
  stateCode: string;
  districtCode: string;
  createdAt: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/projects');
      if (res.ok) {
        const json = await res.json();
        setProjects(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="draft" showDot>Draft</Badge>;
      case 'submitted':
      case 'under_scrutiny':
        return <Badge variant="pending" showDot>In Review</Badge>;
      case 'approved':
        return <Badge variant="success" showDot>Approved</Badge>;
      default:
        return <Badge variant="outline" showDot>{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage land acquisition projects and proposals.
          </p>
        </div>
        <CreateProjectDialog onSuccess={fetchProjects} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="animate-pulse flex flex-col items-center justify-center gap-3">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium text-sm">Loading projects...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableEmptyState colSpan={6} message="No projects found. Create one to get started." />
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{p.stateCode} / {p.districtCode}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{p.category}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(p.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/workspace/projects/${p.id}`)}>
                        View
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
