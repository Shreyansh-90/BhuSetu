'use client';

import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Calendar,
  FileText,
  MessageSquare,
  RefreshCw,
  Building
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { usePossession } from '@/hooks/use-possession';
import RecordHandoverDialog from './RecordHandoverDialog';
import type { PossessionResponse } from '@/lib/dtos/possession';

function RecordCard({ record }: { record: PossessionResponse }) {
  const dateObj = record.possessionDate ? parseISO(record.possessionDate) : new Date(record.createdAt || Date.now());
  const isComplete = record.status === 'handed_over';

  return (
    <Card className={`relative overflow-hidden transition-all ${isComplete ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
      {isComplete && (
        <div className="absolute top-0 right-0 p-4">
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Handed Over
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base flex items-center gap-2">
          <div className={`p-2 rounded-md ${isComplete ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50' : 'bg-muted text-muted-foreground'}`}>
            <KeyRound className="h-4 w-4" />
          </div>
          Possession Event
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Date of Possession</p>
            <p className="text-sm text-muted-foreground">{format(dateObj, 'PPP')}</p>
          </div>
        </div>

        {record.remarks && (
          <div className="flex items-start gap-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Remarks</p>
              <p className="text-sm text-muted-foreground">{record.remarks}</p>
            </div>
          </div>
        )}

        {record.documents && record.documents.length > 0 && (
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Evidence Documents</p>
              <ul className="mt-1 space-y-1">
                {record.documents.map((doc: string, i: number) => (
                  <li key={i}>
                    <a href={doc.startsWith('http') ? doc : '#'} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[250px] inline-block">
                      {doc}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PossessionWorkspace({ projectId }: { projectId: string }) {
  const { records, isLoading, error, refresh, recordPossession } = usePossession(projectId);
  const { canApproveProposals } = useAuth();

  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
        <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1" onClick={refresh}>
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  const isClosed = records.some(r => r.status === 'handed_over');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Project Closure & Possession</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canApproveProposals && !isClosed && (
            <RecordHandoverDialog recordPossession={recordPossession} />
          )}
        </div>
      </div>

      {isClosed && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-600 text-white rounded-lg p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              Project Officially Acquired
            </h2>
            <p className="text-emerald-100 mt-1">
              Physical possession has been handed over and recorded. The acquisition phase is closed.
            </p>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[250px] rounded-xl" />
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="rounded-full bg-muted p-4">
              <KeyRound className="h-8 w-8 text-muted-foreground opacity-60" />
            </div>
            <div>
              <p className="font-medium text-base">No possession records yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Once compensation and R&R are resolved, authorized officers can record the final physical handover of the project land.
              </p>
            </div>
            {canApproveProposals && (
              <div className="mt-4">
                <RecordHandoverDialog recordPossession={recordPossession} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Handover History</h4>
            {records.map((record, idx) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.1 }}
              >
                <RecordCard record={record} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}