'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  Banknote,
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
import { usePayments, Payment } from '@/hooks/use-payments';

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
  if (!uuid) return '—';
  return uuid.slice(0, 8) + '…';
}

function StatusBadge({ status }: { status: Payment['paymentStatus'] }) {
  switch (status) {
    case 'reconciled':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
          Reconciled
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400">
          Pending
        </Badge>
      );
    case 'disputed':
      return (
        <Badge variant="outline" className="text-purple-600 border-purple-300 dark:text-purple-400">
          Disputed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive">
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Scale className="h-8 w-8 text-muted-foreground opacity-60" />
        </div>
        <div>
          <p className="font-medium text-base">No payments found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Payment data is ingested automatically from external systems once compensation is processed.
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} className="mt-2 gap-1.5">
          <RefreshCw className="h-4 w-4" /> Check for updates
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PaymentList({ projectId }: { projectId: string }) {
  const { payments, isLoading, error, refresh } = usePayments(projectId);

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
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Payment Reconciliation</h3>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs">
              {payments.length} {payments.length === 1 ? 'record' : 'records'}
            </Badge>
          )}
        </div>
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
      </div>

      {!isLoading && payments.length === 0 && <EmptyState onRefresh={refresh} />}

      {(isLoading || payments.length > 0) && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">Award ID</TableHead>
                <TableHead className="font-semibold text-foreground">Assessed</TableHead>
                <TableHead className="font-semibold text-foreground">Paid</TableHead>
                <TableHead className="font-semibold text-foreground">Variance</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                <AnimatePresence>
                  {payments.map((p, idx) => {
                    const assessed = p.assessedAmount ?? 0;
                    const paid = p.paidAmount ?? 0;
                    const variance = paid - assessed;
                    const hasVariance = variance !== 0 && (p.assessedAmount !== null && p.paidAmount !== null);

                    return (
                      <motion.tr
                        key={p.id || idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: idx * 0.04 }}
                        className="border-b last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <TableCell>
                          <span
                            className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground/70"
                            title={p.awardId}
                          >
                            {truncateUuid(p.awardId)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {formatCurrency(p.assessedAmount)}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {formatCurrency(p.paidAmount)}
                        </TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {hasVariance ? (
                            <span className={variance > 0 ? 'text-emerald-600' : 'text-destructive'}>
                              {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.paymentStatus} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono">
                          {p.externalReference || '—'}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}