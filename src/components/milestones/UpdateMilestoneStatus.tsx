'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Milestone } from './MilestoneList';
import { ChevronDown, Loader2 } from 'lucide-react';

export default function UpdateMilestoneStatus({ 
  milestone, 
  onSuccess 
}: { 
  milestone: Milestone, 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: string) => {
    if (newStatus === milestone.status) return;
    
    setLoading(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'completed') {
        payload.completedDate = new Date().toISOString().split('T')[0];
      }

      const res = await fetch(`/api/v1/projects/${milestone.projectId}/milestones/${milestone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      onSuccess();
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update milestone status. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        render={
          <Button variant="outline" size="sm" disabled={loading} className="h-7 text-xs px-2">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : 'Update Status'}
            {!loading && <ChevronDown className="h-3 w-3 ml-1 opacity-50" />}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => updateStatus('in_progress')}
          disabled={milestone.status === 'in_progress'}
        >
          Mark In Progress
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => updateStatus('completed')}
          disabled={milestone.status === 'completed'}
        >
          Mark Completed
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => updateStatus('skipped')}
          disabled={milestone.status === 'skipped'}
        >
          Skip Milestone
        </DropdownMenuItem>
        {/* We generally let the system job mark things overdue, but keeping it here if manual intervention is needed */}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => updateStatus('pending')}
          disabled={milestone.status === 'pending'}
        >
          Reset to Pending
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
