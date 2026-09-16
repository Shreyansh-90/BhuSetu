"use client";

import { useEffect, useState, use, useCallback } from "react";
import { BhuSetuMap, Bounds } from "@/components/map/BhuSetuMap";
import { ProjectOverlay, ParcelOverlay, IntersectionOverlay } from "@/components/map/Overlays";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function ProjectMapPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const [projectGeojson, setProjectGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [intersectionsGeojson, setIntersectionsGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [parcelsGeojson, setParcelsGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAwards = async () => {
    if (!confirm("Are you sure you want to generate draft awards for all affected parcels?")) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/v1/projects/${resolvedParams.id}/awards/generate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to generate awards");
      alert(data.data.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load project geometry and intersections once on mount
  useEffect(() => {
    async function fetchStaticLayers() {
      try {
        // 1. Fetch Project Geometry
        const projRes = await fetch(`/api/v1/projects/${resolvedParams.id}/geometry`);
        if (projRes.ok) {
          const json = await projRes.json();
          // The API returns a single Feature, we wrap it in a FeatureCollection
          setProjectGeojson({ type: "FeatureCollection", features: [json.data] });
        } else {
          const err = await projRes.json();
          if (err.error?.code === "NOT_FOUND") {
            // No active geometry, that's fine.
          } else {
            setError(err.error?.message || "Failed to load project geometry");
          }
        }

        // 2. Fetch Intersections
        const intRes = await fetch(`/api/v1/map/projects/${resolvedParams.id}/intersections`);
        if (intRes.ok) {
          const json = await intRes.json();
          setIntersectionsGeojson(json.data);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load map data");
      }
    }
    fetchStaticLayers();
  }, [resolvedParams.id]);

  // Load parcels dynamically based on bounding box
  const handleBoundsChanged = useCallback(async (bounds: Bounds) => {
    // Only fetch if zoomed in enough (e.g. zoom > 12) to avoid massive queries
    if (bounds.zoom < 12) {
      setParcelsGeojson(null);
      return;
    }

    try {
      const bboxStr = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
      const res = await fetch(`/api/v1/map/parcels?bbox=${bboxStr}&zoom=${Math.round(bounds.zoom)}`);
      if (res.ok) {
        const json = await res.json();
        setParcelsGeojson(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch parcels", e);
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-4 p-4 border-b bg-background shrink-0">
        <Link href={`/workspace/projects/${resolvedParams.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Spatial Analysis</h1>
          <p className="text-sm text-muted-foreground">Interactive Map View</p>
        </div>
      </div>

      <div className="flex-1 relative flex">
        <div className="flex-1 relative">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-destructive p-8 text-center">
              {error}
            </div>
          ) : (
            <BhuSetuMap onBoundsChanged={handleBoundsChanged}>
              <ProjectOverlay geojson={projectGeojson} />
              <ParcelOverlay geojson={parcelsGeojson} />
              <IntersectionOverlay geojson={intersectionsGeojson} />
            </BhuSetuMap>
          )}
        </div>

        {/* Floating Legend / Info Panel */}
        <div className="w-80 bg-background border-l shadow-xl p-4 overflow-y-auto z-10 flex flex-col gap-6">
          {/* Summary Card */}
          {intersectionsGeojson && intersectionsGeojson.features.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div>
                <h3 className="text-sm font-medium text-primary">Total Estimated Cost</h3>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                    intersectionsGeojson.features.reduce((acc: number, f: any) => acc + (f.properties.estimatedCompensation || 0), 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                  <span>{intersectionsGeojson.features.length} Affected Parcels</span>
                  <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded text-primary">Includes 100% Solatium</span>
                </p>
              </div>
              
              {user?.role === 'project_manager' || user?.role === 'admin' ? (
                <Button 
                  className="w-full" 
                  onClick={handleGenerateAwards} 
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isGenerating ? 'Generating...' : 'Generate Official Awards'}
                </Button>
              ) : null}
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-100 opacity-80" />
                <span>Project Boundary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-green-600 bg-green-100 opacity-80" />
                <span>Parcels (Zoom in to load)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-red-600 bg-red-100 opacity-80" />
                <span>Intersections / Impacted</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Intersection Details</h3>
            {intersectionsGeojson?.features.length ? (
              <div className="space-y-2">
                {intersectionsGeojson.features.map((f: any) => (
                  <Card key={f.properties.parcelId} className="shadow-sm">
                    <CardHeader className="p-3 pb-1 border-b">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium leading-none">Survey {f.properties.surveyNumber || "N/A"}</CardTitle>
                        <Badge variant="outline" className="text-xs capitalize h-5">{f.properties.parcelType || 'Unknown'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 text-xs text-muted-foreground space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{f.properties.ownerName || "Unknown Owner"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider">Overlap</p>
                          <p className="font-medium text-foreground">{f.properties.intersectionAreaSqm.toFixed(1)} sq.m</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider">Impact</p>
                          <p className="font-medium text-foreground">{f.properties.overlapPercent ? `${f.properties.overlapPercent.toFixed(1)}%` : 'N/A'}</p>
                        </div>
                      </div>
                      
                      {f.properties.estimatedCompensation && (
                        <div className="pt-2 border-t mt-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span>Base ({f.properties.ratePerSqm}/sqm)</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(f.properties.baseCompensation)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span>Solatium (100%)</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(f.properties.solatium)}</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold text-sm text-primary mt-1">
                            <span>Total</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(f.properties.estimatedCompensation)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No intersections found or loaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
