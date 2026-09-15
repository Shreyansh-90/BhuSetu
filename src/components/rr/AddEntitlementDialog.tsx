'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
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
import { CreateEntitlementRequest, EntitlementTypeSchema } from '@/lib/dtos/rr-entitlements';

const formSchema = z.object({
  entitlementType: EntitlementTypeSchema,
  amount: z.coerce.number().nonnegative({ message: 'Must be ≥ 0' }).optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddEntitlementDialog({
  familyId,
  addEntitlement,
}: {
  familyId: string;
  addEntitlement: (familyId: string, payload: CreateEntitlementRequest) => Promise<{ success: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { entitlementType: 'cash' },
  });

  const selectedType = watch('entitlementType');

  const submit = async (data: FormValues) => {
    setApiError(null);
    const payload: CreateEntitlementRequest = {
      entitlementType: data.entitlementType,
      amount: data.amount ? data.amount : undefined,
      description: data.description ? data.description : undefined,
    };

    const result = await addEntitlement(familyId, payload);

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
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />
          Add Entitlement
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Grant Entitlement</DialogTitle>
          <DialogDescription>
            Assign an R&R entitlement (cash, land, employment) to this family.
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Entitlement Type <span className="text-destructive">*</span></Label>
            <Select defaultValue="cash" onValueChange={(v: any) => setValue('entitlementType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="housing">Housing</SelectItem>
                <SelectItem value="land">Alternative Land</SelectItem>
                <SelectItem value="cash">Cash Annuity / Grant</SelectItem>
                <SelectItem value="employment">Employment</SelectItem>
                <SelectItem value="transportation">Transportation Allowance</SelectItem>
              </SelectContent>
            </Select>
            {errors.entitlementType && <p className="text-xs text-destructive">{errors.entitlementType.message}</p>}
          </div>

          {selectedType === 'cash' || selectedType === 'transportation' ? (
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹) <span className="text-destructive">*</span></Label>
              <Input id="amount" type="number" min={0} placeholder="e.g. 50000" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="description">Description / Details</Label>
            <Input id="description" placeholder="e.g., Plot 42-B in Resettlement Colony" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}