import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, ExternalLink, Thermometer, Zap } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, Aisle, RackState } from '../../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const BLUEPRINT = {
  bg: '#060e1a',
  wall: '#1e4d8c',
  wallStroke: '#2563eb',
  grid: '#0d2a52',
  label: '#64b5f6',
  labelFaint: '#3b6ea8',
  door: '#38bdf8',
  compass: '#60a5fa',
  aisleBand: '#0a1f3a',
};

const VARIANTS = [
  { label: 'V1', path: 'room' },
  { label: 'V2', path: 'room-v2' },
  { label: 'V3', path: 'room-v3' },
  { label: 'V4', path: 'room-v4' },
  { label: 'V5', path: 'room-v5' },
  { label: 'V6', path: 'room-v6' },
  { label: 'V7', path: 'room-v7' },
  { label: 'V8', path: 'room-v8' },
  { label: 'V9', path: 'room-v9' },
  { label: 'V10', path: 'room-v10' },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────

const getRackHealth = (rackId: string, healthMap: Record<string, string>): string =>
  healthMap[rackId] ?? 'UNKNOWN';

// ── CompassRose ────────────────────────────────────────────────────────────

const CompassRose = () => (
  <div
    className="pointer-events-none absolute top-4 right-4 flex flex-col items-center"
    style={{ color: BLUEPRINT.compass }}
  >
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 19,16 16,14 13,16" fill={BLUEPRINT.compass} />
      <polygon points="16,30 13,16 16,18 19,16" fill={BLUEPRINT.compassFaint ?? BLUEPRINT.grid} />
      <circle cx="16" cy="16" r="2" fill={BLUEPRINT.compass} />
    </svg>
    <span className="mt-0.5 font-mono text-[8px] font-bold tracking-widest">N</span>
  </div>
);

// Extend BLUEPRINT with extra key for compass
(BLUEPRINT as Record<string, string>).compassFaint = '#1e3a5c';

// ── RackRect — a single rack rectangle in the floor plan ──────────────────

type RackRectProps = {
  rack: Rack;
  left: number;
  top: number;
  width: number;
  height: number;
  health: string;
  selected: boolean;
  hovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
};

const RackRect = ({
  rack,
  left,
  top,
  width,
  height,
  health,
  selected,
  hovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: RackRectProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  const isCrit = health === 'CRIT';

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={`${rack.id} — ${health}`}
      className={`absolute focus:outline-none ${isCrit ? 'animate-pulse' : ''}`}
      style={{
        left,
        top,
        width,
        height,
        backgroundColor: `${color}55`,
        border: `1.5px solid ${color}`,
        borderRadius: 3,
        boxShadow: selected
          ? `0 0 0 2px white, 0 0 16px ${color}80`
          : hovered
            ? `0 0 8px ${color}60`
            : isCrit
              ? `0 0 10px ${color}50`
              : undefined,
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        transform: hovered ? 'scale(1.04)' : undefined,
        zIndex: hovered || selected ? 10 : 1,
      }}
    >
      {/* Inner gradient */}
      <div
        className="pointer-events-none absolute inset-0 rounded-sm"
        style={{
          background: `linear-gradient(135deg, ${color}30 0%, transparent 60%)`,
        }}
      />

      {/* Rack label (shown on hover) */}
      {hovered && (
        <span
          className="absolute right-0 bottom-0.5 left-0 truncate text-center font-mono text-[7px] font-bold"
          style={{ color: color, textShadow: `0 0 6px ${color}` }}
        >
          {rack.id}
        </span>
      )}
    </button>
  );
};

// ── RackTooltip ────────────────────────────────────────────────────────────

type RackTooltipProps = {
  rack: Rack;
  health: string;
  x: number;
  y: number;
};

const RackTooltip = ({ rack, health, x, y }: RackTooltipProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  return (
    <div
      className="pointer-events-none absolute z-50 rounded-lg border px-2.5 py-1.5 text-xs"
      style={{
        left: x + 10,
        top: y - 30,
        backgroundColor: '#0d1e35',
        borderColor: `${color}60`,
        color: BLUEPRINT.label,
        boxShadow: `0 4px 16px rgba(0,0,0,0.6)`,
      }}
    >
      <span className="font-mono font-bold">{rack.id}</span>
      <span
        className="ml-2 rounded px-1 py-0.5 font-mono text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {health}
      </span>
    </div>
  );
};

// ── AisleFloor — renders one aisle's racks on the blueprint ──────────────

type AisleFloorProps = {
  aisle: Aisle;
  aisleIndex: number;
  totalAisles: number;
  containerWidth: number;
  containerHeight: number;
  healthMap: Record<string, string>;
  selectedRackId: string | null;
  hoveredRackId: string | null;
  onHover: (rackId: string | null) => void;
  onSelect: (rack: Rack) => void;
  padding: number;
};

const AisleFloor = ({
  aisle,
  aisleIndex,
  totalAisles,
  containerWidth,
  containerHeight,
  healthMap,
  selectedRackId,
  hoveredRackId,
  onHover,
  onSelect,
  padding,
}: AisleFloorProps) => {
  const innerW = containerWidth - padding * 2;
  const innerH = containerHeight - padding * 2;

  const bandH = innerH / totalAisles;
  const rackAreaH = bandH * 0.65;
  const aisleTopInner = aisleIndex * bandH + (bandH - rackAreaH) / 2;
  const aisleTop = padding + aisleTopInner;

  const racks = aisle.racks ?? [];
  const m = racks.length;
  if (m === 0) return null;

  const slotW = innerW / m;
  const rackW = slotW * 0.65;
  const rackH = rackAreaH;

  const labelX = padding;
  const labelY = padding + aisleIndex * bandH + bandH / 2;

  return (
    <>
      {/* Aisle band background */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: padding,
          top: padding + aisleIndex * bandH,
          width: innerW,
          height: bandH,
          backgroundColor: BLUEPRINT.aisleBand,
          borderTop: aisleIndex > 0 ? `1px solid ${BLUEPRINT.grid}` : undefined,
          opacity: 0.6,
        }}
      />

      {/* Aisle label */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: labelX,
          top: labelY - 8,
          width: 80,
          color: BLUEPRINT.labelFaint,
          fontFamily: 'monospace',
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          zIndex: 5,
        }}
      >
        {aisle.name}
      </div>

      {/* Rack rectangles */}
      {racks.map((rack, j) => {
        const rackLeft = padding + j * slotW + (slotW - rackW) / 2;
        const rackTop = aisleTop;
        const health = getRackHealth(rack.id, healthMap);

        return (
          <RackRect
            key={rack.id}
            rack={rack}
            left={rackLeft}
            top={rackTop}
            width={rackW}
            height={rackH}
            health={health}
            selected={selectedRackId === rack.id}
            hovered={hoveredRackId === rack.id}
            onMouseEnter={() => onHover(rack.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(rack)}
          />
        );
      })}
    </>
  );
};

