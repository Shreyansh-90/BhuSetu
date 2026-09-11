'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { clarificationSchema } from '@/lib/dtos/workflow';
import { AlertCircle } from 'lucide-react';

export default function ClarificationDialog({ task, onSuccess }: { task: any, onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(clarificationSchema) as any,
    defaultValues: {
      resolution: '',
    },
  });

  const onSubmit = async (data: any) => {
    setError(null);
    try {
      const res = await fetch(`/api/v1/workflow/tasks/${task.id}/clarification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      
      if (!res.ok) {
        setError(json.error?.message || 'Failed to submit clarification');
        return;
      }

      setOpen(false);
      reset();
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err) {
      setError('A network error occurred.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
        Submit Clarification
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Clarification</DialogTitle>
          <DialogDescription>
            Provide the requested clarification for this workflow task.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted p-3 rounded-md text-sm mb-4 border border-border flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">{task.title}</div>
            <div className="text-muted-foreground">{task.description}</div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resolution">Clarification / Resolution</Label>
            <Textarea 
              id="resolution" 
              {...register('resolution')} 
              placeholder="Explain how the issue was resolved..." 
              rows={4}
            />
            {errors.resolution && <p className="text-sm text-destructive">{errors.resolution.message as string}</p>}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
