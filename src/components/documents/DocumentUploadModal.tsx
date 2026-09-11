'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DocumentUploadModal({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [classification, setClassification] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 50 * 1024 * 1024) {
        setErrorMsg('File size must be less than 50MB');
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMsg('');
    }
  };

  const handleUpload = async () => {
    if (!file || !classification) {
      setErrorMsg('Please select a file and classification');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');

    try {
      // 1. Get presigned URL
      const intentRes = await fetch(`/api/v1/projects/${projectId}/documents/upload-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          classification,
        }),
      });

      if (!intentRes.ok) {
        throw new Error('Failed to initiate upload');
      }

      const intentData = await intentRes.json();
      const { uploadUrl, documentId } = intentData.data;

      // 2. Upload file directly to MinIO
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage server');
      }

      // 3. Complete upload
      const completeRes = await fetch(`/api/v1/projects/${projectId}/documents/${documentId}/complete`, {
        method: 'POST',
      });

      if (!completeRes.ok) {
        throw new Error('Failed to finalize upload');
      }

      setStatus('idle');
      setOpen(false);
      setFile(null);
      setClassification('');
      onSuccess();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during upload');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Upload Document</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a new document or evidence file to the project repository.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="classification">Classification</Label>
            <Select value={classification} onValueChange={(val) => setClassification(val || '')}>
              <SelectTrigger id="classification">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notice">Notice</SelectItem>
                <SelectItem value="map">Map</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="evidence">Evidence</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file">File</Label>
            <Input id="file" type="file" onChange={handleFileChange} />
          </div>
          {errorMsg && (
            <div className="text-sm text-red-500 font-medium">
              {errorMsg}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={status === 'uploading'}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={status === 'uploading'}>
            {status === 'uploading' ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
