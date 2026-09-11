'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SubmitProjectDialog from '@/components/projects/SubmitProjectDialog';
import EditProjectDialog from '@/components/projects/EditProjectDialog';
import ClarificationDialog from '@/components/projects/ClarificationDialog';
import { useAuth } from '@/hooks/use-auth';

type Project = {
  id: string;
  title: string;
  description?: string;
  purpose: string;
  status: string;
  category: string;
  stateCode: string;
  districtCode: string;
  estimatedAreaSqm?: number;
  createdAt: string;
  updatedAt: string;
  activeTask?: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { canSubmitProposals, canViewWorkspace } = useAuth();

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/projects/${resolvedParams.id}`);
        if (res.ok) {
          const json = await res.json();
          setProject(json.data);
        } else {
          // Redirect or show error
        }
      } catch (err) {
        console.error('Failed to fetch project', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [resolvedParams.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'submitted':
      case 'under_scrutiny':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">In Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      default:
        return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading project details...</div>;
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Project not found</h2>
        <Button variant="link" onClick={() => router.push('/workspace/projects')}>Return to list</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
            {getStatusBadge(project.status)}
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {project.description || 'No description provided.'}
          </p>
        </div>
        <div className="flex gap-2">
          {project.status === 'draft' && canSubmitProposals && (
            <>
              <EditProjectDialog project={project} onSuccess={() => {
                window.location.reload(); 
              }} />
              <SubmitProjectDialog projectId={project.id} />
            </>
          )}
          {project.activeTask && project.activeTask.status === 'pending' && canViewWorkspace && (
            <ClarificationDialog task={project.activeTask} onSuccess={() => window.location.reload()} />
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Map Summary</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <p className="capitalize">{project.category}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Public Purpose</h4>
                  <p>{project.purpose}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Estimated Area</h4>
                  <p>{project.estimatedAreaSqm ? `${project.estimatedAreaSqm} sq.m` : 'Not specified'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location & Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">State Code</h4>
                    <p>{project.stateCode}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">District Code</h4>
                    <p>{project.districtCode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
                    <p>{format(new Date(project.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Last Updated</h4>
                    <p>{format(new Date(project.updatedAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Map View</CardTitle>
              <CardDescription>Visual summary of the public land intersection.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground bg-muted/20">
                [Map Integration Paused - F2/F3 Pending]
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Evidence & Documents</CardTitle>
              <CardDescription>Official notices, maps, and land schedules.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground bg-muted/20">
                [Document Management Paused - F5 Pending]
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Audit trail of workflow changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm">
                  <span className="font-medium">Project Created</span>
                  <span className="text-muted-foreground ml-2">{format(new Date(project.createdAt), 'MMM d, yyyy HH:mm')}</span>
                </div>
                {project.status !== 'draft' && (
                  <div className="text-sm">
                    <span className="font-medium text-blue-600">Project Submitted</span>
                    <span className="text-muted-foreground ml-2">Moved to workflow review</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
