'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, CheckCircle2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export default function ProjectCompensation({ projectId, projectStatus }: { projectId: string, projectStatus: string }) {
  const { canSubmitProposals } = useAuth();
  const [compensations, setCompensations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editValues, setEditValues] = useState<Record<string, { baseMarketValue: number, multiplicationFactor: number }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCompensations = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/compensations`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setCompensations(data);
        const initialEdits: any = {};
        data.forEach((c: any) => {
          if (c.status === 'draft') {
            initialEdits[c.parcelId] = {
              baseMarketValue: c.baseMarketValue || 0,
              multiplicationFactor: c.multiplicationFactor || 1.0
            };
          }
        });
        setEditValues(initialEdits);
      }
    } catch (err) {
      console.error('Failed to fetch compensations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompensations();
  }, [projectId]);



  const handleSaveCompensation = async (parcelId: string) => {
    const vals = editValues[parcelId];
    if (!vals) return;
    
    setError(null);
    setSavingId(parcelId);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/compensations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId,
          baseMarketValue: Number(vals.baseMarketValue),
          multiplicationFactor: Number(vals.multiplicationFactor)
        })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCompensations();
      } else {
        setError(data.error?.message || "Failed to save compensation.");
      }
    } catch (err) {
      setError("An unexpected error occurred while saving.");
    } finally {
      setSavingId(null);
    }
  };



  if (loading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-12 flex justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </CardContent>
      </Card>
    );
  }

  const isAwardDeclared = compensations.some(c => c.status === 'approved' && c.awardDocumentHash);

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="border-b border-border/50 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> 
            Compensation & Award Estimation
          </CardTitle>
          <CardDescription className="mt-1">
            Section 26-30 calculations (Market Value, Solatium, Multiplier) based on the RFCTLARR Act 2013.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium border-b border-destructive/20">
            {error}
          </div>
        )}
        {projectStatus !== 'award_declared' && !isAwardDeclared && (
          <div className="p-4 bg-amber-50 text-amber-800 text-sm font-medium border-b border-amber-200">
            Compensation values are editable until the project reaches the &quot;Award Declared&quot; stage. Award documents can be generated under the Documents tab.
          </div>
        )}
        {compensations.length === 0 ? (
          <div className="p-4 sm:p-5 text-center text-muted-foreground">
            No land parcels added to this project. Cannot calculate compensation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                <tr>
                  <th className="px-4 py-2 text-sm font-semibold">Parcel Owner</th>
                  <th className="px-4 py-2 text-sm font-semibold text-right">Base Value (₹)</th>
                  <th className="px-4 py-2 text-sm font-semibold text-right">Multiplier</th>
                  <th className="px-4 py-2 text-sm font-semibold text-right">Solatium (₹)</th>
                  <th className="px-4 py-2 text-sm font-semibold text-right text-primary">Total Award (₹)</th>
                  <th className="px-4 py-2 text-sm font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {compensations.map((comp) => (
                  <tr key={comp.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-4 py-2 text-sm font-medium">
                      {comp.parcel?.ownerName || 'Unknown'}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Area: {comp.parcel?.areaSqm || 0} sq.m
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {comp.status === 'draft' && !isAwardDeclared && canSubmitProposals ? (
                        <Input 
                          type="number" 
                          min={0}
                          value={editValues[comp.parcelId]?.baseMarketValue ?? comp.baseMarketValue} 
                          onChange={(e) => setEditValues({
                            ...editValues, 
                            [comp.parcelId]: { ...editValues[comp.parcelId], baseMarketValue: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-24 text-right h-8 ml-auto"
                        />
                      ) : (
                        comp.baseMarketValue.toLocaleString()
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-mono">
                      {comp.status === 'draft' && !isAwardDeclared && canSubmitProposals ? (
                        <Input 
                          type="number" 
                          min={1} max={2} step={0.1}
                          value={editValues[comp.parcelId]?.multiplicationFactor ?? comp.multiplicationFactor} 
                          onChange={(e) => setEditValues({
                            ...editValues, 
                            [comp.parcelId]: { ...editValues[comp.parcelId], multiplicationFactor: parseFloat(e.target.value) || 1 }
                          })}
                          className="w-16 text-right h-8 ml-auto"
                        />
                      ) : (
                        `${comp.multiplicationFactor.toFixed(1)}x`
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-muted-foreground">{comp.solatiumAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-primary">{comp.totalAwardAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-center flex flex-col gap-2 items-center">
                      {comp.status === 'draft' ? (
                        <>
                          <Badge variant="outline" className="text-xs">Draft Estimate</Badge>
                          {canSubmitProposals && !isAwardDeclared && (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="h-7 text-xs w-full"
                              onClick={() => handleSaveCompensation(comp.parcelId)}
                              disabled={savingId === comp.parcelId}
                            >
                              <Save className="h-3 w-3 mr-1" /> {savingId === comp.parcelId ? '...' : 'Save'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Badge variant="success" className="text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Declared
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

    </Card>
  );
}
