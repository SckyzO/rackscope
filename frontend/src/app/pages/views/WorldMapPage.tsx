import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  LayoutTemplate,
  Columns2,
  ChevronRight,
  AlertTriangle,
  XCircle,
  Server,
  DoorOpen,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Site, ActiveAlert } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useAppConfigSafe } from '../../contexts/AppConfigContext';
import { OfflineWorldMap } from '../../components/OfflineWorldMap';
import type { SiteMarker } from '../../components/OfflineWorldMap';
import { PageHeader, PageBreadcrumb, LoadingState, EmptyState } from '../templates/EmptyPage';

// ── Layout & height persistence ────────────────────────────────────────────────

type Layout = 'stacked' | 'split';
type MapHeight = 'sm' | 'md' | 'lg';

const LS_LAYOUT = 'rackscope.worldmap.layout';
const LS_HEIGHT = 'rackscope.worldmap.height';
const MAP_HEIGHTS: Record<MapHeight, number> = { sm: 360, md: 500, lg: 680 };

// ── Helpers ────────────────────────────────────────────────────────────────────

function siteRackCount(site: Site): number {
  return site.rooms.reduce((acc, room) => {
    const aisleRacks = room.aisles.reduce((a, ai) => a + ai.racks.length, 0);
    return acc + aisleRacks + room.standalone_racks.length;
  }, 0);
}

function siteAlertCounts(siteId: string, alerts: ActiveAlert[]) {
  const siteAlerts = alerts.filter((a) => a.site_id === siteId);
  return {
    crit: siteAlerts.filter((a) => a.checks.some((c) => c.severity === 'CRIT')).length,
    warn: siteAlerts.filter(
      (a) =>
        !a.checks.some((c) => c.severity === 'CRIT') && a.checks.some((c) => c.severity === 'WARN')
    ).length,
  };
}

// ── Status dot ─────────────────────────────────────────────────────────────────

const StatusDot = ({ crit, warn }: { crit: number; warn: number }) => {
  if (crit > 0)
    return (
      <span className="text-status-crit flex items-center gap-1 text-[10px] font-bold">
        <span className="bg-status-crit h-1.5 w-1.5 animate-pulse rounded-full" />
        {crit} CRIT
      </span>
    );
  if (warn > 0)
    return (
      <span className="text-status-warn flex items-center gap-1 text-[10px] font-bold">
        <span className="bg-status-warn h-1.5 w-1.5 rounded-full" />
        {warn} WARN
      </span>
    );
  return (
    <span className="text-status-ok flex items-center gap-1 text-[10px] font-bold">
      <span className="bg-status-ok h-1.5 w-1.5 rounded-full" />
      OK
    </span>
  );
};

// ── Site detail panel ──────────────────────────────────────────────────────────

