/**
 * OfflineWorldMap — SVG world map with zero external dependencies.
 *
 * Uses react-simple-maps (D3 projection) + world-atlas (bundled TopoJSON).
 * Fully offline — no tile server, no CDN, no internet required.
 *
 * Available styles (mapStyle prop):
 *   'minimal'  — subtle country fills, muted borders (default, dark/light auto)
 *   'noc'      — dark bg, glowing teal outlines — ideal for NOC wallboards
 *   'flat'     — solid gray fill, crisp borders
 */

import { useState, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Plus, Minus } from 'lucide-react';
// Bundled TopoJSON — no network request, works fully offline
// @ts-expect-error — world-atlas ships plain JSON, no typings needed
import worldAtlas from 'world-atlas/countries-110m.json';

export type MapStyle = 'minimal' | 'noc' | 'flat';

export interface SiteMarker {
  id: string;
  name: string;
  lat: number;
  lon: number;
  roomCount?: number;
}

interface OfflineWorldMapProps {
  sites?: SiteMarker[];
  isDark?: boolean;
  mapStyle?: MapStyle;
  /** Initial zoom level (1 = world view, higher = more zoomed in) */
  initialZoom?: number;
  /** Initial center [lon, lat] */
  initialCenter?: [number, number];
  /** Whether to show the +/− zoom buttons */
  zoomControl?: boolean;
  /** Called when a site marker is clicked */
  onSiteClick?: (site: SiteMarker) => void;
  className?: string;
}

// ── Style presets ─────────────────────────────────────────────────────────────

interface StylePreset {
  fill: string;
  stroke: string;
  strokeWidth: number;
  hover: string;
  markerFill: string;
  markerStroke: string;
  markerPulse: string;
  zoomBtnBg: string;
  zoomBtnText: string;
}

const STYLES: Record<MapStyle, { dark: StylePreset; light: StylePreset }> = {
  minimal: {
    dark: {
      fill: '#374151',
      stroke: '#4B5563',
      strokeWidth: 0.4,
      hover: '#4B5563',
      markerFill: '#465fff',
      markerStroke: '#3641f5',
      markerPulse: 'rgba(70,95,255,0.2)',
      zoomBtnBg: 'bg-gray-800 hover:bg-gray-700',
      zoomBtnText: 'text-gray-200',
    },
    light: {
      fill: '#E5E7EB',
      stroke: '#D1D5DB',
      strokeWidth: 0.4,
      hover: '#D1D5DB',
      markerFill: '#465fff',
      markerStroke: '#3641f5',
      markerPulse: 'rgba(70,95,255,0.15)',
      zoomBtnBg: 'bg-white hover:bg-gray-50 shadow',
      zoomBtnText: 'text-gray-700',
    },
  },
  noc: {
    dark: {
      fill: '#0f172a',
      stroke: '#0ea5e9',
      strokeWidth: 0.5,
      hover: '#1e293b',
      markerFill: '#22d3ee',
      markerStroke: '#06b6d4',
      markerPulse: 'rgba(34,211,238,0.2)',
      zoomBtnBg: 'bg-slate-800 hover:bg-slate-700',
      zoomBtnText: 'text-cyan-400',
    },
    light: {
      fill: '#dbeafe',
      stroke: '#3b82f6',
      strokeWidth: 0.5,
      hover: '#bfdbfe',
      markerFill: '#2563eb',
      markerStroke: '#1d4ed8',
      markerPulse: 'rgba(37,99,235,0.15)',
      zoomBtnBg: 'bg-white hover:bg-blue-50 shadow',
      zoomBtnText: 'text-blue-700',
    },
  },
  flat: {
    dark: {
      fill: '#1F2937',
      stroke: '#6B7280',
      strokeWidth: 0.5,
      hover: '#374151',
      markerFill: '#465fff',
      markerStroke: '#3641f5',
      markerPulse: 'rgba(70,95,255,0.2)',
      zoomBtnBg: 'bg-gray-800 hover:bg-gray-700',
      zoomBtnText: 'text-gray-200',
    },
    light: {
      fill: '#F3F4F6',
      stroke: '#9CA3AF',
      strokeWidth: 0.5,
      hover: '#E5E7EB',
      markerFill: '#465fff',
      markerStroke: '#3641f5',
      markerPulse: 'rgba(70,95,255,0.15)',
      zoomBtnBg: 'bg-white hover:bg-gray-50 shadow',
      zoomBtnText: 'text-gray-700',
    },
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export const OfflineWorldMap = ({
  sites = [],
  isDark = true,
  mapStyle = 'minimal',
  initialZoom = 1,
  initialCenter = [10, 20],
  zoomControl = true,
  onSiteClick,
  className = '',
}: OfflineWorldMapProps) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [center, setCenter] = useState<[number, number]>(initialCenter);

  const theme = isDark ? STYLES[mapStyle].dark : STYLES[mapStyle].light;

  const handleMoveEnd = useCallback(
    ({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
      setZoom(z);
      setCenter(coordinates);
    },
    []
  );

  const zoomIn = () => setZoom((z) => Math.min(z * 2, 32));
  const zoomOut = () => setZoom((z) => Math.max(z / 2, 1));

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <ComposableMap projection="geoMercator" style={{ width: '100%', height: '100%' }}>
        <ZoomableGroup
          center={center}
          zoom={zoom}
          maxZoom={32}
          minZoom={1}
          onMoveEnd={handleMoveEnd}
        >
          <Geographies geography={worldAtlas}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={theme.fill}
                  stroke={theme.stroke}
                  strokeWidth={theme.strokeWidth}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: theme.hover, outline: 'none', cursor: 'default' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {sites.map((site) => (
            <Marker
              key={site.id}
              coordinates={[site.lon, site.lat]}
              onClick={() => onSiteClick?.(site)}
            >
              {/* Pulse ring */}
              <circle r={10} fill={theme.markerPulse} stroke="none" />
              {/* Core dot */}
              <circle
                r={5}
                fill={theme.markerFill}
                stroke={theme.markerStroke}
                strokeWidth={1.5}
                style={{ cursor: onSiteClick ? 'pointer' : 'default' }}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom controls */}
      {zoomControl && (
        <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1">
          <button
            onClick={zoomIn}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold transition-colors ${theme.zoomBtnBg} ${theme.zoomBtnText}`}
            title="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={zoomOut}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold transition-colors ${theme.zoomBtnBg} ${theme.zoomBtnText}`}
            title="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
