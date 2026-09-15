"use client";

import React from "react";
import { Source, Layer } from "react-map-gl/mapbox";
import type { FillLayer, LineLayer } from "mapbox-gl";

// ---------------------------------------------------------------------------
// 1. Project Overlay (Blue)
// ---------------------------------------------------------------------------

interface ProjectOverlayProps {
  geojson: GeoJSON.FeatureCollection | null;
}

export function ProjectOverlay({ geojson }: ProjectOverlayProps) {
  if (!geojson || geojson.features.length === 0) return null;

  const fillStyle = {
    id: "project-fill",
    type: "fill",
    paint: {
      "fill-color": "#1a73e8", // Blue
      "fill-opacity": 0.15
    }
  } as FillLayer;

  const lineStyle = {
    id: "project-outline",
    type: "line",
    paint: {
      "line-color": "#1a73e8",
      "line-width": 3
    }
  } as LineLayer;

  return (
    <Source id="project-data" type="geojson" data={geojson}>
      <Layer {...fillStyle} />
      <Layer {...lineStyle} />
    </Source>
  );
}

// ---------------------------------------------------------------------------
// 2. Parcel Overlay (Green)
// ---------------------------------------------------------------------------

interface ParcelOverlayProps {
  geojson: GeoJSON.FeatureCollection | null;
}

export function ParcelOverlay({ geojson }: ParcelOverlayProps) {
  if (!geojson || geojson.features.length === 0) return null;

  const fillStyle = {
    id: "parcel-fill",
    type: "fill",
    paint: {
      "fill-color": "#34a853", // Green
      "fill-opacity": 0.2
    }
  } as FillLayer;

  const lineStyle = {
    id: "parcel-outline",
    type: "line",
    paint: {
      "line-color": "#34a853",
      "line-width": 1.5
    }
  } as LineLayer;

  return (
    <Source id="parcel-data" type="geojson" data={geojson}>
      <Layer {...fillStyle} />
      <Layer {...lineStyle} />
    </Source>
  );
}

// ---------------------------------------------------------------------------
// 3. Intersection Overlay (Red/Amber)
// ---------------------------------------------------------------------------

interface IntersectionOverlayProps {
  geojson: GeoJSON.FeatureCollection | null;
}

export function IntersectionOverlay({ geojson }: IntersectionOverlayProps) {
  if (!geojson || geojson.features.length === 0) return null;

  const fillStyle = {
    id: "intersection-fill",
    type: "fill",
    paint: {
      "fill-color": "#ea4335", // Red
      "fill-opacity": 0.4
    }
  } as FillLayer;

  const lineStyle = {
    id: "intersection-outline",
    type: "line",
    paint: {
      "line-color": "#ea4335",
      "line-width": 2
    }
  } as LineLayer;

  return (
    <Source id="intersection-data" type="geojson" data={geojson}>
      <Layer {...fillStyle} />
      <Layer {...lineStyle} />
    </Source>
  );
}