const SitePanel = ({
  site,
  alerts,
  onClose,
  compact = false,
}: {
  site: Site;
  alerts: ActiveAlert[];
  onClose: () => void;
  compact?: boolean;
}) => {
  const navigate = useNavigate();
  const { crit, warn } = siteAlertCounts(site.id, alerts);

  return (
    <div
      className={`border-brand-200/60 bg-brand-50/60 dark:border-brand-700/30 dark:bg-brand-500/[0.07] rounded-2xl border ${compact ? 'p-3.5' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-gray-900 dark:text-white">{site.name}</p>
            <StatusDot crit={crit} warn={warn} />
          </div>
          {site.description && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{site.description}</p>
          )}
          {site.location?.address && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="h-3 w-3 shrink-0" />
              {site.location.address}
            </div>
          )}
          {/* Rooms list */}
          {site.rooms.length > 0 && (
            <div className={`${compact ? 'mt-2.5' : 'mt-3'} space-y-1.5`}>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Rooms</p>
              <div className="flex flex-wrap gap-2">
                {site.rooms.map((room) => {
                  const roomAlerts = alerts.filter(
                    (a) => a.site_id === site.id && a.room_id === room.id
                  );
                  const rc = roomAlerts.filter((a) =>
                    a.checks.some((c) => c.severity === 'CRIT')
                  ).length;
                  const rw = roomAlerts.filter(
                    (a) =>
                      !a.checks.some((c) => c.severity === 'CRIT') &&
                      a.checks.some((c) => c.severity === 'WARN')
                  ).length;
                  return (
                    <button
                      key={room.id}
                      onClick={() => navigate(`/views/room/${room.id}`)}
                      className="group border-brand-200 text-brand-700 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20 flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      <DoorOpen className="h-3 w-3 opacity-60" />
                      {room.name}
                      {rc > 0 ? (
                        <XCircle className="text-status-crit h-3 w-3" />
                      ) : rw > 0 ? (
                        <AlertTriangle className="text-status-warn h-3 w-3" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// ── Stats bar ──────────────────────────────────────────────────────────────────

const StatsBar = ({
  sites,
  alerts,
  vertical = false,
}: {
  sites: Site[];
  alerts: ActiveAlert[];
  vertical?: boolean;
}) => {
  const totalRooms = sites.reduce((acc, s) => acc + s.rooms.length, 0);
  const totalRacks = sites.reduce((acc, s) => acc + siteRackCount(s), 0);
  const totalCrit = alerts.filter((a) => a.checks.some((c) => c.severity === 'CRIT')).length;
  const totalWarn = alerts.filter(
    (a) =>
      !a.checks.some((c) => c.severity === 'CRIT') && a.checks.some((c) => c.severity === 'WARN')
  ).length;

  const stats = [
    { label: 'Sites', value: sites.length, icon: MapPin, color: 'text-brand-500' },
    { label: 'Rooms', value: totalRooms, icon: DoorOpen, color: 'text-indigo-500' },
    { label: 'Racks', value: totalRacks, icon: Server, color: 'text-cyan-500' },
    ...(totalCrit > 0
      ? [{ label: 'Critical', value: totalCrit, icon: XCircle, color: 'text-status-crit' }]
      : []),
    ...(totalWarn > 0
      ? [{ label: 'Warning', value: totalWarn, icon: AlertTriangle, color: 'text-status-warn' }]
      : []),
  ];

  if (vertical) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
              <Icon className={`h-4 w-4 ${s.color} opacity-70`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Sites sidebar list ─────────────────────────────────────────────────────────

const SitesList = ({
  sites,
  alerts,
  selectedId,
  onSelect,
}: {
  sites: Site[];
  alerts: ActiveAlert[];
  selectedId: string | null;
  onSelect: (site: Site) => void;
}) => {
  if (sites.length === 0)
    return (
      <EmptyState title="No sites configured" description="Add sites in the topology editor." />
    );
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {sites.map((site) => {
        const { crit, warn } = siteAlertCounts(site.id, alerts);
        const racks = siteRackCount(site);
        const isSelected = site.id === selectedId;
        return (
          <button
            key={site.id}
            onClick={() => onSelect(site)}
            className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
              isSelected ? 'bg-brand-50/60 dark:bg-brand-500/[0.06]' : ''
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              <Building2 className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {site.name}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[11px] text-gray-400">
                  {site.rooms.length} room{site.rooms.length !== 1 ? 's' : ''} · {racks} rack
                  {racks !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusDot crit={crit} warn={warn} />
              <ChevronRight className="h-3 w-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

export const WorldMapPage = () => {
  usePageTitle('World Map');
  const { config } = useAppConfigSafe();

  const [sites, setSites] = useState<Site[]>([]);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(LS_LAYOUT) as Layout) || 'stacked'
  );
  const [mapHeight, setMapHeight] = useState<MapHeight>(
    () => (localStorage.getItem(LS_HEIGHT) as MapHeight) || 'md'
  );

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const mapCenterLat = Number(config?.map?.center?.lat ?? 20);
  const mapCenterLon = Number(config?.map?.center?.lon ?? 0);
  const mapDefaultZoom = Number(config?.map?.default_zoom ?? 1);
  const mapZoomControl = config?.map?.zoom_controls ?? true;
  const mapStyle = (localStorage.getItem('rackscope.map.style') ||
    config?.map?.style ||
    'minimal') as 'minimal' | 'noc' | 'flat';

  useEffect(() => {
    Promise.all([api.getSites(), api.getActiveAlerts().catch(() => ({ alerts: [] }))])
      .then(([sitesData, alertsData]) => {
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setAlerts(alertsData.alerts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const geoSites = useMemo(() => sites.filter((s) => s.location?.lat && s.location?.lon), [sites]);

  const markers: SiteMarker[] = useMemo(
    () =>
      geoSites.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.location!.lat,
        lon: s.location!.lon,
        roomCount: s.rooms.length,
      })),
    [geoSites]
  );

  const handleSiteClick = (marker: SiteMarker) => {
    setSelectedSite(sites.find((s) => s.id === marker.id) ?? null);
  };

  const changeLayout = (l: Layout) => {
    setLayout(l);
    localStorage.setItem(LS_LAYOUT, l);
  };
  const changeHeight = (h: MapHeight) => {
    setMapHeight(h);
    localStorage.setItem(LS_HEIGHT, h);
  };

  // ── Controls bar ─────────────────────────────────────────────────────────────

  const controls = (
    <div className="flex items-center gap-2">
      {/* Layout toggle */}
      <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
        {(
          [
            { id: 'stacked', icon: LayoutTemplate, label: 'Stacked' },
            { id: 'split', icon: Columns2, label: 'Split' },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => changeLayout(id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              layout === id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Height control (stacked only) */}
      {layout === 'stacked' && (
        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
          {(['sm', 'md', 'lg'] as const).map((h) => (
            <button
              key={h}
              title={{ sm: 'Compact', md: 'Normal', lg: 'Tall' }[h]}
              onClick={() => changeHeight(h)}
              className={`flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                mapHeight === h
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {h.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Map component ─────────────────────────────────────────────────────────────

  const mapEl = (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 dark:border-gray-800">
      {loading ? (
        <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
          <LoadingState message="Loading map data…" />
        </div>
      ) : (
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
  );

  // ── Stacked layout ────────────────────────────────────────────────────────────

  if (layout === 'stacked') {
    return (
      <div className="space-y-5">
        <PageHeader
          title="World Map"
          breadcrumb={
            <PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'World Map' }]} />
          }
          actions={controls}
        />

        {/* Stats — top 1/4 boxes */}
        {!loading && <StatsBar sites={sites} alerts={alerts} />}

        {/* Map */}
        <div style={{ height: MAP_HEIGHTS[mapHeight] }}>{mapEl}</div>

        {/* Selected site */}
        {selectedSite && (
          <SitePanel site={selectedSite} alerts={alerts} onClose={() => setSelectedSite(null)} />
        )}

        {/* Sites list */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              All Sites
              <span className="ml-2 text-xs font-normal text-gray-400">
                {sites.length} configured
              </span>
            </h3>
          </div>
          {loading ? (
            <div className="p-4">
              <LoadingState />
            </div>
          ) : sites.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No sites configured"
                description="Add sites with geolocation to see them on the map."
              />
            </div>
          ) : (
            <SitesList
              sites={sites}
              alerts={alerts}
              selectedId={selectedSite?.id ?? null}
              onSelect={(s) => setSelectedSite(s.id === selectedSite?.id ? null : s)}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Split layout ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[600px] flex-col gap-4">
      <PageHeader
        title="World Map"
        breadcrumb={
          <PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'World Map' }]} />
        }
        actions={controls}
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left 2/3 — map */}
        <div className="min-h-0 flex-[2]">{mapEl}</div>

        {/* Right 1/3 — sidebar */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">
          {/* Stats */}
          {!loading && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">Overview</p>
              </div>
              <StatsBar sites={sites} alerts={alerts} vertical />
            </div>
          )}

          {/* Selected site */}
          {selectedSite && (
            <SitePanel
              site={selectedSite}
              alerts={alerts}
              onClose={() => setSelectedSite(null)}
              compact
            />
          )}

          {/* Sites list */}
          <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                Sites
                <span className="ml-2 font-normal text-gray-400 normal-case">{sites.length}</span>
              </h3>
            </div>
            {loading ? (
              <div className="p-4">
                <LoadingState />
              </div>
            ) : (
              <SitesList
                sites={sites}
                alerts={alerts}
                selectedId={selectedSite?.id ?? null}
                onSelect={(s) => setSelectedSite(s.id === selectedSite?.id ? null : s)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
