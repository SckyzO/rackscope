import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import { api } from '../../../services/api';
import type { Site } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useAppConfigSafe } from '../../contexts/AppConfigContext';
import { OfflineWorldMap } from '../../components/OfflineWorldMap';
import type { SiteMarker } from '../../components/OfflineWorldMap';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  EmptyState,
  ClickableRow,
} from '../templates/EmptyPage';

export const WorldMapPage = () => {
  usePageTitle('World Map');
  const navigate = useNavigate();
  const { config } = useAppConfigSafe();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // MutationObserver on <html> class is used instead of a context subscription because
  // the map component needs a boolean prop, not a CSS variable, to swap tile sets.
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const mapCenterLat = Number(config?.map?.center?.lat ?? 20);
  const mapCenterLon = Number(config?.map?.center?.lon ?? 0);
  const mapDefaultZoom = Number(config?.map?.default_zoom ?? 1);
  const mapZoomControl = config?.map?.zoom_controls ?? true;
  // localStorage overrides the backend config so the map style preference survives
  // page reloads without a round-trip to the API.
  const mapStyle = (localStorage.getItem('rackscope.map.style') ||
    config?.map?.style ||
    'minimal') as 'minimal' | 'noc' | 'flat';

  useEffect(() => {
    api
      .getSites()
      .then((data) => {
        setSites(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const geoSites = sites.filter((s) => s.location?.lat && s.location?.lon);
  const totalRooms = sites.reduce((acc, s) => acc + (s.rooms?.length ?? 0), 0);

  const markers: SiteMarker[] = geoSites.map((s) => ({
    id: s.id,
    name: s.name,
    lat: (s.location as NonNullable<typeof s.location>).lat,
    lon: (s.location as NonNullable<typeof s.location>).lon,
    roomCount: s.rooms?.length ?? 0,
  }));

  const handleSiteClick = (marker: SiteMarker) => {
    const site = sites.find((s) => s.id === marker.id) ?? null;
    setSelectedSite(site);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="World Map"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Monitoring', href: '/views/worldmap' },
              { label: 'World Map' },
            ]}
          />
        }
        actions={
          <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="bg-brand-500 h-1.5 w-1.5 animate-pulse rounded-full" />
            Live
          </span>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sites', value: sites.length },
          { label: 'With location', value: geoSites.length },
          { label: 'Rooms', value: totalRooms },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 dark:border-gray-800"
        style={{ height: 500 }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
            <LoadingState message="Loading map data…" />
          </div>
        ) : (
          // OfflineWorldMap uses locally bundled SVG tiles — no CDN dependency.
          // This is intentional: NOC environments are often air-gapped or firewall-restricted.
          // The key forces a full remount when center, zoom, or style changes because
          // the underlying Leaflet instance cannot be reconfigured once initialised.
          <OfflineWorldMap
            key={`${mapCenterLat}-${mapCenterLon}-${mapDefaultZoom}-${mapStyle}`}
            sites={markers}
            isDark={isDark}
            mapStyle={mapStyle}
            initialCenter={[mapCenterLon, mapCenterLat]}
            initialZoom={mapDefaultZoom}
            zoomControl={mapZoomControl}
            onSiteClick={handleSiteClick}
            className="h-full w-full"
          />
        )}
      </div>

      {selectedSite && (
        <div className="border-brand-200 bg-brand-50 dark:border-brand-700/40 dark:bg-brand-500/10 rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{selectedSite.name}</p>
              {selectedSite.description && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {selectedSite.description}
                </p>
              )}
              {selectedSite.location?.address && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {selectedSite.location.address}
                </div>
              )}
              {selectedSite.rooms && selectedSite.rooms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSite.rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => navigate(`/views/room/${room.id}`)}
                      className="border-brand-200 text-brand-600 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-400 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedSite(null)}
              className="shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <SectionCard
        title="All Sites"
        desc={`${sites.length} site${sites.length !== 1 ? 's' : ''} configured`}
      >
        {loading ? (
          <LoadingState />
        ) : sites.length === 0 ? (
          <EmptyState
            title="No sites configured"
            description="Add sites with geolocation coordinates to see them on the map."
          />
        ) : (
          <div className="-mx-1 divide-y divide-gray-100 dark:divide-gray-800">
            {sites.map((site) => (
              <ClickableRow
                key={site.id}
                icon={Building2}
                title={site.name}
                subtitle={[
                  `${site.rooms?.length ?? 0} room${(site.rooms?.length ?? 0) !== 1 ? 's' : ''}`,
                  site.location?.address,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onClick={() => {
                  const firstRoom = site.rooms?.[0];
                  if (firstRoom) navigate(`/views/room/${firstRoom.id}`);
                }}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};
