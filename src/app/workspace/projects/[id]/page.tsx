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
import { Info, Map as MapIcon, FileText, Clock, Building2, Calendar, MapPin, Tag, PlusCircle } from 'lucide-react';
import ProjectTimeline from './ProjectTimeline';

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
        return <Badge variant="secondary" className="font-semibold text-xs py-1 px-3">Draft</Badge>;
      case 'submitted':
      case 'under_scrutiny':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 font-semibold text-xs py-1 px-3">In Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-success hover:bg-success/90 font-semibold text-xs py-1 px-3">Approved</Badge>;
      default:
        return <Badge variant="outline" className="font-semibold text-xs py-1 px-3">{status.replace('_', ' ')}</Badge>;
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'draft': return 20;
      case 'submitted': return 40;
      case 'under_scrutiny': return 60;
      case 'approved': return 100;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 w-full" role="status" aria-live="polite">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium">Loading project dossier...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-64 border rounded-xl bg-card">
        <FileText className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold tracking-tight">Project not found</h2>
        <p className="text-muted-foreground mt-2 mb-4 text-sm">The project you are looking for does not exist or you lack permission to view it.</p>
        <Button onClick={() => router.push('/workspace/projects')}>Return to Directory</Button>
      </div>
    );
  }

  const progress = getProgressPercentage(project.status);

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto py-2">
      
      {/* ── U6.1 Project Header Card ── */}
      <Card className="shadow-md border-t-4 border-t-primary overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 md:p-8 flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{project.title}</h1>
                  {getStatusBadge(project.status)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>District: {project.districtCode}</span>
                  <span className="text-border mx-1">•</span>
                  <span>State: {project.stateCode}</span>
                </div>
                <p className="text-foreground/80 max-w-3xl leading-relaxed text-sm md:text-base">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                {project.status === 'draft' && canSubmitProposals && (
                  <>
                    <EditProjectDialog project={project} onSuccess={() => window.location.reload()} />
                    <SubmitProjectDialog projectId={project.id} />
                  </>
                )}
                {project.activeTask && project.activeTask.status === 'pending' && canViewWorkspace && (
                  <ClarificationDialog task={project.activeTask} onSuccess={() => window.location.reload()} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Created</span>
                  <span className="text-sm font-medium">{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Last Updated</span>
                  <span className="text-sm font-medium">{format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Acquiring Authority</span>
                  <span className="text-sm font-medium">Ministry of Rural Development</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Lifecycle Progress</span>
                <span className={progress === 100 ? "text-success" : "text-primary"}>{progress}% Complete</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-in-out ${progress === 100 ? 'bg-success' : 'bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── U6.2 Tab Bar Styling ── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border overflow-x-auto flex-nowrap rounded-none hide-scrollbar">
          
          <TabsTrigger 
            value="overview" 
            className="rounded-none border-b-2 border-transparent py-4 px-6 font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-4 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <Info className="h-4 w-4" /> Overview
          </TabsTrigger>

          <TabsTrigger 
            value="map" 
            className="rounded-none border-b-2 border-transparent py-4 px-6 font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-4 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <MapIcon className="h-4 w-4" /> Map Summary
          </TabsTrigger>

          <TabsTrigger 
            value="documents" 
            className="rounded-none border-b-2 border-transparent py-4 px-6 font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-4 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <FileText className="h-4 w-4" /> Documents
          </TabsTrigger>

          <TabsTrigger 
            value="timeline" 
            className="rounded-none border-b-2 border-transparent py-4 px-6 font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-4 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <Clock className="h-4 w-4" /> Activity Timeline
          </TabsTrigger>

        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="m-0 focus-visible:outline-none">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" /> Project Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</h4>
                    <p className="capitalize font-medium text-foreground">{project.category}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Public Purpose</h4>
                    <p className="font-medium text-foreground">{project.purpose}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estimated Area</h4>
                    <p className="font-medium text-foreground">{project.estimatedAreaSqm ? `${project.estimatedAreaSqm.toLocaleString()} sq.m` : 'Not specified'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-accent" /> Location Constraints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">State Code</h4>
                      <p className="font-medium text-foreground">{project.stateCode}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">District Code</h4>
                      <p className="font-medium text-foreground">{project.districtCode}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/20 border border-border/50 rounded-lg text-sm text-muted-foreground flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Info className="h-4 w-4 text-primary" /> Note
                    </div>
                    Detailed village-level schedules and polygon data are available under the Map Summary tab once submitted.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map" className="m-0 focus-visible:outline-none">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle>Geospatial Intersection Map</CardTitle>
                <CardDescription>Visual summary of the public land intersection and cadastral boundaries.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-96 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/10 gap-4">
                  <MapIcon className="h-12 w-12 opacity-20" />
                  <span className="font-medium">[Map Integration Paused - F2/F3 Pending]</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="m-0 focus-visible:outline-none">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle>Evidence & Documents</CardTitle>
                <CardDescription>Official notices, cadastral maps, and land schedules.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/10 gap-4">
                  <FileText className="h-12 w-12 opacity-20" />
                  <span className="font-medium">[Document Management Paused - F5 Pending]</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="m-0 focus-visible:outline-none">
            <ProjectTimeline projectId={project.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
