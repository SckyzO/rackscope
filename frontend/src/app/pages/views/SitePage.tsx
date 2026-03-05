import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, SlidersHorizontal, LayoutGrid, List, ChevronRight } from 'lucide-react';
import { api } from '../../../services/api';
import type { Site, Room, RoomState } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { RefreshButton, useAutoRefresh } from '../../components/RefreshButton';
import { PageActionIconButton } from '../../components/PageActionButton';
import { KpiCard } from '../../components/data/KpiCard';
import { Drawer } from '../../components/layout/Drawer';
import { DrawerHeader } from '../../components/layout/DrawerHeader';
import { SegmentedControl } from '../../components/forms/SegmentedControl';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  StatusRow,
  SimpleRow,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
  HealthDot,
} from '../templates/EmptyPage';

// ── Types & constants ──────────────────────────────────────────────────────────

type HealthStatus = 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
type Layout = 'grid' | 'list';
type RackSize = 'sm' | 'md';

const LS_LAYOUT = 'rackscope.site.layout';
const LS_RACK_SIZE = 'rackscope.site.rack-size';

const RACK_COLOR: Record<string, string> = {
  OK: 'bg-green-500',
  WARN: 'bg-amber-400',
  CRIT: 'bg-red-500',
  UNKNOWN: 'bg-gray-300 dark:bg-gray-600',
};

const CARD_RING: Record<string, string> = {
  CRIT: 'ring-2 ring-red-500/40',
  WARN: 'ring-2 ring-amber-400/40',
  OK: '',
  UNKNOWN: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRoomRackIds(room: Room): string[] {
  const aisleRacks = room.aisles.flatMap((a) => a.racks.map((r) => r.id));
  const standalone = room.standalone_racks.map((r) => r.id);
  return [...aisleRacks, ...standalone];
}

function computeRoomHealth(roomState: RoomState | null): HealthStatus {
  if (!roomState?.racks) return 'UNKNOWN';
  const states = Object.values(roomState.racks).map((r) =>
    typeof r === 'string' ? r : (r.state ?? 'UNKNOWN')
  );
  if (states.length === 0) return 'UNKNOWN';
  if (states.some((s) => s === 'CRIT')) return 'CRIT';
  if (states.some((s) => s === 'WARN')) return 'WARN';
  if (states.every((s) => s === 'OK')) return 'OK';
  return 'UNKNOWN';
}

function rackAlertCounts(roomState: RoomState | null) {
  if (!roomState?.racks) return { crit: 0, warn: 0, ok: 0 };
  const states = Object.values(roomState.racks).map((r) =>
    typeof r === 'string' ? r : (r.state ?? 'UNKNOWN')
  );
  return {
    crit: states.filter((s) => s === 'CRIT').length,
    warn: states.filter((s) => s === 'WARN').length,
    ok: states.filter((s) => s === 'OK').length,
  };
}

function roomRackCount(room: Room): number {
  return room.aisles.reduce((a, ai) => a + ai.racks.length, 0) + room.standalone_racks.length;
}

// ── Mini rack grid ─────────────────────────────────────────────────────────────

const MAX_RACKS = 48;

const MiniRackGrid = ({
  room,
  roomState,
  size,
}: {
  room: Room;
  roomState: RoomState | null;
  size: RackSize;
}) => {
  const rackIds = getRoomRackIds(room);
  const visible = rackIds.slice(0, MAX_RACKS);
  const overflow = rackIds.length - MAX_RACKS;
  const sq = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';

  return (
    <div className="flex flex-wrap gap-0.5">
      {visible.map((id) => {
        const raw = roomState?.racks?.[id];
        const state = raw ? (typeof raw === 'string' ? raw : (raw.state ?? 'UNKNOWN')) : 'UNKNOWN';
        return (
          <div
            key={id}
            className={`${sq} rounded-sm ${RACK_COLOR[state] ?? RACK_COLOR.UNKNOWN}`}
            title={`${id}: ${state}`}
          />
        );
      })}
      {overflow > 0 && (
        <span className="self-center text-[9px] text-gray-400 dark:text-gray-500">+{overflow}</span>
      )}
    </div>
  );
};

// ── Room card (grid view) ──────────────────────────────────────────────────────

const RoomCard = ({
  room,
  roomState,
  rackSize,
  onClick,
}: {
  room: Room;
  roomState: RoomState | null;
  rackSize: RackSize;
  onClick: () => void;
}) => {
  const health = computeRoomHealth(roomState);
  const counts = rackAlertCounts(roomState);
  const totalRacks = roomRackCount(room);
  const ring = CARD_RING[health] ?? '';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 ${ring}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {room.name}
          </p>
        </div>
        <StatusBadge status={health} size="sm" />
      </div>

      {/* Mini rack grid */}
      <MiniRackGrid room={room} roomState={roomState} size={rackSize} />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {totalRacks} rack{totalRacks !== 1 ? 's' : ''}
          {room.aisles.length > 0 &&
            ` · ${room.aisles.length} aisle${room.aisles.length !== 1 ? 's' : ''}`}
        </span>
        {health === 'OK' ? (
          <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
            All clear
          </span>
        ) : (
          <span className="flex gap-2 text-[11px] font-medium">
            {counts.crit > 0 && <span className="text-red-500">{counts.crit} CRIT</span>}
            {counts.warn > 0 && <span className="text-amber-500">{counts.warn} WARN</span>}
          </span>
        )}
      </div>
    </button>
  );
};

