import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { OfflineWorldMap } from '@app/components/OfflineWorldMap';
import type { SiteMarker, MapStyle } from '@app/components/OfflineWorldMap';
import { useAppConfigSafe } from '@app/contexts/AppConfigContext';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData, WidgetProps } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'world-map',
  title: 'World Map',
  description: 'Mini map with site markers and health states',
  group: 'Monitoring',
  icon: Globe,
  defaultW: 6,
  defaultH: 3,
  minW: 2,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const WorldMapWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: WidgetProps['navigate'];
}) => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { config } = useAppConfigSafe();

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // localStorage overrides the backend config so the user's map-style preference
  // survives page reloads without a round-trip to the API (same as WorldMapPage).
  const mapStyle = (localStorage.getItem('rackscope.map.style') ??
    config?.map?.style ??
    'minimal') as MapStyle;
  const geoSites = data.sites.filter((s) => s.location?.lat != null && s.location?.lon != null);

  const markers: SiteMarker[] = geoSites.map((s) => ({
    id: s.id,
    name: s.name,
    lat: (s.location!).lat,
    lon: (s.location!).lon,
    roomCount: s.rooms?.length ?? 0,
  }));

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* "Full map" link as floating overlay */}
      <button
        onClick={() => navigate('/views/worldmap')}
        className="text-brand-500 absolute top-2 right-2 z-10 rounded-lg bg-white/80 px-2 py-1 text-xs backdrop-blur-sm hover:underline dark:bg-gray-900/80"
      >
        Full map →
      </button>

      <div className="min-h-0 flex-1">
        {geoSites.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-gray-400">
            <Globe className="h-6 w-6 text-gray-200 dark:text-gray-700" />
            No sites with coordinates
          </div>
        ) : (
          <OfflineWorldMap
            sites={markers}
            isDark={isDark}
            mapStyle={mapStyle}
            initialCenter={[10, 20]}
            initialZoom={1}
            zoomControl
            onSiteClick={() => navigate('/views/worldmap')}
          />
        )}
      </div>
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: WorldMapWidget });
