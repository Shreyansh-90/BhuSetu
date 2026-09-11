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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { updateProjectSchema } from '@/lib/dtos/projects';

export default function EditProjectDialog({ project, onSuccess }: { project: any, onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    resolver: zodResolver(updateProjectSchema) as any,
    defaultValues: {
      title: project.title,
      description: project.description || '',
      purpose: project.purpose,
      category: project.category,
      stateCode: project.stateCode,
      districtCode: project.districtCode,
    },
  });

  const onSubmit = async (data: any) => {
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      
      if (!res.ok) {
        setError(json.error?.message || 'Failed to update project');
        return;
      }

      setOpen(false);
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err) {
      setError('A network error occurred.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
        Edit Draft
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Draft</DialogTitle>
          <DialogDescription>
            Modify the details of your project proposal before submission.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input id="title" {...register('title')} placeholder="e.g. NH-48 Expansion" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Public Purpose</Label>
            <Textarea id="purpose" {...register('purpose')} placeholder="Describe the public purpose..." />
            {errors.purpose && <p className="text-sm text-destructive">{errors.purpose.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register('description')} placeholder="Additional details..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={(val) => setValue('category', val)} defaultValue={project.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stateCode">State Code</Label>
              <Input id="stateCode" {...register('stateCode')} placeholder="e.g. MP" maxLength={2} className="uppercase" />
              {errors.stateCode && <p className="text-sm text-destructive">{errors.stateCode.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="districtCode">District Code</Label>
              <Input id="districtCode" {...register('districtCode')} placeholder="e.g. BPL" maxLength={3} className="uppercase" />
              {errors.districtCode && <p className="text-sm text-destructive">{errors.districtCode.message as string}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
