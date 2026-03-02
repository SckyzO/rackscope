import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { OfflineWorldMap } from '../../components/OfflineWorldMap';
import type { SiteMarker, MapStyle } from '../../components/OfflineWorldMap';
import { useAppConfigSafe } from '../../contexts/AppConfigContext';
import { registerWidget } from '../registry';
import type { DashboardData, WidgetProps } from '../types';

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
  const mapStyle = (localStorage.getItem('rackscope.map.style') ||
    config?.map?.style ||
    'minimal') as MapStyle;
  const geoSites = data.sites.filter((s) => s.location?.lat != null && s.location?.lon != null);

  const markers: SiteMarker[] = geoSites.map((s) => ({
    id: s.id,
    name: s.name,
    lat: (s.location as NonNullable<typeof s.location>).lat,
    lon: (s.location as NonNullable<typeof s.location>).lon,
    roomCount: s.rooms?.length ?? 0,
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Globe className="text-brand-500 h-4 w-4" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">World Map</p>
          {geoSites.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
              {geoSites.length} site{geoSites.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/views/worldmap')}
          className="text-brand-500 text-xs hover:underline"
        >
          Full map →
        </button>
      </div>

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

registerWidget({
  type: 'world-map',
  title: 'World Map',
  description: 'Mini map with site markers and health states',
  defaultW: 6,
  defaultH: 3,
  icon: Globe,
  group: 'Monitoring',
  component: WorldMapWidget,
});
