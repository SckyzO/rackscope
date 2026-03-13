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
// @ts-expect-error — react-simple-maps ships no TypeScript declaration file
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Plus, Minus } from 'lucide-react';
// Bundled TopoJSON — no network request, works fully offline
import worldAtlas from 'world-atlas/countries-110m.json';

export type MapStyle = 'minimal' | 'noc' | 'flat' | 'retro' | 'midnight';

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
  /** Called on marker hover — null when mouse leaves */
  onSiteHover?: (site: SiteMarker | null, mousePos?: { x: number; y: number }) => void;
  className?: string;
}

// ── Style presets ─────────────────────────────────────────────────────────────

interface StylePreset {
  fill: string;
  stroke: string;
  strokeWidth: number;
  hover: string;
  background?: string;
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
  // retro — warm parchment / vintage cartography
  retro: {
    dark: {
      fill: '#2a2218',
      stroke: '#4a3b2a',
      strokeWidth: 0.6,
      hover: '#3d3020',
      background: '#1a1510',
      markerFill: '#d97706',
      markerStroke: '#b45309',
      markerPulse: 'rgba(217,119,6,0.22)',
      zoomBtnBg: 'bg-yellow-900/60 hover:bg-yellow-800/80',
      zoomBtnText: 'text-yellow-300',
    },
    light: {
      fill: '#e8dcc8',
      stroke: '#b8a080',
      strokeWidth: 0.6,
      hover: '#ddd0b4',
      background: '#f5eed8',
      markerFill: '#b45309',
      markerStroke: '#92400e',
      markerPulse: 'rgba(180,83,9,0.2)',
      zoomBtnBg: 'bg-amber-100 hover:bg-amber-200',
      zoomBtnText: 'text-amber-800',
    },
  },
  // midnight — near-black, ultra-minimal
  midnight: {
    dark: {
      fill: '#0d0d12',
      stroke: '#1e1e2a',
      strokeWidth: 0.5,
      hover: '#16161f',
      background: '#06060a',
      markerFill: '#818cf8',
      markerStroke: '#6366f1',
      markerPulse: 'rgba(129,140,248,0.22)',
      zoomBtnBg: 'bg-indigo-950/70 hover:bg-indigo-900/80',
      zoomBtnText: 'text-indigo-300',
    },
    light: {
      fill: '#e2e2e8',
      stroke: '#b0b0c0',
      strokeWidth: 0.5,
      hover: '#d5d5e2',
      background: '#f0f0f5',
      markerFill: '#4f46e5',
      markerStroke: '#4338ca',
      markerPulse: 'rgba(79,70,229,0.18)',
      zoomBtnBg: 'bg-indigo-100 hover:bg-indigo-200',
      zoomBtnText: 'text-indigo-700',
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
  onSiteHover,
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
            {({ geographies }: { geographies: { rsmKey: string }[] }) =>
              geographies.map((geo: { rsmKey: string }) => (
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
              onMouseEnter={(e: React.MouseEvent) =>
                onSiteHover?.(site, { x: e.clientX, y: e.clientY })
              }
              onMouseMove={(e: React.MouseEvent) =>
                onSiteHover?.(site, { x: e.clientX, y: e.clientY })
              }
              onMouseLeave={() => onSiteHover?.(null)}
            >
              {/* Large semi-transparent ring creates the pulse halo effect */}
              <circle r={10} fill={theme.markerPulse} stroke="none" />
              <circle
                r={5}
                fill={theme.markerFill}
                stroke={theme.markerStroke}
                strokeWidth={1.5}
                style={{ cursor: onSiteClick || onSiteHover ? 'pointer' : 'default' }}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

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