// ── Room detail panel (list view) ─────────────────────────────────────────────

const RoomDetailPanel = ({
  room,
  roomState,
  rackSize,
  onNavigate,
}: {
  room: Room;
  roomState: RoomState | null;
  rackSize: RackSize;
  onNavigate: () => void;
}) => {
  const health = computeRoomHealth(roomState);
  const counts = rackAlertCounts(roomState);
  const totalRacks = roomRackCount(room);

  return (
    <SectionCard title={room.name} icon={Building2}>
      {/* Health badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Overall health</span>
        <StatusBadge status={health} size="md" />
      </div>

      {/* Mini rack grid — larger in detail view */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
        <MiniRackGrid room={room} roomState={roomState} size={rackSize} />
      </div>

      {/* Stats */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <SimpleRow label="Total racks" value={totalRacks} />
        <SimpleRow label="Aisles" value={room.aisles.length} />
        {room.standalone_racks.length > 0 && (
          <SimpleRow label="Standalone racks" value={room.standalone_racks.length} />
        )}
        {counts.crit > 0 && (
          <SimpleRow
            label="CRIT"
            value={<span className="font-bold text-red-500">{counts.crit}</span>}
          />
        )}
        {counts.warn > 0 && (
          <SimpleRow
            label="WARN"
            value={<span className="font-bold text-amber-500">{counts.warn}</span>}
          />
        )}
        <SimpleRow
          label="OK"
          value={<span className="text-green-600 dark:text-green-400">{counts.ok}</span>}
        />
      </div>

      {/* Aisle list */}
      {room.aisles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {room.aisles.map((a) => (
            <span
              key={a.id}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {a.name}
            </span>
          ))}
        </div>
      )}

      {/* Navigate */}
      <button
        onClick={onNavigate}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
      >
        View room
        <ChevronRight className="h-4 w-4" />
      </button>
    </SectionCard>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

export const SitePage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  // ── Preferences (localStorage) ────────────────────────────────────────────
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(LS_LAYOUT) as Layout) ?? 'grid'
  );
  const [rackSize, setRackSize] = useState<RackSize>(
    () => (localStorage.getItem(LS_RACK_SIZE) as RackSize) ?? 'sm'
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [site, setSite] = useState<Site | null>(null);
  const [roomStates, setRoomStates] = useState<Record<string, RoomState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!siteId) return;
    try {
      const sites = await api.getSites();
      const found = sites.find((s) => s.id === siteId);
      if (!found) {
        setError(true);
        return;
      }
      setSite(found);

      // Select first room if none selected
      if (!selectedRoomId && found.rooms.length > 0) {
        setSelectedRoomId(found.rooms[0].id);
      }

      // Load all room states in parallel
      const states = await Promise.all(
        found.rooms.map((r) => api.getRoomState(r.id).then((s) => ({ id: r.id, state: s })))
      );
      const stateMap: Record<string, RoomState> = {};
      states.forEach(({ id, state }) => {
        stateMap[id] = state;
      });
      setRoomStates(stateMap);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [siteId, selectedRoomId]);

  useEffect(() => {
    loadData();
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('site', loadData);

  usePageTitle(site ? site.name : 'Datacenter');

  // ── Preference setters (persist to localStorage) ──────────────────────────
  const applyLayout = (v: Layout) => {
    setLayout(v);
    localStorage.setItem(LS_LAYOUT, v);
  };
  const applyRackSize = (v: RackSize) => {
    setRackSize(v);
    localStorage.setItem(LS_RACK_SIZE, v);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalRacks = site?.rooms.reduce((a, r) => a + roomRackCount(r), 0) ?? 0;
  const totalRooms = site?.rooms.length ?? 0;
  const totalCrit =
    site?.rooms.reduce((a, r) => a + rackAlertCounts(roomStates[r.id] ?? null).crit, 0) ?? 0;
  const totalWarn =
    site?.rooms.reduce((a, r) => a + rackAlertCounts(roomStates[r.id] ?? null).warn, 0) ?? 0;

  const selectedRoom = site?.rooms.find((r) => r.id === selectedRoomId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingState message="Loading datacenter…" />;
  if (error || !site) return <ErrorState message="Datacenter not found." onRetry={loadData} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title={site.name}
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'World Map', href: '/views/worldmap' },
              { label: site.name },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <PageActionIconButton
              icon={SlidersHorizontal}
              title="View settings"
              onClick={() => setDrawerOpen(true)}
            />
            <RefreshButton
              refreshing={loading}
              autoRefreshMs={autoRefreshMs}
              onRefresh={loadData}
              onIntervalChange={onIntervalChange}
            />
          </div>
        }
      />

      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Racks" value={totalRacks} />
        <KpiCard label="Rooms" value={totalRooms} />
        <KpiCard
          label="CRIT"
          value={totalCrit}
          className={totalCrit > 0 ? 'border-red-200 dark:border-red-500/30' : ''}
        />
        <KpiCard
          label="WARN"
          value={totalWarn}
          className={totalWarn > 0 ? 'border-amber-200 dark:border-amber-500/30' : ''}
        />
      </div>

      {/* Empty state */}
      {site.rooms.length === 0 && (
        <EmptyState
          title="No rooms defined"
          description="Add rooms to this site using the Topology Editor."
        />
      )}

      {/* ── Grid view ── */}
      {layout === 'grid' && site.rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {site.rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              roomState={roomStates[room.id] ?? null}
              rackSize={rackSize}
              onClick={() => navigate(`/views/room/${room.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── List + Detail view ── */}
      {layout === 'list' && site.rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* Room list */}
          <SectionCard title="Rooms">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {site.rooms.map((room) => {
                const health = computeRoomHealth(roomStates[room.id] ?? null);
                return (
                  <div
                    key={room.id}
                    className={
                      selectedRoomId === room.id
                        ? 'bg-brand-50 dark:bg-brand-500/10 -mx-1 rounded-xl px-1'
                        : ''
                    }
                  >
                    <StatusRow
                      icon={Building2}
                      title={room.name}
                      subtitle={`${roomRackCount(room)} racks`}
                      status={health}
                      onClick={() => setSelectedRoomId(room.id)}
                    />
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Room detail */}
          {selectedRoom ? (
            <RoomDetailPanel
              room={selectedRoom}
              roomState={roomStates[selectedRoom.id] ?? null}
              rackSize={rackSize}
              onNavigate={() => navigate(`/views/room/${selectedRoom.id}`)}
            />
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <EmptyState
                title="Select a room"
                description="Click a room in the list to see details."
              />
            </div>
          )}
        </div>
      )}

      {/* ── Config Drawer ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width={320}>
        <DrawerHeader
          title="View settings"
          icon={SlidersHorizontal}
          onClose={() => setDrawerOpen(false)}
          description={site.name}
        />
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Layout */}
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Layout
            </p>
            <SegmentedControl
              value={layout}
              onChange={(v) => applyLayout(v as Layout)}
              options={[
                { label: 'Grid', value: 'grid', icon: LayoutGrid },
                { label: 'List + Detail', value: 'list', icon: List },
              ]}
            />
          </div>

          {/* Rack square size */}
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Rack squares
            </p>
            <SegmentedControl
              value={rackSize}
              onChange={(v) => applyRackSize(v as RackSize)}
              options={[
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
              ]}
            />
          </div>

          {/* Auto-refresh info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Auto-refresh
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use the refresh button in the header to set the interval.
            </p>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Rack color legend
            </p>
            <div className="space-y-1.5">
              {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <HealthDot status={s} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
