import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type {
  Room,
  Rack,
  DeviceTemplate,
  RackTemplate,
  RackComponentTemplate,
  RackState,
} from '../types';
import { Box, Zap, Thermometer, Maximize2 } from 'lucide-react';
import { RackElevation, HUDTooltip } from '../components/RackVisualizer';
import { matchesInstanceValue, matchesText } from '../utils/search';
import { resolveRackComponents } from '../utils/rackComponents';

export const RoomPage = ({
  searchQuery = '',
  reloadKey = 0,
}: {
  searchQuery?: string;
  reloadKey?: number;
}) => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [rackTemplates, setRackTemplates] = useState<Record<string, RackTemplate>>({});
  const [rackComponentTemplates, setRackComponentTemplates] = useState<
    Record<string, RackComponentTemplate>
  >({});
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [viewSide, setViewSide] = useState<'front' | 'rear'>('front');
  const [error, setError] = useState<string | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, RackState | string>>({});
  const [selectedRackHealth, setSelectedRackHealth] = useState<RackState | null>(null);
  const [refreshMs, setRefreshMs] = useState(30000);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  useEffect(() => {
    const init = async () => {
      if (!roomId) return;
      setLoading(true);
      try {
        const [roomData, catalogData, configData] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getCatalog(),
          api.getConfig(),
        ]);
        setRoom(roomData);
        const deviceTemplates = catalogData.device_templates || [];
        const rackTemplates = catalogData.rack_templates || [];
        const rackComponentTemplates = catalogData.rack_component_templates || [];
        const catMap = deviceTemplates.reduce<Record<string, DeviceTemplate>>(
          (acc, t) => ({ ...acc, [t.id]: t }),
          {}
        );
        setCatalog(catMap);
        const rackMap = rackTemplates.reduce<Record<string, RackTemplate>>(
          (acc, t) => ({ ...acc, [t.id]: t }),
          {}
        );
        setRackTemplates(rackMap);
        const rackComponentMap = rackComponentTemplates.reduce<
          Record<string, RackComponentTemplate>
        >((acc, t) => ({ ...acc, [t.id]: t }), {});
        setRackComponentTemplates(rackComponentMap);
        const nextRefresh = Number(configData?.refresh?.room_state_seconds) || 30;
        setRefreshMs(Math.max(10000, nextRefresh * 1000));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load room';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    const fetchHealth = async () => {
      try {
        const data = await api.getRoomState(room.id);
        setHealthMap(data?.racks || {});
      } catch (e) {
        console.error('Failed to fetch room health', e);
        setHealthMap({});
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshMs);
    return () => clearInterval(interval);
  }, [room, refreshMs, reloadKey]);

  useEffect(() => {
    if (!selectedRack) {
      setSelectedRackHealth(null);
      return;
    }
    let active = true;
    const fetchSelected = async () => {
      try {
        const data = await api.getRackState(selectedRack.id);
        if (active) {
          setSelectedRackHealth(data);
        }
      } catch (e) {
        console.error('Failed to fetch rack health', e);
        if (active) {
          setSelectedRackHealth(null);
        }
      }
    };
    fetchSelected();
    const interval = setInterval(fetchSelected, refreshMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedRack, refreshMs, reloadKey]);

  const selectedMetrics = selectedRackHealth?.metrics || null;
  const selectedNodesData = selectedRackHealth?.nodes || null;
  const selectedState =
    selectedRackHealth?.state ||
    (typeof healthMap[selectedRack?.id || ''] === 'string'
      ? healthMap[selectedRack?.id || '']
      : healthMap[selectedRack?.id || '']?.state);
  const selectedRackTemplate = selectedRack?.template_id
    ? rackTemplates[selectedRack.template_id]
    : null;
  const resolvedRackComponents = selectedRackTemplate
    ? resolveRackComponents(
        selectedRackTemplate.infrastructure.rack_components,
        rackComponentTemplates
      )
    : { front: [], rear: [], side: [], main: [] };
  const baseInfra = selectedRackTemplate?.infrastructure.components || [];
  const frontInfraBase = selectedRackTemplate?.infrastructure.front_components?.length
    ? selectedRackTemplate.infrastructure.front_components
    : baseInfra;
  const rearInfraBase = selectedRackTemplate?.infrastructure.rear_components?.length
    ? selectedRackTemplate.infrastructure.rear_components
    : baseInfra;
  const sideInfraBase = selectedRackTemplate?.infrastructure.side_components || [];
  const frontInfra = [
    ...frontInfraBase,
    ...resolvedRackComponents.main,
    ...resolvedRackComponents.front,
  ];
  const rearInfra = [
    ...rearInfraBase,
    ...resolvedRackComponents.main,
    ...resolvedRackComponents.rear,
  ];
  const sideInfra = [...sideInfraBase, ...resolvedRackComponents.side];

  const filteredAisles = useMemo(() => {
    if (!hasQuery || !room) return room?.aisles || [];
    return room.aisles
      .map((aisle) => {
        const aisleMatch =
          matchesText(aisle.name, normalizedQuery) || matchesText(aisle.id, normalizedQuery);
        if (aisleMatch) return aisle;
        const filteredRacks = aisle.racks.filter((rack) => {
          if (matchesText(rack.name, normalizedQuery) || matchesText(rack.id, normalizedQuery))
            return true;
          return rack.devices?.some((device) => {
            if (
              matchesText(device.name, normalizedQuery) ||
              matchesText(device.id, normalizedQuery)
            )
              return true;
            return matchesInstanceValue(normalizedQuery, device.instance);
          });
        });
        if (filteredRacks.length === 0) return null;
        return { ...aisle, racks: filteredRacks };
      })
      .filter(Boolean) as typeof room.aisles;
  }, [hasQuery, normalizedQuery, room]);

  const rackMatches = useMemo(() => {
    if (!hasQuery || !room) return new Set<string>();
    const ids = new Set<string>();
    for (const aisle of room.aisles) {
      for (const rack of aisle.racks) {
        if (matchesText(rack.name, normalizedQuery) || matchesText(rack.id, normalizedQuery)) {
          ids.add(rack.id);
          continue;
        }
        for (const device of rack.devices || []) {
          if (
            matchesText(device.name, normalizedQuery) ||
            matchesText(device.id, normalizedQuery)
          ) {
            ids.add(rack.id);
            continue;
          }
          if (matchesInstanceValue(normalizedQuery, device.instance)) {
            ids.add(rack.id);
          }
        }
      }
    }
    return ids;
  }, [hasQuery, normalizedQuery, room]);

  if (loading)
    return (
      <div className="animate-pulse p-8 font-mono text-blue-500">
        LDR :: INITIALIZING_ENVIRONMENT...
      </div>
    );
  if (error) return <div className="text-status-crit p-8 font-mono uppercase">ERR :: {error}</div>;
  if (!room)
    return (
      <div className="p-8 text-center font-mono text-gray-500 uppercase">ERR :: ROOM_NOT_FOUND</div>
    );

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/20 px-8 py-6">
        <div>
          <nav className="mb-1 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <Link to="/" className="transition-colors hover:text-blue-400">
              Infrastructure
            </Link>
            <span>/</span>
            <span className="text-white">{room.name}</span>
          </nav>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
              {room.name}
            </h1>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div className="flex gap-4 font-mono text-[10px] text-gray-400">
              <span>{room.aisles.length} AISLES</span>
              <span>{room.aisles.reduce((acc, a) => acc + a.racks.length, 0)} RACKS</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-[10px] text-gray-500 uppercase">Room Status</span>
          <span className="text-status-ok font-mono text-2xl tracking-tighter">LIVE</span>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-12 gap-6 overflow-hidden p-6">
        <div
          className="bg-rack-panel border-rack-border custom-scrollbar relative col-span-12 overflow-auto rounded-xl border p-8 shadow-inner lg:col-span-8"
          style={(() => {
            const grid = room.layout?.grid;
            if (!grid?.enabled) return undefined;
            const cell = Number(grid.cell || 28);
            return {
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: `${cell}px ${cell}px`,
            } as React.CSSProperties;
          })()}
        >
          {room.layout && (
            <>
              <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/10">
                {(() => {
                  const north = room.layout?.orientation?.north || 'top';
                  const order = ['top', 'right', 'bottom', 'left'] as const;
                  const labels = ['N', 'E', 'S', 'W'];
                  const idx = order.indexOf(north as (typeof order)[number]);
                  const rotated = labels.slice(idx).concat(labels.slice(0, idx));
                  return (
                    <>
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-bold text-gray-300">
                        {rotated[0]}
                      </span>
                      <span className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-bold text-gray-300">
                        {rotated[1]}
                      </span>
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-bold text-gray-300">
                        {rotated[2]}
                      </span>
                      <span className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-bold text-gray-300">
                        {rotated[3]}
                      </span>
                    </>
                  );
                })()}
              </div>
              {(() => {
                const door = room.layout?.door;
                if (!door) return null;
                const pos = Math.min(1, Math.max(0, door.position ?? 0.2)) * 100;
                const strip =
                  'absolute pointer-events-auto group flex items-center justify-center rounded-full bg-[var(--color-accent)]/70 shadow-[0_0_18px_rgba(86,179,255,0.55)]';
                const label = door.label || 'Door';
                const labelBadge =
                  'absolute whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-100 shadow-[0_8px_20px_rgba(0,0,0,0.4)] opacity-0 transition-opacity group-hover:opacity-100';
                if (door.side === 'north')
                  return (
                    <div
                      className={`${strip} top-[12px] h-[6px] w-20`}
                      style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                      title={label}
                    >
                      <span className={`${labelBadge} -top-7 left-1/2 -translate-x-1/2`}>
                        {label}
                      </span>
                    </div>
                  );
                if (door.side === 'south')
                  return (
                    <div
                      className={`${strip} bottom-[12px] h-[6px] w-20`}
                      style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                      title={label}
                    >
                      <span className={`${labelBadge} -bottom-7 left-1/2 -translate-x-1/2`}>
                        {label}
                      </span>
                    </div>
                  );
                if (door.side === 'east')
                  return (
                    <div
                      className={`${strip} right-[12px] h-20 w-[6px]`}
                      style={{ top: `${pos}%`, transform: 'translateY(-50%)' }}
                      title={label}
                    >
                      <span className={`${labelBadge} top-1/2 left-5 -translate-y-1/2`}>
                        {label}
                      </span>
                    </div>
                  );
                return (
                  <div
                    className={`${strip} left-[12px] h-20 w-[6px]`}
                    style={{ top: `${pos}%`, transform: 'translateY(-50%)' }}
                    title={label}
                  >
                    <span className={`${labelBadge} top-1/2 right-5 -translate-y-1/2`}>
                      {label}
                    </span>
                  </div>
                );
              })()}
            </>
          )}
          <div className="space-y-12">
            {filteredAisles.map((aisle) => (
              <div key={aisle.id}>
                <h3 className="mb-4 flex items-center gap-4 text-[10px] font-bold tracking-[0.3em] text-blue-500/80 uppercase">
                  <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1">
                    {aisle.name}
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/20 to-transparent"></div>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {aisle.racks.map((rack) => (
                    <RackThumbnail
                      key={rack.id}
                      rack={rack}
                      healthData={healthMap[rack.id]}
                      isSelected={selectedRack?.id === rack.id}
                      isMatch={hasQuery ? rackMatches.has(rack.id) : false}
                      onClick={() => setSelectedRack(rack)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {hasQuery && filteredAisles.length === 0 && (
              <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
                No racks match the search.
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 flex h-full flex-col overflow-hidden lg:col-span-4">
          <div className="bg-rack-panel border-rack-border relative flex flex-1 flex-col overflow-hidden rounded-xl border shadow-2xl">
            {selectedRack ? (
              <>
                <div className="border-rack-border flex shrink-0 flex-col gap-4 border-b bg-black/20 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/rack/${selectedRack.id}`}
                        className="group flex items-center gap-3 transition-colors hover:text-blue-400"
                      >
                        <h2 className="text-xl font-bold tracking-tighter text-white uppercase group-hover:text-blue-400">
                          {selectedRack.name}
                        </h2>
                        <Maximize2 className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 uppercase">
                          ID: {selectedRack.id}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${selectedState === 'OK' ? 'bg-status-ok/20 text-status-ok' : selectedState === 'CRIT' ? 'bg-status-crit/20 text-status-crit' : 'bg-gray-800 text-gray-400'}`}
                        >
                          {selectedState}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex min-w-[60px] flex-col items-center rounded border border-white/10 bg-white/5 px-3 py-1.5">
                        <div className="mb-0.5 flex items-center gap-1 text-gray-500">
                          <Thermometer className="h-3 w-3" />
                          <span className="text-[8px] uppercase">Temp</span>
                        </div>
                        <div className="font-mono text-sm text-white">
                          {selectedMetrics?.temperature
                            ? selectedMetrics.temperature.toFixed(1)
                            : '--'}
                          <span className="ml-0.5 text-[9px] text-gray-500">°C</span>
                        </div>
                      </div>
                      <div className="flex min-w-[60px] flex-col items-center rounded border border-white/10 bg-white/5 px-3 py-1.5">
                        <div className="mb-0.5 flex items-center gap-1 text-gray-500">
                          <Zap className="h-3 w-3" />
                          <span className="text-[8px] uppercase">Pwr</span>
                        </div>
                        <div className="font-mono text-sm text-white">
                          {selectedMetrics?.power
                            ? (selectedMetrics.power / 1000).toFixed(1)
                            : '--'}
                          <span className="ml-0.5 text-[9px] text-gray-500">kW</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <RackElevation
                    rack={selectedRack}
                    catalog={catalog}
                    health={selectedState}
                    nodesData={selectedNodesData}
                    isRearView={viewSide === 'rear'}
                    infraComponents={viewSide === 'rear' ? rearInfra : frontInfra}
                    sideComponents={sideInfra}
                    allowInfraOverlap={viewSide === 'rear'}
                    overlay={
                      <button
                        type="button"
                        onClick={() => setViewSide(viewSide === 'front' ? 'rear' : 'front')}
                        aria-label="Toggle rack view"
                        aria-pressed={viewSide === 'rear'}
                        className="relative h-6 w-[132px] rounded-[6px] border border-white/10 bg-black/50 p-0.5 text-[9px] font-bold tracking-[0.18em] text-gray-500 uppercase transition-colors hover:text-gray-300"
                      >
                        <span
                          className={`absolute inset-y-0.5 left-0.5 w-1/2 rounded-[4px] border border-white/12 bg-white/12 shadow-[0_0_10px_rgba(255,255,255,0.08)] transition-transform duration-300 ${viewSide === 'rear' ? 'translate-x-full' : ''}`}
                        />
                        <span
                          className={`relative z-10 inline-flex w-1/2 items-center justify-center ${viewSide === 'front' ? 'text-white' : ''}`}
                        >
                          Front
                        </span>
                        <span
                          className={`relative z-10 inline-flex w-1/2 items-center justify-center ${viewSide === 'rear' ? 'text-white' : ''}`}
                        >
                          Rear
                        </span>
                      </button>
                    }
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center opacity-50">
                <Box className="mb-4 h-16 w-16 stroke-[1px] text-gray-800" />
                <p className="font-mono text-[10px] tracking-[0.3em] text-gray-600 uppercase">
                  Physical Inspector ready
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RackThumbnail = ({
  rack,
  healthData,
  isSelected,
  isMatch,
  onClick,
}: {
  rack: Rack;
  healthData: RackState | string | undefined;
  isSelected: boolean;
  isMatch: boolean;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const health = typeof healthData === 'string' ? healthData : healthData?.state || 'UNKNOWN';
  const isCrit = health === 'CRIT';
  const isWarn = health === 'WARN';

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    hoverTimer.current = setTimeout(() => {
      setIsHovered(true);
    }, 600); // 600ms delay
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
  };

  const reasons = (() => {
    if (!healthData || typeof healthData === 'string') return [];
    const raw =
      (healthData as Record<string, unknown>).reasons ??
      (healthData as Record<string, unknown>).checks ??
      (healthData as Record<string, unknown>).alerts;
    if (Array.isArray(raw)) {
      return raw
        .map((r) => {
          if (typeof r === 'string') return r;
          if (r && typeof r === 'object') {
            const item = r as { name?: string; label?: string; id?: string };
            return item.name || item.label || item.id || '';
          }
          return '';
        })
        .filter(Boolean);
    }
    return [];
  })();
  const showReasons =
    health !== 'OK'
      ? reasons.length > 0
        ? reasons
        : ['No checks configured for this device']
      : [];

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={handleMouseLeave}
        className={`group relative flex h-[121px] w-[92px] flex-col items-center justify-between overflow-hidden rounded border p-1.5 transition-all ${isSelected ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500' : 'border-white/10 bg-[#121212] hover:border-white/30 hover:bg-white/5'} ${isMatch ? 'ring-1 ring-[var(--color-accent)]/60' : ''}`}
      >
        <div className="flex w-full items-center justify-between px-1">
          <div
            className={`h-1.5 w-1.5 rounded-full ${isCrit ? 'bg-status-crit shadow-[0_0_5px_var(--color-status-crit)]' : isWarn ? 'bg-status-warn' : health === 'OK' ? 'bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]' : 'bg-status-unknown'}`}
          ></div>
          <span className="font-mono text-[7px] tracking-tighter text-gray-600">
            {rack.u_height}U
          </span>
        </div>
        <div className="my-2 flex w-full flex-1 flex-col gap-[2px] px-2 opacity-50 transition-opacity group-hover:opacity-80">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-[3px] w-full rounded-full ${isCrit && i % 2 === 0 ? 'bg-status-crit/50' : 'bg-gray-700'}`}
            ></div>
          ))}
        </div>
        <div className="w-full rounded border-t border-white/5 bg-white/5 px-1 py-1 text-center">
          <div className="max-h-[2.4em] overflow-hidden text-[9px] leading-tight font-bold break-words whitespace-normal text-gray-300 uppercase">
            {rack.name.replace('Rack ', '')}
          </div>
        </div>
      </button>

      {isHovered && (
        <HUDTooltip
          title={rack.name}
          subtitle="Enclosure Overview"
          status={health}
          details={[
            { label: 'Template', value: rack.template_id || 'Generic' },
            {
              label: 'Capacity',
              value: `${rack.devices.length} Assets / ${rack.u_height}U`,
              italic: true,
            },
          ]}
          reasons={showReasons}
          metrics={
            typeof healthData !== 'string' && healthData?.metrics
              ? { temp: healthData.metrics.temperature, power: healthData.metrics.power }
              : undefined
          }
          mousePos={mousePos}
        />
      )}
    </>
  );
};
