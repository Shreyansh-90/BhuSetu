'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ProjectMapProps {
  projectGeometry?: Record<string, unknown> | null;
  parcelGeometries?: Record<string, unknown>[];
  height?: string;
}

export default function ProjectMap({ projectGeometry, parcelGeometries = [], height = '400px' }: ProjectMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [78.9629, 20.5937], // India center
      zoom: 4,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    m.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    m.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

    m.on('load', () => {
      setLoaded(true);
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Add project geometry layer when data arrives
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded || !projectGeometry) return;

    const sourceId = 'project-bounds';
    if (m.getSource(sourceId)) {
      (m.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(projectGeometry as unknown as GeoJSON.GeoJSON);
    } else {
      m.addSource(sourceId, {
        type: 'geojson',
        data: projectGeometry as unknown as GeoJSON.GeoJSON,
      });
      m.addLayer({
        id: 'project-bounds-fill',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2,
        },
      });
      m.addLayer({
        id: 'project-bounds-line',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
        },
      });
    }

    // Fit bounds to geometry
    try {
      const geom = projectGeometry as { type?: string; coordinates?: number[][][][] };
      if (geom.coordinates) {
        const bounds = new mapboxgl.LngLatBounds();
        const flatCoords = (geom.type === 'Polygon')
          ? geom.coordinates![0]
          : (geom.type === 'MultiPolygon')
            ? geom.coordinates![0][0]
            : [];
        for (const coord of (flatCoords as unknown as number[][])) {
          bounds.extend([coord[0], coord[1]]);
        }
        if (!bounds.isEmpty()) {
          m.fitBounds(bounds, { padding: 60, maxZoom: 15 });
        }
      }
    } catch (err) {
      console.error('Failed to fit bounds', err);
    }
  }, [loaded, projectGeometry]);

  // Add parcel geometry layers when data arrives
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded || parcelGeometries.length === 0) return;

    const sourceId = 'parcel-bounds';
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: parcelGeometries as unknown as GeoJSON.Feature[],
    };

    if (m.getSource(sourceId)) {
      (m.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(featureCollection);
    } else {
      m.addSource(sourceId, {
        type: 'geojson',
        data: featureCollection,
      });
      m.addLayer({
        id: 'parcel-bounds-fill',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.4,
        },
      });
      m.addLayer({
        id: 'parcel-bounds-line',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#d97706',
          'line-width': 1,
        },
      });
    }
  }, [loaded, parcelGeometries]);

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center bg-muted/20 text-muted-foreground border-2 border-dashed rounded-xl" style={{ height }}>
        <p className="font-medium">Mapbox access token is not configured.</p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="relative rounded-xl overflow-hidden border border-border/50"
      style={{ height, width: '100%' }}
    />
  );
}
