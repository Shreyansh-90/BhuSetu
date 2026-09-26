'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Users, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectRehabilitation({ projectId }: { projectId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    parcelId: '',
    familyHeadName: '',
    category: 'landowner',
    housingProvided: false,
    employmentProvided: false,
    annuityProvided: false,
    oneTimeAllowanceAmount: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRecords, resParcels] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/rehabilitation`),
        fetch(`/api/v1/projects/${projectId}/parcels`)
      ]);
      if (resRecords.ok) {
        const json = await resRecords.json();
        setRecords(json.data || []);
      }
      if (resParcels.ok) {
        const json = await resParcels.json();
        setParcels(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        oneTimeAllowanceAmount: formData.oneTimeAllowanceAmount ? Number(formData.oneTimeAllowanceAmount) : undefined
      };

      const res = await fetch(`/api/v1/projects/${projectId}/rehabilitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setOpen(false);
        setFormData({
          parcelId: '',
          familyHeadName: '',
          category: 'landowner',
          housingProvided: false,
          employmentProvided: false,
          annuityProvided: false,
          oneTimeAllowanceAmount: ''
        });
        await fetchData();
      } else {
        setError(data.error?.message || 'Failed to create record');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
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

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="border-b border-border/50 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" /> 
            Rehabilitation & Resettlement (R&R)
          </CardTitle>
          <CardDescription className="mt-1">
            Track R&R benefits for displaced landowners, tenants, and laborers per the RFCTLARR Act.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 shadow-sm">
            <Plus className="h-4 w-4" /> Add Record
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add R&R Beneficiary</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {error && <div className="text-sm text-destructive font-medium">{error}</div>}
              
              <div className="space-y-2">
                <Label>Affected Parcel</Label>
                <Select value={formData.parcelId || undefined} onValueChange={(val: string | null) => setFormData({...formData, parcelId: val || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parcel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parcels.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.ownerName || 'Unknown Owner'} (Area: {p.areaSqm} sqm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Family Head Name</Label>
                <Input 
                  required
                  value={formData.familyHeadName}
                  onChange={(e) => setFormData({...formData, familyHeadName: e.target.value})}
                  placeholder="Enter name"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category || undefined} onValueChange={(val: string | null) => setFormData({...formData, category: val || ''})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landowner">Landowner</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="laborer">Laborer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entitlements</Label>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="housing" className="h-4 w-4" checked={formData.housingProvided} onChange={(e) => setFormData({...formData, housingProvided: e.target.checked})} />
                    <label htmlFor="housing" className="text-sm font-medium leading-none cursor-pointer">Housing Provided</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="employment" className="h-4 w-4" checked={formData.employmentProvided} onChange={(e) => setFormData({...formData, employmentProvided: e.target.checked})} />
                    <label htmlFor="employment" className="text-sm font-medium leading-none cursor-pointer">Employment Provided</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="annuity" className="h-4 w-4" checked={formData.annuityProvided} onChange={(e) => setFormData({...formData, annuityProvided: e.target.checked})} />
                    <label htmlFor="annuity" className="text-sm font-medium leading-none cursor-pointer">Annuity Provided</label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>One-Time Allowance (₹)</Label>
                <Input 
                  type="number"
                  min="0"
                  value={formData.oneTimeAllowanceAmount}
                  onChange={(e) => setFormData({...formData, oneTimeAllowanceAmount: e.target.value})}
                  placeholder="e.g. 500000"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Record'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Users className="h-10 w-10 opacity-20" />
            <p>No R&R records found for this project.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Family Head</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold text-center">Housing</th>
                  <th className="px-6 py-4 font-semibold text-center">Employment / Annuity</th>
                  <th className="px-6 py-4 font-semibold text-right">Allowance (₹)</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{record.familyHeadName}</td>
                    <td className="px-6 py-4 capitalize">{record.category}</td>
                    <td className="px-6 py-4 text-center">
                      {record.housingProvided ? (
                        <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(record.employmentProvided || record.annuityProvided) ? (
                        <Badge variant="outline" className="text-xs bg-muted/30">Provided</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {record.oneTimeAllowanceAmount ? `${record.oneTimeAllowanceAmount}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={record.status === 'disbursed' ? 'success' : 'outline'} className="capitalize text-xs">
                        {record.status}
                      </Badge>
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