// ── DoorMarker ─────────────────────────────────────────────────────────────

type DoorMarkerProps = {
  side: string;
  position: number;
  containerWidth: number;
  containerHeight: number;
  padding: number;
};

const DoorMarker = ({
  side,
  position,
  containerWidth,
  containerHeight,
  padding,
}: DoorMarkerProps) => {
  const innerW = containerWidth - padding * 2;
  const innerH = containerHeight - padding * 2;
  const doorSizePx = 40;

  let style: React.CSSProperties = {};
  if (side === 'west' || side === 'left') {
    style = {
      left: padding - 1,
      top: padding + innerH * position - doorSizePx / 2,
      width: 3,
      height: doorSizePx,
      backgroundColor: BLUEPRINT.door,
    };
  } else if (side === 'east' || side === 'right') {
    style = {
      left: padding + innerW - 2,
      top: padding + innerH * position - doorSizePx / 2,
      width: 3,
      height: doorSizePx,
      backgroundColor: BLUEPRINT.door,
    };
  } else if (side === 'south' || side === 'bottom') {
    style = {
      left: padding + innerW * position - doorSizePx / 2,
      top: padding + innerH - 2,
      width: doorSizePx,
      height: 3,
      backgroundColor: BLUEPRINT.door,
    };
  } else {
    // north / top
    style = {
      left: padding + innerW * position - doorSizePx / 2,
      top: padding - 1,
      width: doorSizePx,
      height: 3,
      backgroundColor: BLUEPRINT.door,
    };
  }

  return (
    <>
      <div className="absolute z-20" style={style} />
      <div
        className="absolute z-20 font-mono text-[7px] font-bold"
        style={{
          color: BLUEPRINT.door,
          left: style.left,
          top: (style.top as number) - 10,
          fontSize: 7,
        }}
      >
        DOOR
      </div>
    </>
  );
};

// ── GridLines ──────────────────────────────────────────────────────────────

type GridLinesProps = {
  containerWidth: number;
  containerHeight: number;
  padding: number;
  cellPx: number;
};

