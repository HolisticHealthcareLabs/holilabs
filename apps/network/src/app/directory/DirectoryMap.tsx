'use client';

/**
 * Leaflet map component for the physician directory.
 * Loaded dynamically (no SSR) since Leaflet requires window.
 * Uses vanilla Leaflet loaded via CDN to avoid bundler complications.
 */

import { useEffect, useRef } from 'react';
import type { PhysicianResult } from './page';

interface Props {
  physicians: PhysicianResult[];
  selected: PhysicianResult | null;
  onSelect: (p: PhysicianResult) => void;
}

const DEFAULT_CENTER: [number, number] = [-20, -55];
const DEFAULT_ZOOM = 4;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMap = any;

export default function DirectoryMap({ physicians, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyMap>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const leafletReadyRef = useRef(false);

  // Inject Leaflet CSS once
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return;
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  // Inject Leaflet JS and init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    function initMap() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      leafletReadyRef.current = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      leafletReadyRef.current = false;
    };
  }, []);

  // Update markers when physicians change
  useEffect(() => {
    if (!mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    const newIds = new Set(physicians.map((p) => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    });

    physicians.forEach((p) => {
      if (!p.lat || !p.lng || markersRef.current.has(p.id)) return;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:${p.isInNetwork ? '#16a34a' : '#2563eb'};
          border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      const marker = L.marker([p.lat, p.lng], { icon })
        .addTo(mapRef.current)
        .bindTooltip(
          `<strong>${p.name}</strong><br/>${p.specialties[0]?.namePt ?? ''}<br/>${p.city ?? ''}`,
          { direction: 'top', offset: [0, -24] }
        );
      marker.on('click', () => onSelect(p));
      markersRef.current.set(p.id, marker);
    });
  }, [physicians, onSelect]);

  // Pan to selected
  useEffect(() => {
    if (selected?.lat && selected?.lng && mapRef.current) {
      mapRef.current.setView([selected.lat, selected.lng], 13, { animate: true });
    }
  }, [selected]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: '#e2e8f0' }}
    />
  );
}
