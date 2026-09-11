'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DocumentUploadModal from './DocumentUploadModal';

type Document = {
  id: string;
  projectId: string;
  classification: string;
  status: string;
  createdAt: string;
  latestVersion?: {
    filename: string;
    versionNumber: number;
    sizeBytes: number;
    createdAt: string;
  };
};

export default function DocumentList({ projectId, canUpload }: { projectId: string; canUpload: boolean }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/documents`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/documents/${documentId}/download-url`);
      if (!res.ok) throw new Error('Failed to get download URL');
      const data = await res.json();
      window.location.href = data.data.downloadUrl;
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading documents...</div>;
  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Project Documents</h3>
        {canUpload && <DocumentUploadModal projectId={projectId} onSuccess={fetchDocuments} />}
      </div>
      
      {documents.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-md">
          No documents found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {doc.latestVersion?.filename || 'Unknown'}
                </TableCell>
                <TableCell className="capitalize">{doc.classification}</TableCell>
                <TableCell>
                  <Badge variant={doc.status === 'verified' ? 'default' : 'secondary'}>
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell>v{doc.latestVersion?.versionNumber || 1}</TableCell>
                <TableCell>
                  {format(new Date(doc.latestVersion?.createdAt || doc.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={doc.status === 'initiated'}
                    onClick={() => handleDownload(doc.id)}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
