'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Download,
  IndianRupee,
  MapPin,
  Users,
  KeyRound,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAuditExport } from '@/hooks/use-audit-export';

export default function ProjectDashboard({ projectId }: { projectId: string }) {
  const { kpis, isLoading, error, refresh } = useDashboard(projectId);
  const { exportAuditData, isExporting, error: exportError } = useAuditExport(projectId);
  const { canApproveProposals } = useAuth();

  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
        <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={refresh}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Project Dashboard</h3>
        </div>
        <div className="flex gap-2">
          {canApproveProposals && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-primary/20 text-primary hover:bg-primary/10"
              onClick={exportAuditData}
              disabled={isExporting || isLoading}
            >
              {isExporting ? <span className="animate-spin text-lg">⏳</span> : <Download className="h-4 w-4" />}
              Export Audit Data
            </Button>
          )}
        </div>
      </div>

      {exportError && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {exportError}
        </div>
      )}

      {isLoading || !kpis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-900/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Parcels Acquired</CardTitle>
                <MapPin className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{kpis.totalParcels}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Area: <span className="font-semibold">{kpis.totalAreaAcquired.toFixed(2)} sqm</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Compensation</CardTitle>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{kpis.totalCompensationPaid.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Assessed: <span className="font-semibold">₹{kpis.totalCompensationAssessed.toLocaleString('en-IN')}</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">R&R Families</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{kpis.totalAffectedFamilies}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rehabilitated: <span className="font-semibold">{kpis.familiesRehabilitated}</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-amber-100 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Possession Status</CardTitle>
                <KeyRound className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{kpis.possessionStatus}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated <span className="font-semibold">{new Date(kpis.lastCalculatedAt).toLocaleTimeString()}</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Adding a placeholder for a chart or deeper analytics view in the future */}
      {!isLoading && kpis && (
        <Card className="mt-8 border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="rounded-full bg-background p-4 shadow-sm">
              <FileText className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div>
              <p className="font-medium">Data is fully synchronized.</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Detailed charts and read models will appear here as data density increases over the project lifecycle.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}