const GridLines = ({ containerWidth, containerHeight, padding, cellPx }: GridLinesProps) => {
  const innerW = containerWidth - padding * 2;
  const innerH = containerHeight - padding * 2;
  const cols = Math.floor(innerW / cellPx);
  const rows = Math.floor(innerH / cellPx);

  return (
    <>
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <div
          key={`col-${i}`}
          className="pointer-events-none absolute"
          style={{
            left: padding + i * cellPx,
            top: padding,
            width: 1,
            height: innerH,
            backgroundColor: BLUEPRINT.grid,
          }}
        />
      ))}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <div
          key={`row-${i}`}
          className="pointer-events-none absolute"
          style={{
            left: padding,
            top: padding + i * cellPx,
            width: innerW,
            height: 1,
            backgroundColor: BLUEPRINT.grid,
          }}
        />
      ))}
    </>
  );
};

// ── RackDetailPanel ────────────────────────────────────────────────────────

type RackDetailPanelProps = {
  rack: Rack;
  health: RackState | null;
  onNavigate: () => void;
  onClose: () => void;
};

const RackDetailPanel = ({ rack, health, onNavigate, onClose }: RackDetailPanelProps) => {
  const state = health?.state ?? 'UNKNOWN';
  const color = HEALTH_COLOR[state] ?? HEALTH_COLOR.UNKNOWN;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4"
      style={{
        borderColor: `${color}50`,
        backgroundColor: '#060e1a',
        color: BLUEPRINT.label,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold" style={{ color: BLUEPRINT.label }}>
            {rack.name}
          </p>
          <p className="font-mono text-[10px]" style={{ color: BLUEPRINT.labelFaint }}>
            {rack.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {state}
          </span>
          <button
            onClick={onClose}
            className="rounded border px-2 py-0.5 text-[10px]"
            style={{ borderColor: BLUEPRINT.grid, color: BLUEPRINT.labelFaint }}
          >
            ✕
          </button>
        </div>
      </div>

      {health?.metrics && (
        <div className="grid grid-cols-2 gap-2">
          {(health.metrics.temperature ?? 0) > 0 && (
            <div
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: '#0d1e35', border: `1px solid ${BLUEPRINT.grid}` }}
            >
              <div
                className="flex items-center gap-1 text-[10px]"
                style={{ color: BLUEPRINT.labelFaint }}
              >
                <Thermometer className="h-3 w-3 text-blue-400" />
                Temp
              </div>
              <p className="text-base font-bold" style={{ color: BLUEPRINT.label }}>
                {Math.round(health.metrics.temperature ?? 0)}°C
              </p>
            </div>
          )}
          {(health.metrics.power ?? 0) > 0 && (
            <div
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: '#0d1e35', border: `1px solid ${BLUEPRINT.grid}` }}
            >
              <div
                className="flex items-center gap-1 text-[10px]"
                style={{ color: BLUEPRINT.labelFaint }}
              >
                <Zap className="h-3 w-3 text-yellow-400" />
                Power
              </div>
              <p className="text-base font-bold" style={{ color: BLUEPRINT.label }}>
                {((health.metrics.power ?? 0) / 1000).toFixed(1)} kW
              </p>
            </div>
          )}
        </div>
      )}

      {health?.nodes && Object.keys(health.nodes).length > 0 && (
        <div>
          <p
            className="mb-1.5 text-[9px] font-bold tracking-wider uppercase"
            style={{ color: BLUEPRINT.labelFaint }}
          >
            Nodes ({Object.keys(health.nodes).length})
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(health.nodes)
              .slice(0, 32)
              .map(([node, ns]) => {
                const s = (ns as { state?: string }).state ?? 'UNKNOWN';
                return (
                  <div
                    key={node}
                    title={`${node}: ${s}`}
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: `${HEALTH_COLOR[s] ?? HEALTH_COLOR.UNKNOWN}90` }}
                  />
                );
              })}
          </div>
        </div>
      )}

      <button
        onClick={onNavigate}
        className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        View full rack
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV5 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<RackState | null>(null);
  const [hoveredRackId, setHoveredRackId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [loading, setLoading] = useState(true);

  const PADDING = 40;
  const ASPECT = 0.55; // height / width ratio for the floor plan

  const loadRoomHealth = async (id: string) => {
    try {
      const state = await api.getRoomState(id);
      const map: Record<string, string> = {};
      Object.entries(state?.racks ?? {}).forEach(([rackId, s]) => {
        map[rackId] = typeof s === 'string' ? s : ((s as { state?: string })?.state ?? 'UNKNOWN');
      });
      setHealthMap(map);
    } catch {
      /* ignore */
    }
  };

  // Observe container width for responsive scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const load = async () => {
      try {
        const roomData = await api.getRoomLayout(roomId);
        if (active) {
          setRoom(roomData);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || loading) return;
    let active = true;
    const poll = async () => {
      if (active) await loadRoomHealth(roomId);
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId, loading]);

  useEffect(() => {
    if (!selectedRack) return;
    let active = true;
    const fetchHealth = async () => {
      try {
        const data = await api.getRackState(selectedRack.id, true);
        if (active) setSelectedHealth(data);
      } catch {
        if (active) setSelectedHealth(null);
      }
    };
    fetchHealth();
    return () => {
      active = false;
    };
  }, [selectedRack]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
      </div>
    );

  if (!room)
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">Room not found</div>
    );

  const allRacks = [
    ...(room.aisles?.flatMap((a) => a.racks ?? []) ?? []),
    ...(room.standalone_racks ?? []),
  ];

  const summary = allRacks.reduce(
    (acc, rack) => {
      const s = healthMap[rack.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const containerHeight = containerWidth * ASPECT;
  const gridCellPx = 28;

  const allAisles: Aisle[] = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];
  const totalAisles = Math.max(allAisles.length, 1);

  const doorSide = room.layout?.door?.side ?? 'west';
  const doorPosition = room.layout?.door?.position ?? 0.5;

  const hoveredRack = hoveredRackId ? (allRacks.find((r) => r.id === hoveredRackId) ?? null) : null;

  const handleSelect = (rack: Rack) => {
    setSelectedRack((prev) => (prev?.id === rack.id ? null : rack));
  };

  const handleHover = (rackId: string | null, evt?: React.MouseEvent) => {
    setHoveredRackId(rackId);
    if (rackId && evt && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
    } else {
      setTooltipPos(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-xs">
            <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">{room.name}</span>
          </nav>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{room.name}</h2>
          <p className="text-xs" style={{ color: BLUEPRINT.labelFaint }}>
            Blueprint · {totalAisles} aisles · {allRacks.length} racks
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Health summary */}
          <div className="flex items-center gap-2 text-[10px]">
            {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const)
              .filter((s) => (summary[s] ?? 0) > 0)
              .map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1"
                  style={{ color: BLUEPRINT.label }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: HEALTH_COLOR[s] }}
                  />
                  {summary[s]} {s}
                </span>
              ))}
          </div>

          {/* Variant switcher */}
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {VARIANTS.map((v) => (
              <button
                key={v.label}
                onClick={() => navigate(`/cosmos/views/${v.path}/${roomId}`)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  v.path === 'room-v5'
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => roomId && loadRoomHealth(roomId)}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600 dark:border-gray-700"
            title="Refresh"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Blueprint floor plan */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          height: containerHeight,
          backgroundColor: BLUEPRINT.bg,
          border: `3px solid ${BLUEPRINT.wallStroke}`,
          boxShadow: `0 0 40px ${BLUEPRINT.wallStroke}30`,
        }}
        onMouseMove={(e) => {
          if (hoveredRackId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
      >
        {/* Grid lines */}
        <GridLines
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          padding={PADDING}
          cellPx={gridCellPx}
        />

        {/* Room inner wall outline */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: PADDING,
            top: PADDING,
            right: PADDING,
            bottom: PADDING,
            border: `1px solid ${BLUEPRINT.wall}`,
          }}
        />

        {/* Door */}
        <DoorMarker
          side={doorSide}
          position={doorPosition}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          padding={PADDING}
        />

        {/* Aisles */}
        {allAisles.map((aisle, i) => (
          <AisleFloor
            key={aisle.id}
            aisle={aisle}
            aisleIndex={i}
            totalAisles={totalAisles}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            healthMap={healthMap}
            selectedRackId={selectedRack?.id ?? null}
            hoveredRackId={hoveredRackId}
            onHover={(rackId) => handleHover(rackId)}
            onSelect={handleSelect}
            padding={PADDING}
          />
        ))}

        {/* Compass */}
        <CompassRose />

        {/* Scale indicator */}
        <div
          className="absolute bottom-3 left-4 font-mono text-[8px]"
          style={{ color: BLUEPRINT.labelFaint }}
        >
          {room.layout?.size?.width
            ? `Scale: room ${room.layout.size.width}m × ${room.layout.size.height ?? '?'}m`
            : 'Floor plan (auto-layout)'}
        </div>

        {/* Hover tooltip */}
        {hoveredRack && tooltipPos && (
          <RackTooltip
            rack={hoveredRack}
            health={getRackHealth(hoveredRack.id, healthMap)}
            x={tooltipPos.x}
            y={tooltipPos.y}
          />
        )}
      </div>

      {/* Rack detail panel */}
      {selectedRack && (
        <div className="w-full xl:w-80">
          <RackDetailPanel
            rack={selectedRack}
            health={selectedHealth}
            onNavigate={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
            onClose={() => setSelectedRack(null)}
          />
        </div>
      )}
    </div>
  );
};
