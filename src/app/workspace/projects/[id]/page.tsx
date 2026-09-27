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
import { Info, Map as MapIcon, FileText, Clock, Building2, Calendar, MapPin, Tag, Calculator } from 'lucide-react';
import ProjectTimeline from './ProjectTimeline';
import ProjectParcels from './ProjectParcels';
import ProjectCompensation from './ProjectCompensation';
import ProjectRehabilitation from './ProjectRehabilitation';
import ProjectDocuments from './ProjectDocuments';

import { LifecycleStepper } from '@/components/projects/LifecycleStepper';

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
  const [spatialData, setSpatialData] = useState<{ projectGeometry: any, parcelGeometries: any[] } | null>(null);
  const [spatialLoading, setSpatialLoading] = useState(true);

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

    const fetchSpatialData = async () => {
      setSpatialLoading(true);
      try {
        const res = await fetch(`/api/v1/projects/${resolvedParams.id}/spatial`);
        if (res.ok) {
          const json = await res.json();
          setSpatialData(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch spatial data', err);
      } finally {
        setSpatialLoading(false);
      }
    };

    fetchProject();
    fetchSpatialData();
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



  return (
    <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto py-2">
      
      {/* ── U6.1 Project Header Card ── */}
      <Card className="shadow-sm border rounded-none sm:rounded-lg overflow-hidden mb-2">
        <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{project.title}</h1>
                {getStatusBadge(project.status)}
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3 font-medium">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{project.districtCode}, {project.stateCode}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span className="capitalize">{project.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <p className="text-foreground/80 max-w-4xl text-sm leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
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

            {/* Lifecycle Stepper */}
            <div className="mt-1 pt-3 border-t border-border/50">
              <LifecycleStepper currentStatus={project.status} activeTask={project.activeTask} />
            </div>

        </CardContent>
      </Card>

      {/* ── U6.2 Tab Bar Styling ── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border overflow-x-auto flex-nowrap rounded-none hide-scrollbar">
          
          <TabsTrigger 
            value="overview" 
            className="rounded-none border-b-2 border-transparent py-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <Info className="h-4 w-4" /> Overview
          </TabsTrigger>

          <TabsTrigger 
            value="spatial" 
            className="rounded-none border-b-2 border-transparent py-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <MapIcon className="h-4 w-4" /> Spatial & Parcels
          </TabsTrigger>

          <TabsTrigger 
            value="documents" 
            className="rounded-none border-b-2 border-transparent py-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <FileText className="h-4 w-4" /> Documents
          </TabsTrigger>

          <TabsTrigger 
            value="financials" 
            className="rounded-none border-b-2 border-transparent py-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <Calculator className="h-4 w-4" /> Financials & R&R
          </TabsTrigger>

          <TabsTrigger 
            value="timeline" 
            className="rounded-none border-b-2 border-transparent py-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border data-[state=active]:border-accent data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none transition-all flex items-center gap-2 shrink-0"
          >
            <Clock className="h-4 w-4" /> Activity Timeline
          </TabsTrigger>

        </TabsList>

        <div className="mt-2">
          <TabsContent value="overview" className="m-0 focus-visible:outline-none">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="bg-muted/10 border-b border-border/50 p-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> Project Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</h4>
                      <p className="capitalize font-medium text-foreground text-sm">{project.category}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estimated Area</h4>
                      <p className="font-medium text-foreground text-sm">{project.estimatedAreaSqm ? `${project.estimatedAreaSqm.toLocaleString()} sq.m` : 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Public Purpose</h4>
                    <p className="font-medium text-foreground text-sm">{project.purpose}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="bg-muted/10 border-b border-border/50 p-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" /> Location Constraints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">State Code</h4>
                      <p className="font-medium text-foreground text-sm">{project.stateCode}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">District Code</h4>
                      <p className="font-medium text-foreground text-sm">{project.districtCode}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/50 rounded-md text-xs text-muted-foreground flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Info className="h-3.5 w-3.5 text-primary" /> Note
                    </div>
                    Detailed village-level schedules and polygon data are available under the Spatial & Parcels tab once submitted.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="spatial" className="m-0 focus-visible:outline-none">
            <ProjectParcels projectId={project.id} projectStatus={project.status} spatialData={spatialData} spatialLoading={spatialLoading} />
          </TabsContent>

          <TabsContent value="documents" className="m-0 focus-visible:outline-none">
            <ProjectDocuments projectId={project.id} projectStatus={project.status} />
          </TabsContent>

          <TabsContent value="timeline" className="m-0 focus-visible:outline-none">
            <ProjectTimeline projectId={project.id} />
          </TabsContent>



          <TabsContent value="financials" className="m-0 focus-visible:outline-none flex flex-col gap-4">
            <ProjectCompensation projectId={project.id} projectStatus={project.status} />
            <ProjectRehabilitation projectId={project.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
