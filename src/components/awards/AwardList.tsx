'use client';

import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  BadgeDollarSign,
  CalendarCheck,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useAwards, Award } from '@/hooks/use-awards';
import CreateAwardDialog from './CreateAwardDialog';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function truncateUuid(uuid: string): string {
  return uuid.slice(0, 8) + '…';
}

function StatusBadge({ status }: { status: Award['status'] }) {
  if (status === 'assessed') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
        Assessed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400">
      Draft
    </Badge>
  );
}

// ── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  canCreate,
  projectId,
  onSuccess,
}: {
  canCreate: boolean;
  projectId: string;
  onSuccess: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Scale className="h-8 w-8 text-muted-foreground opacity-60" />
        </div>
        <div>
          <p className="font-medium text-base">No awards recorded yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Compensation assessments for individual land parcels will appear here once created.
          </p>
        </div>
        {canCreate && (
          <CreateAwardDialog projectId={projectId} onSuccess={onSuccess} />
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AwardList({ projectId }: { projectId: string }) {
  const { awards, isLoading, error, refresh, createAward } = useAwards(projectId);
  const { canApproveProposals } = useAuth();

  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 gap-1"
          onClick={refresh}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Compensation Awards</h3>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs">
              {awards.length} {awards.length === 1 ? 'record' : 'records'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canApproveProposals && awards.length > 0 && (
            <CreateAwardDialog
              projectId={projectId}
              onSuccess={refresh}
              createAward={createAward}
            />
          )}
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && awards.length === 0 && (
        <EmptyState
          canCreate={canApproveProposals}
          projectId={projectId}
          onSuccess={refresh}
        />
      )}

      {/* Table */}
      {(isLoading || awards.length > 0) && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">Parcel ID</TableHead>
                <TableHead className="font-semibold text-foreground">Assessed Amount</TableHead>
                <TableHead className="font-semibold text-foreground">Award Date</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                <AnimatePresence>
                  {awards.map((award, idx) => (
                    <motion.tr
                      key={award.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.04 }}
                      className="border-b last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <TableCell>
                        <span
                          className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground/70"
                          title={award.parcelId}
                        >
                          {truncateUuid(award.parcelId)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {formatCurrency(award.assessedAmount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {award.awardDate ? (
                          <span className="flex items-center gap-1">
                            <CalendarCheck className="h-3.5 w-3.5" />
                            {format(parseISO(award.awardDate), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={award.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(parseISO(award.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
