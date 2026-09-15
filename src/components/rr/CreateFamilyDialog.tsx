'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateFamilyRequest, FamilyCategorySchema } from '@/lib/dtos/rr-entitlements';

const formSchema = z.object({
  headOfFamilyName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  familySize: z.coerce.number().int().min(1, { message: 'Must be at least 1.' }),
  category: FamilyCategorySchema,
  parcelId: z.string().uuid({ message: 'Must be a valid UUID.' }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateFamilyDialog({
  projectId,
  createFamily,
}: {
  projectId: string;
  createFamily: (payload: CreateFamilyRequest) => Promise<{ success: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { familySize: 1, category: 'owner' },
  });

  const submit = async (data: FormValues) => {
    setApiError(null);
    const payload: CreateFamilyRequest = {
      headOfFamilyName: data.headOfFamilyName,
      familySize: data.familySize,
      category: data.category,
      parcelId: data.parcelId ? data.parcelId : undefined,
    };

    const result = await createFamily(payload);

    if (!result.success) {
      setApiError(result.error ?? 'An unknown error occurred.');
      return;
    }

    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Register Family
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Register Affected Family</DialogTitle>
          <DialogDescription>
            Record a family displaced or affected by this project to begin their R&R process.
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="headOfFamilyName">Head of Family Name <span className="text-destructive">*</span></Label>
            <Input id="headOfFamilyName" placeholder="e.g., Ramesh Kumar" {...register('headOfFamilyName')} />
            {errors.headOfFamilyName && <p className="text-xs text-destructive">{errors.headOfFamilyName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="familySize">Family Size <span className="text-destructive">*</span></Label>
              <Input id="familySize" type="number" min={1} {...register('familySize')} />
              {errors.familySize && <p className="text-xs text-destructive">{errors.familySize.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select defaultValue="owner" onValueChange={(v: any) => setValue('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="agricultural_laborer">Agricultural Laborer</SelectItem>
                  <SelectItem value="artisan">Artisan</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parcelId">Parcel ID (Optional)</Label>
            <Input id="parcelId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="font-mono text-sm" {...register('parcelId')} />
            {errors.parcelId && <p className="text-xs text-destructive">{errors.parcelId.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}