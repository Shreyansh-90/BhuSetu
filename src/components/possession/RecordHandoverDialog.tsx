'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, AlertTriangle } from 'lucide-react';
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
import { CreatePossessionRequest } from '@/lib/dtos/possession';

const formSchema = z.object({
  possessionDate: z.string().min(1, { message: 'Date is required.' }),
  remarks: z.string().optional(),
  documents: z.string().optional(), // Using a comma separated string for simple UI evidence input
});

type FormValues = z.infer<typeof formSchema>;

export default function RecordHandoverDialog({
  recordPossession,
}: {
  recordPossession: (payload: CreatePossessionRequest) => Promise<{ success: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { possessionDate: new Date().toISOString().split('T')[0] },
  });

  const submit = async (data: FormValues) => {
    setApiError(null);
    const docsArray = data.documents 
      ? data.documents.split(',').map((s: string) => s.trim()).filter(Boolean) 
      : undefined;

    const payload: CreatePossessionRequest = {
      status: 'handed_over',
      possessionDate: data.possessionDate,
      remarks: data.remarks,
      documents: docsArray,
    };

    const result = await recordPossession(payload);

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
        <Button className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
          <KeyRound className="h-4 w-4" />
          Record Final Possession
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            Record Handover
          </DialogTitle>
          <DialogDescription>
            This action formally marks the parcel or project as acquired and in physical possession of the authority. 
            <strong className="text-foreground block mt-2">This is an irreversible closure action.</strong>
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="possessionDate">Date of Possession <span className="text-destructive">*</span></Label>
            <Input id="possessionDate" type="date" {...register('possessionDate')} />
            {errors.possessionDate && <p className="text-xs text-destructive">{errors.possessionDate.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="documents">Evidence Documents (URLs)</Label>
            <Input id="documents" placeholder="Comma-separated links to handover memos, photos, etc." {...register('documents')} />
            <p className="text-[10px] text-muted-foreground">Upload physical handover certificates or site photos.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remarks">Closure Remarks</Label>
            <Input id="remarks" placeholder="Any final notes about the handover..." {...register('remarks')} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Confirming...' : 'Confirm Possession'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}