'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Download, File, Lock, ShieldCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectDocuments({ projectId, projectStatus }: { projectId: string, projectStatus?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [compensations, setCompensations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Notice');
  const [generating, setGenerating] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ id: string, success: boolean, message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/documents`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompensations = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/compensations`);
      if (res.ok) {
        const json = await res.json();
        setCompensations(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch compensations', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCompensations();
  }, [projectId]);

  const handleGenerateAward = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/compensations/generate-award`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchCompensations();
        window.location.reload(); 
      } else {
        const data = await res.json();
        setError(data.error?.message || "Failed to generate award.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (compensationId: string, file: File) => {
    setVerifyingId(compensationId);
    setVerificationResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/v1/projects/${projectId}/compensations/${compensationId}/verify-award`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setVerificationResult({ id: compensationId, success: res.ok && data.data?.verified, message: data.data?.message || data.error?.message || "Verification failed." });
    } catch (err) {
      setVerificationResult({ id: compensationId, success: false, message: "Unexpected verification error." });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDownload = async (compensationId: string) => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/compensations/${compensationId}/download-award`);
      if (res.ok) {
        const json = await res.json();
        const link = document.createElement('a');
        link.href = json.data.url;
        link.download = json.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError("Failed to download.");
    }
  };

  const isAwardDeclared = compensations.some(c => c.status === 'approved' && c.awardDocumentHash);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', docType);

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchDocuments();
        setFile(null);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> 
          Document Management (MinIO)
        </CardTitle>
        <CardDescription>
          Upload and manage acquisition notices, SIA reports, and final awards.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex flex-col md:flex-row gap-8">
        
        {/* Upload Form */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Upload Document</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={docType} onValueChange={(val) => val && setDocType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Notice">Section Notice (11, 19, 21)</SelectItem>
                  <SelectItem value="SIA_Report">SIA Report</SelectItem>
                  <SelectItem value="Award">Final Award Document</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">File (PDF, PNG, JPG)</label>
              <Input 
                type="file" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer file:text-primary file:bg-primary/10 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2"
              />
            </div>
            <Button type="submit" disabled={!file || uploading} className="w-full">
              {uploading ? 'Uploading...' : <><Upload className="mr-2 h-4 w-4" /> Upload to Storage</>}
            </Button>
          </form>
        </div>

        {/* Document List */}
        <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-border/50 pt-6 md:pt-0 md:pl-8">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Stored Documents</h3>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
              <File className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/10 transition-colors">
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <div className="font-medium truncate">{doc.fileName}</div>
                      <div className="flex gap-2 items-center text-xs text-muted-foreground mt-1">
                        <Badge variant="secondary" className="text-[10px]">{doc.documentType}</Badge>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => window.open(doc.url, '_blank')} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Cryptographic Award Section */}
      {(projectStatus === 'award_declared' || isAwardDeclared) && (
        <div className="border-t border-border/50 bg-muted/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-success" /> Immutable Award Hashes (SHA-256)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Final Section 23 Award documents generated from compensation data and cryptographically signed.
              </p>
            </div>
            {!isAwardDeclared && (
              <Button 
                onClick={handleGenerateAward} 
                disabled={generating || compensations.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {generating ? 'Generating Awards...' : 'Generate Award PDFs'}
              </Button>
            )}
          </div>
          
          {error && <div className="p-3 mb-4 bg-destructive/10 text-destructive text-sm rounded">{error}</div>}

          {isAwardDeclared && (
            <div className="space-y-4">
              {compensations.map(comp => (
                <div key={comp.id} className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-background shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-base">{comp.parcel?.ownerName}</span>
                      <div className="text-sm text-muted-foreground mt-0.5">Parcel: {comp.parcel?.surveyNumber || 'Unknown'} | Total Award: ₹{comp.totalAwardAmount?.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(comp.id)}>
                        <Download className="h-4 w-4 mr-2" /> Download PDF
                      </Button>
                      <div className="relative">
                        <Button size="sm" variant="secondary" disabled={verifyingId === comp.id}>
                          <ShieldCheck className="h-4 w-4 mr-2" /> {verifyingId === comp.id ? 'Verifying...' : 'Verify Tampering'}
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept="application/pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleVerify(comp.id, e.target.files[0]);
                              e.target.value = '';
                            }}
                          />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono p-2 bg-muted rounded border overflow-x-auto">
                    <span className="text-muted-foreground font-sans font-semibold mr-2">SHA-256:</span> 
                    {comp.awardDocumentHash}
                  </div>
                  {verificationResult?.id === comp.id && (
                    <div className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${verificationResult?.success ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                      {verificationResult?.success ? '✓ DOCUMENT INTEGRITY VERIFIED' : '✕ DOCUMENT INTEGRITY FAILED'}
                      <span className="font-normal opacity-80 text-xs ml-auto">{verificationResult?.message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
