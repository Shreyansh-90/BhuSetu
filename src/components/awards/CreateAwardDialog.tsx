'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
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
import { CreateAwardPayload } from '@/hooks/use-awards';

// ── Local Zod schema (mirrors CreateAwardRequestSchema from DTO) ─────────────

const formSchema = z.object({
  parcelId: z.string().uuid({ message: 'Must be a valid UUID' }),
  assessedAmount: z.coerce.number().nonnegative({ message: "Amount must be >= 0" }).optional(),
  awardDate: z.string().optional(),
  status: z.enum(['draft', 'assessed']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface CreateAwardDialogProps {
  projectId: string;
  onSuccess: () => void;
  /** If not passed, internal fetch will be used (for empty-state button) */
  createAward?: (payload: CreateAwardPayload) => Promise<{ success: boolean; error?: string }>;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CreateAwardDialog({
  projectId,
  onSuccess,
  createAward: createAwardProp,
}: CreateAwardDialogProps) {
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
    defaultValues: { status: 'draft' },
  });

  const submit = async (data: FormValues) => {
    setApiError(null);

    const payload: CreateAwardPayload = {
      parcelId: data.parcelId,
      ...(data.assessedAmount !== undefined && { assessedAmount: data.assessedAmount }),
      ...(data.awardDate && { awardDate: data.awardDate }),
      ...(data.status && { status: data.status }),
    };

    let result: { success: boolean; error?: string };

    if (createAwardProp) {
      result = await createAwardProp(payload);
    } else {
      // Fallback: direct fetch (used when rendered from EmptyState)
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/awards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        result = res.ok
          ? { success: true }
          : { success: false, error: json.error?.message ?? 'Failed to create award' };
      } catch {
        result = { success: false, error: 'A network error occurred.' };
      }
    }

    if (!result.success) {
      setApiError(result.error ?? 'An unknown error occurred.');
      return;
    }

    reset();
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusCircle className="h-4 w-4" />
          Record Award
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record Compensation Award</DialogTitle>
          <DialogDescription>
            Enter the parcel details and assessed compensation amount. Awards in{' '}
            <strong>Draft</strong> status can be updated before finalising.
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(submit)} className="space-y-5 pt-1">
          {/* Parcel ID */}
          <div className="space-y-1.5">
            <Label htmlFor="parcelId">
              Parcel ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="parcelId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
              {...register('parcelId')}
            />
            {errors.parcelId && (
              <p className="text-xs text-destructive">{errors.parcelId.message}</p>
            )}
          </div>

          {/* Assessed Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="assessedAmount">Assessed Amount (₹)</Label>
            <Input
              id="assessedAmount"
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 1250000"
              {...register('assessedAmount')}
            />
            {errors.assessedAmount && (
              <p className="text-xs text-destructive">{errors.assessedAmount.message}</p>
            )}
          </div>

          {/* Award Date & Status — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="awardDate">Award Date</Label>
              <Input id="awardDate" type="date" {...register('awardDate')} />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue="draft"
                onValueChange={(v: string) => setValue('status', v as 'draft' | 'assessed')}
              >
                <SelectTrigger id="awardStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="assessed">Assessed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Award'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
