'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, CreateProjectDto } from '@/lib/dtos/projects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function CreateProjectDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(createProjectSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      purpose: '',
      category: 'normal',
      stateCode: '',
      districtCode: '',
      requestingOrgId: '00000000-0000-0000-0000-000000000000', // Mock UUID for now
    },
  });

  const onSubmit = async (data: any) => {
    setError(null);
    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      
      if (!res.ok) {
        setError(json.error?.message || 'Failed to create project');
        return;
      }

      setOpen(false);
      reset();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('A network error occurred.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
        New Proposal
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Project Proposal</DialogTitle>
          <DialogDescription>
            Draft a new land acquisition proposal. You can submit it later for review.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Project title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea id="purpose" placeholder="Explain the public purpose" {...register('purpose')} />
            {errors.purpose && <p className="text-sm text-destructive">{errors.purpose.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stateCode">State Code (2 chars)</Label>
              <Input id="stateCode" placeholder="e.g. MP" maxLength={2} {...register('stateCode')} />
              {errors.stateCode && <p className="text-sm text-destructive">{errors.stateCode.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="districtCode">District Code (3 chars)</Label>
              <Input id="districtCode" placeholder="e.g. BPL" maxLength={3} {...register('districtCode')} />
              {errors.districtCode && <p className="text-sm text-destructive">{errors.districtCode.message}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
