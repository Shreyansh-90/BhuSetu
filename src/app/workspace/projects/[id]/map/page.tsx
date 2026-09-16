"use client";

import { useEffect, useState, use, useCallback } from "react";
import { BhuSetuMap, Bounds } from "@/components/map/BhuSetuMap";
import { ProjectOverlay, ParcelOverlay, IntersectionOverlay } from "@/components/map/Overlays";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ProjectMapPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const [projectGeojson, setProjectGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [intersectionsGeojson, setIntersectionsGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [parcelsGeojson, setParcelsGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                    <CardHeader className="p-3 pb-1">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium">Survey {f.properties.surveyNumber || "N/A"}</CardTitle>
                        <Badge variant="outline" className="text-xs capitalize">{f.properties.parcelType}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-xs text-muted-foreground space-y-1">
                      {user?.role === 'viewer' ? (
                        <p className="text-foreground">Owner: {f.properties.ownerName || "Unknown"}</p>
                      ) : (
                        <p>Owner: {f.properties.ownerName || "Unknown"}</p>
                      )}
                      <p>Overlap Area: {f.properties.intersectionAreaSqm.toFixed(2)} sq.m</p>
                      {f.properties.overlapPercent && (
                        <p>Impact: {f.properties.overlapPercent.toFixed(1)}% of total parcel</p>
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
