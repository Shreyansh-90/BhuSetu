'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  Users,
  Home,
  CheckCircle2,
  Clock,
  Briefcase,
  Map,
  Banknote,
  Car,
  RefreshCw,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useRR } from '@/hooks/use-rr';
import CreateFamilyDialog from './CreateFamilyDialog';
import AddEntitlementDialog from './AddEntitlementDialog';
import type { FamilyResponse, EntitlementResponse } from '@/lib/dtos/rr-entitlements';

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getEntitlementIcon(type: string) {
  switch (type) {
    case 'housing': return <Home className="h-4 w-4" />;
    case 'cash': return <Banknote className="h-4 w-4" />;
    case 'land': return <Map className="h-4 w-4" />;
    case 'employment': return <Briefcase className="h-4 w-4" />;
    case 'transportation': return <Car className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
  }
}

function EntitlementItem({ entitlement }: { entitlement: EntitlementResponse }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <div className="bg-muted p-1.5 rounded text-muted-foreground">
          {getEntitlementIcon(entitlement.entitlementType)}
        </div>
        <div>
          <p className="text-sm font-medium capitalize">{entitlement.entitlementType.replace('_', ' ')}</p>
          {(entitlement.amount || entitlement.description) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {entitlement.amount ? formatCurrency(entitlement.amount) : ''}
              {entitlement.amount && entitlement.description ? ' • ' : ''}
              {entitlement.description}
            </p>
          )}
        </div>
      </div>
      <div>
        {entitlement.status === 'provided' ? (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> Provided
          </Badge>
        ) : entitlement.status === 'approved' ? (
          <Badge variant="outline" className="text-blue-600 border-blue-300 flex items-center gap-1 text-[10px]">
            <Clock className="h-3 w-3" /> Approved
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] text-muted-foreground">Pending</Badge>
        )}
      </div>
    </div>
  );
}

function FamilyCard({ family, addEntitlement, canApprove }: { family: FamilyResponse, addEntitlement: any, canApprove: boolean }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {family.headOfFamilyName}
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="capitalize text-xs font-normal">
                {family.category.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                Size: {family.familySize}
              </Badge>
            </div>
          </div>
          <Badge variant={family.status === 'provided' ? 'default' : 'secondary'} className={family.status === 'provided' ? 'bg-emerald-600' : ''}>
            {family.status === 'provided' ? 'Rehabilitated' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Entitlements ({family.entitlements?.length || 0})
          </h4>
          {canApprove && (
            <AddEntitlementDialog familyId={family.id} addEntitlement={addEntitlement} />
          )}
        </div>
        
        {(!family.entitlements || family.entitlements.length === 0) ? (
          <div className="text-center py-6 bg-muted/30 rounded-md border border-dashed">
            <p className="text-xs text-muted-foreground">No entitlements assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {family.entitlements.map((e: any) => (
              <EntitlementItem key={e.id} entitlement={e} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RRWorkspace({ projectId }: { projectId: string }) {
  const { families, isLoading, error, refresh, createFamily, addEntitlement } = useRR(projectId);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Affected Families (R&R)</h3>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs">
              {families.length} {families.length === 1 ? 'family' : 'families'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canApproveProposals && (
            <CreateFamilyDialog projectId={projectId} createFamily={createFamily} />
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3 border-b"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
              <CardContent className="pt-4"><Skeleton className="h-12 w-full mb-2" /><Skeleton className="h-12 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : families.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground opacity-60" />
            </div>
            <div>
              <p className="font-medium text-base">No affected families recorded</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Register displaced or affected families to begin assigning their resettlement and rehabilitation entitlements.
              </p>
            </div>
            {canApproveProposals && (
              <div className="mt-2">
                <CreateFamilyDialog projectId={projectId} createFamily={createFamily} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {families.map((family, idx) => (
              <motion.div
                key={family.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <FamilyCard 
                  family={family} 
                  addEntitlement={addEntitlement} 
                  canApprove={canApproveProposals} 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}