'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BhuSetuMap } from "@/components/map/BhuSetuMap";

export default function GlobalMapPage() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Map Overview</h1>
          <p className="text-muted-foreground max-w-2xl">
            Spatial view of all project boundaries, land parcels, and jurisdictions within your access scope.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Map Explorer</CardTitle>
          <CardDescription>
            Zoom in to view specific districts or project footprints. 
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <BhuSetuMap />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
