"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Map, { MapRef, NavigationControl, FullscreenControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

interface BhuSetuMapProps {
  children?: React.ReactNode;
  onBoundsChanged?: (bounds: Bounds) => void;
  onClick?: (e: mapboxgl.MapLayerMouseEvent) => void;
  interactiveLayerIds?: string[];
  cursor?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function BhuSetuMap({ 
  children, 
  onBoundsChanged, 
  onClick, 
  interactiveLayerIds,
  cursor,
  onMouseEnter,
  onMouseLeave
}: BhuSetuMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const mapRef = useRef<MapRef>(null);

  // Default viewport centered roughly on India
  const [viewState, setViewState] = useState({
    longitude: 78.9629,
    latitude: 22.5937,
    zoom: 4,
  });

  const handleMoveEnd = useCallback(() => {
    if (onBoundsChanged && mapRef.current) {
      const bounds = mapRef.current.getBounds();
      const zoom = mapRef.current.getZoom();
      if (bounds) {
        onBoundsChanged({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          zoom,
        });
      }
    }
  }, [onBoundsChanged]);

  // Initial load trigger
  useEffect(() => {
    if (mapRef.current && onBoundsChanged) {
      handleMoveEnd();
    }
  }, [mapRef.current, handleMoveEnd]);

  if (!mapboxToken) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-muted rounded-lg border text-muted-foreground">
        Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full rounded-lg overflow-hidden border">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onMoveEnd={handleMoveEnd}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        interactiveLayerIds={interactiveLayerIds}
        cursor={cursor}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        {children}
      </Map>
    </div>
  );
}
