'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Save, CheckCircle2, AlertCircle, UploadCloud, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import ProjectMap from '@/components/gis/ProjectMap';

export default function ProjectParcels({ 
  projectId, 
  projectStatus,
  spatialData,
  spatialLoading
}: { 
  projectId: string; 
  projectStatus?: string;
  spatialData?: any;
  spatialLoading?: boolean;
}) {
  const { canSubmitProposals } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUlpin, setEditingUlpin] = useState<string | null>(null);
  const [ulpinValue, setUlpinValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [geoJsonInput, setGeoJsonInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchParcels = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/parcels`);
      if (res.ok) {
        const json = await res.json();
        setParcels(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch parcels', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, [projectId]);

  const handleSaveUlpin = async (parcelId: string) => {
    setError(null);
    setSaving(true);
    
    // Validate client-side
    if (ulpinValue && !/^[A-Z0-9]{14}$/.test(ulpinValue)) {
      setError("ULPIN must be exactly 14 alphanumeric characters.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/parcels/${parcelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ulpin: ulpinValue || null }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setEditingUlpin(null);
        await fetchParcels();
      } else if (data.queued) {
        setEditingUlpin(null);
        // Do not fetch parcels immediately since it's queued
      } else {
        setError(data.error?.message || data.message || "Failed to update ULPIN.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadGeoJson = async () => {
    setUploadError(null);
    setUploading(true);
    try {
      const parsed = JSON.parse(geoJsonInput);
      if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
        throw new Error('Must be a valid GeoJSON FeatureCollection');
      }

      const payload = {
        projectGeoJson: null, // To be calculated or provided separately; we'll leave null and let PostGIS or frontend skip it, but let's just make a bounding polygon from the parcels for simplicity. Wait, ST_Union is better done server-side. For now, we will pass a bounding box or skip it.
        parcels: parsed.features.map((f: any) => ({
          ulpin: f.properties?.ulpin || null,
          surveyNumber: f.properties?.surveyNumber || f.properties?.survey_number || null,
          ownerName: f.properties?.ownerName || f.properties?.owner_name || 'Unknown',
          village: f.properties?.village || null,
          tehsil: f.properties?.tehsil || null,
          areaSqm: f.properties?.areaSqm || f.properties?.area_sqm || 100,
          geoJson: f.geometry
        }))
      };

      // Create a dummy project MultiPolygon wrapping all parcels (hack for demo)
      if (parsed.features.length > 0) {
        payload.projectGeoJson = {
          type: "MultiPolygon",
          coordinates: parsed.features.map((f: any) => f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates[0])
        } as any;
      }

      const res = await fetch(`/api/v1/projects/${projectId}/spatial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setUploadOpen(false);
        setGeoJsonInput('');
        await fetchParcels();
        window.location.reload();
      } else if (data.queued) {
        setUploadOpen(false);
        setGeoJsonInput('');
        // Alert handled by offline UI
      } else {
        setUploadError(data.error?.message || data.message || 'Failed to process GeoJSON');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Invalid GeoJSON format');
    } finally {
      setUploading(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* LEFT COLUMN: Map View */}
      <div className="flex flex-col gap-4">
        <Card className="shadow-sm border-border/50 flex-1 flex flex-col overflow-hidden relative">
          {isOffline && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-white text-xs px-3 py-1 rounded-full flex items-center shadow-md font-semibold tracking-wide">
              <WifiOff className="h-3 w-3 mr-1.5" /> Offline Mode
            </div>
          )}
          <CardHeader className="border-b border-border/50 py-4 bg-muted/10">
            <CardTitle className="text-lg">Geospatial Interface</CardTitle>
            <CardDescription>Live map of affected land boundaries.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative min-h-[500px]">
            {spatialLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 gap-4">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Loading geospatial data...</span>
              </div>
            ) : (
              <ProjectMap 
                projectGeometry={spatialData?.projectGeometry}
                parcelGeometries={spatialData?.parcelGeometries || []}
                height="100%"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Parcel Data */}
      <div className="flex flex-col gap-4">
        <Card className="shadow-sm border-border/50 flex-1 flex flex-col">
          <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between py-4 bg-muted/10">
            <div>
              <CardTitle className="text-lg">Land Parcels & Bhu-Aadhaar</CardTitle>
              <CardDescription>Manage ULPIN linkages.</CardDescription>
            </div>
        {projectStatus === 'draft' && canSubmitProposals && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
              <UploadCloud className="h-4 w-4 mr-1" />
              Upload Cadastral GeoJSON
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Spatial Data</DialogTitle>
                <DialogDescription>
                  Paste a valid GeoJSON FeatureCollection containing the cadastral boundaries of the affected land parcels.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {uploadError && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">{uploadError}</div>}
                <Textarea 
                  placeholder='{"type": "FeatureCollection", "features": [...]}'
                  className="font-mono text-xs h-64"
                  value={geoJsonInput}
                  onChange={(e) => setGeoJsonInput(e.target.value)}
                />
                <Button onClick={handleUploadGeoJson} disabled={uploading || !geoJsonInput} className="w-full">
                  {uploading ? 'Processing...' : 'Sync to PostGIS'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {parcels.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No parcels added to this project yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Survey / Khata No.</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Owner</th>
                  <th className="px-6 py-4 font-semibold text-right">Area (sq.m)</th>
                  <th className="px-6 py-4 font-semibold">ULPIN / Bhu-Aadhaar</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {parcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{parcel.surveyNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {parcel.village}, {parcel.tehsil}
                      </div>
                    </td>
                    <td className="px-6 py-4">{parcel.ownerName || 'Unknown'}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      {parcel.areaSqm ? parcel.areaSqm.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {editingUlpin === parcel.id ? (
                        <div className="flex flex-col gap-1">
                          <Input 
                            value={ulpinValue} 
                            onChange={(e) => setUlpinValue(e.target.value.toUpperCase())}
                            placeholder="14-digit ULPIN"
                            className={`w-40 font-mono text-sm ${error ? 'border-destructive' : ''}`}
                            maxLength={14}
                            disabled={saving}
                          />
                          {error && <span className="text-[10px] text-destructive">{error}</span>}
                        </div>
                      ) : (
                        parcel.ulpin ? (
                          <div className="flex items-center gap-1.5 text-success font-mono font-semibold tracking-wider">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {parcel.ulpin}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground italic text-xs">
                            <AlertCircle className="h-3 w-3" /> Missing ULPIN
                          </div>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingUlpin === parcel.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingUlpin(null); setError(null); }} disabled={saving}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSaveUlpin(parcel.id)} disabled={saving} className="bg-success hover:bg-success/90 text-white">
                            <Save className="h-4 w-4 mr-1.5" /> Save
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setEditingUlpin(parcel.id); setUlpinValue(parcel.ulpin || ''); }}
                        >
                          {parcel.ulpin ? 'Edit ULPIN' : 'Link ULPIN'}
                        </Button>
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
      </div>
    </div>
  );
}
