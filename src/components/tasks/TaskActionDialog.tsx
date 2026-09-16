'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TaskActionDialogProps {
  taskId: string;
  actionType: 'approve' | 'reject';
  trigger: React.ReactNode;
}

export default function TaskActionDialog({ taskId, actionType, trigger }: TaskActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isApprove = actionType === 'approve';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/workflow/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: actionType,
          resolution: note,
        }),
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        console.error('Failed to update task');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={React.isValidElement(trigger) ? trigger : <span>{trigger}</span>} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
            {isApprove ? 'Approve Task' : 'Reject Task'}
          </DialogTitle>
          <DialogDescription>
            {isApprove 
              ? 'Are you sure you want to approve this project? This will update the project status and log an official audit event.'
              : 'Are you sure you want to reject this project? Please provide a reason.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="note">Resolution Note (Optional)</Label>
            <Textarea 
              id="note" 
              placeholder={isApprove ? "E.g., Approved based on satisfactory documents." : "E.g., Missing Form B submission."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant={isApprove ? "default" : "destructive"} disabled={submitting} className={isApprove ? "bg-success hover:bg-success/90" : ""}>
              {submitting ? 'Processing...' : isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
