'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import { useAuth } from '@/hooks/use-auth';
import { FolderPlus, MapPin, Building, ArrowRight } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const { canSubmitProposals } = useAuth();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/projects');
      if (res.ok) {
        const json = await res.json();
        setProjects(json.data);
      } else {
        setError('Failed to fetch projects');
      }
    } catch (err) {
      setError('An error occurred while fetching projects.');
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
        return <Badge variant="secondary">Draft</Badge>;
      case 'under_scrutiny':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">In Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      default:
        return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Land Acquisition Projects</h1>
          <p className="text-sm text-muted-foreground">Manage and track proposals across your jurisdiction.</p>
        </div>
        {canSubmitProposals && (
          <CreateProjectDialog onSuccess={fetchProjects} />
        )}
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center p-12 text-muted-foreground">Loading projects...</div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed bg-transparent">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <FolderPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              You don't have access to any projects in your jurisdiction, or none have been created yet.
            </p>
            {canSubmitProposals && (
              <div className="mt-6">
                <CreateProjectDialog onSuccess={fetchProjects} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/workspace/projects/${project.id}`}>
              <Card className="hover:border-primary/50 transition-colors group h-full flex flex-col cursor-pointer">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    {getStatusBadge(project.status)}
                    <Badge variant="outline" className="uppercase text-[10px]">{project.category}</Badge>
                  </div>
                  
                  <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  
                  <div className="mt-auto pt-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{project.districtCode}, {project.stateCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>Created {format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
                <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between text-sm font-medium">
                  <span className="text-muted-foreground group-hover:text-primary transition-colors">View details</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
