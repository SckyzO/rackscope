import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, Aisle } from '../../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const BP = {
  bg: '#060e1a',
  wall: '#1e4d8c',
  wallStroke: '#2563eb',
  grid: '#0d2a52',
  aisleBand: '#0a1f3a',
  label: '#64b5f6',
  labelFaint: '#3b6ea8',
  door: '#38bdf8',
  compass: '#60a5fa',
  compassFaint: '#1e3a5c',
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

const RACK_W = 50;
const PX_PER_U = 5;
const PADDING = 48;

// ── Helpers ────────────────────────────────────────────────────────────────

const getRackHealth = (rackId: string, hm: Record<string, string>): string =>
  hm[rackId] ?? 'UNKNOWN';

// ── CompassRose ────────────────────────────────────────────────────────────

const CompassRose = () => (
  <div
    className="pointer-events-none absolute top-4 right-4 flex flex-col items-center"
    style={{ color: BP.compass }}
  >
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 19,16 16,14 13,16" fill={BP.compass} />
      <polygon points="16,30 13,16 16,18 19,16" fill={BP.compassFaint} />
      <circle cx="16" cy="16" r="2" fill={BP.compass} />
    </svg>
    <span className="mt-0.5 font-mono text-[8px] font-bold tracking-widest">N</span>
  </div>
);

// ── GridLines ──────────────────────────────────────────────────────────────

type GridLinesProps = {
  containerWidth: number;
  containerHeight: number;
  cellPx: number;
};

const GridLines = ({ containerWidth, containerHeight, cellPx }: GridLinesProps) => {
  const innerW = containerWidth - PADDING * 2;
  const innerH = containerHeight - PADDING * 2;
  const cols = Math.floor(innerW / cellPx);
  const rows = Math.floor(innerH / cellPx);
  return (
    <>
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <div
          key={`c${i}`}
          className="pointer-events-none absolute"
          style={{
            left: PADDING + i * cellPx,
            top: PADDING,
            width: 1,
            height: innerH,
            backgroundColor: BP.grid,
          }}
        />
      ))}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <div
          key={`r${i}`}
          className="pointer-events-none absolute"
          style={{
            left: PADDING,
            top: PADDING + i * cellPx,
            width: innerW,
            height: 1,
            backgroundColor: BP.grid,
          }}
        />
      ))}
    </>
  );
};

// ── DoorArc ────────────────────────────────────────────────────────────────

type DoorArcProps = {
  side: string;
  position: number;
  containerWidth: number;
  containerHeight: number;
};

const DoorArc = ({ side, position, containerWidth, containerHeight }: DoorArcProps) => {
  const innerW = containerWidth - PADDING * 2;
  const innerH = containerHeight - PADDING * 2;
  const doorSize = 40;
  const r = doorSize;

  let x = 0;
  let y = 0;
  let arcPath = '';
  let lineStyle: React.CSSProperties = {};

  if (side === 'west' || side === 'left') {
    x = PADDING;
    y = PADDING + innerH * position - doorSize / 2;
    lineStyle = { left: x - 1, top: y, width: 3, height: doorSize, backgroundColor: BP.door };
    arcPath = `M ${x} ${y} Q ${x + r} ${y} ${x + r} ${y + doorSize / 2} Q ${x + r} ${y + doorSize} ${x} ${y + doorSize}`;
  } else if (side === 'east' || side === 'right') {
    x = PADDING + innerW;
    y = PADDING + innerH * position - doorSize / 2;
    lineStyle = { left: x - 2, top: y, width: 3, height: doorSize, backgroundColor: BP.door };
    arcPath = `M ${x} ${y} Q ${x - r} ${y} ${x - r} ${y + doorSize / 2} Q ${x - r} ${y + doorSize} ${x} ${y + doorSize}`;
  } else if (side === 'south' || side === 'bottom') {
    x = PADDING + innerW * position - doorSize / 2;
    y = PADDING + innerH;
    lineStyle = { left: x, top: y - 2, width: doorSize, height: 3, backgroundColor: BP.door };
    arcPath = `M ${x} ${y} Q ${x} ${y - r} ${x + doorSize / 2} ${y - r} Q ${x + doorSize} ${y - r} ${x + doorSize} ${y}`;
  } else {
    x = PADDING + innerW * position - doorSize / 2;
    y = PADDING;
    lineStyle = { left: x, top: y - 1, width: doorSize, height: 3, backgroundColor: BP.door };
    arcPath = `M ${x} ${y} Q ${x} ${y + r} ${x + doorSize / 2} ${y + r} Q ${x + doorSize} ${y + r} ${x + doorSize} ${y}`;
  }

  return (
    <>
      <div className="pointer-events-none absolute z-20" style={lineStyle} />
      <svg
        className="pointer-events-none absolute inset-0 z-20"
        width={containerWidth}
        height={containerHeight}
        style={{ overflow: 'visible' }}
      >
        <path d={arcPath} fill="none" stroke={BP.door} strokeWidth={1} strokeDasharray="3 2" />
      </svg>
      <div
        className="pointer-events-none absolute z-20 font-mono text-[7px] font-bold"
        style={{ color: BP.door, left: lineStyle.left, top: (lineStyle.top as number) - 11 }}
      >
        DOOR
      </div>
    </>
  );
};

// ── RackRect ───────────────────────────────────────────────────────────────

type RackRectProps = {
  rack: Rack;
  left: number;
  top: number;
  rackH: number;
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
  rackH,
  health,
  selected,
  hovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: RackRectProps) => {
  const color = HC[health] ?? HC.UNKNOWN;
  const isCrit = health === 'CRIT';
  const opacity = health === 'CRIT' ? 1 : health === 'OK' ? 0.6 : 0.75;

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
        width: RACK_W,
        height: rackH,
        backgroundColor: `${color}${Math.round(opacity * 255)
          .toString(16)
          .padStart(2, '0')}`,
        border: `1.5px solid ${color}`,
        borderRadius: 2,
        boxShadow: selected
          ? `0 0 0 2px white, 0 0 14px ${color}80`
          : hovered
            ? `0 0 8px ${color}60`
            : isCrit
              ? `0 0 10px ${color}50`
              : undefined,
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        transform: hovered ? 'scale(1.05)' : undefined,
        zIndex: hovered || selected ? 10 : 1,
      }}
    >
      {/* horizontal slot lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: Math.min(rack.u_height, 20) }).map((_, i) => (
          <div
            key={i}
            className="w-full"
            style={{
              height: 1,
              marginTop: (rackH / Math.min(rack.u_height, 20)) * i,
              backgroundColor: `${color}20`,
            }}
          />
        ))}
      </div>
      {/* rack ID below */}
      <span
        className="absolute right-0 -bottom-4 left-0 truncate text-center font-mono text-[7px]"
        style={{ color: HC[health] ?? HC.UNKNOWN, opacity: hovered ? 1 : 0.7 }}
      >
        {rack.id.split('-').pop() ?? rack.id}
      </span>
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
  const color = HC[health] ?? HC.UNKNOWN;
  return (
    <div
      className="pointer-events-none absolute z-50 rounded-lg border px-2.5 py-1.5 text-xs"
      style={{
        left: x + 12,
        top: y - 36,
        backgroundColor: '#0d1e35',
        borderColor: `${color}60`,
        color: BP.label,
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="font-mono font-bold">{rack.id}</span>
      <span
        className="ml-2 rounded px-1 py-0.5 font-mono text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {health}
      </span>
      <span className="ml-2 font-mono text-[9px]" style={{ color: BP.labelFaint }}>
        {rack.u_height}U · {rack.devices.length} dev
      </span>
    </div>
  );
};

// ── AisleBand ──────────────────────────────────────────────────────────────

type AisleBandProps = {
  aisle: Aisle;
  aisleIndex: number;
  totalAisles: number;
  containerWidth: number;
  containerHeight: number;
  healthMap: Record<string, string>;
  selectedRackId: string | null;
  hoveredRackId: string | null;
  onHover: (rackId: string | null) => void;
  onNavigate: (rackId: string) => void;
};

const AisleBand = ({
  aisle,
  aisleIndex,
  totalAisles,
  containerWidth,
  containerHeight,
  healthMap,
  selectedRackId,
  hoveredRackId,
  onHover,
  onNavigate,
}: AisleBandProps) => {
  const innerW = containerWidth - PADDING * 2;
  const innerH = containerHeight - PADDING * 2;
  const bandH = innerH / totalAisles;

  const bandTop = PADDING + aisleIndex * bandH;
  const racks = aisle.racks ?? [];
  if (racks.length === 0) return null;

  const spacing = innerW / (racks.length + 1);

  return (
    <>
      {/* Band background */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: PADDING,
          top: bandTop,
          width: innerW,
          height: bandH,
          backgroundColor: BP.aisleBand,
          borderTop: aisleIndex > 0 ? `1px solid ${BP.grid}` : undefined,
          opacity: 0.5,
        }}
      />

      {/* Aisle label above band */}
      <div
        className="pointer-events-none absolute font-mono font-bold uppercase"
        style={{
          left: PADDING + 4,
          top: bandTop + 4,
          fontSize: 8,
          letterSpacing: '0.1em',
          color: BP.labelFaint,
          zIndex: 5,
        }}
      >
        {aisle.name}
      </div>

      {/* Racks */}
      {racks.map((rack, j) => {
        const uH = rack.u_height ?? 42;
        const rackH = Math.max(uH * PX_PER_U, 30);
        const rackLeft = PADDING + (j + 1) * spacing - RACK_W / 2;
        const rackTop = bandTop + (bandH - rackH) / 2;
        const health = getRackHealth(rack.id, healthMap);

        return (
          <RackRect
            key={rack.id}
            rack={rack}
            left={rackLeft}
            top={rackTop}
            rackH={rackH}
            health={health}
            selected={selectedRackId === rack.id}
            hovered={hoveredRackId === rack.id}
            onMouseEnter={() => onHover(rack.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onNavigate(rack.id)}
          />
        );
      })}
    </>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV5 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [hoveredRackId, setHoveredRackId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [loading, setLoading] = useState(true);

  const ASPECT = 0.52;

  useEffect(() => {
    localStorage.setItem('cosmos-room-variant', 'room-v5');
  }, []);

  // Observe container width
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

  const loadHealth = async (id: string) => {
    try {
      const state = await api.getRoomState(id);
      const map: Record<string, string> = {};
      Object.entries(state?.racks ?? {}).forEach(([rId, s]) => {
        map[rId] = typeof s === 'string' ? s : ((s as { state?: string })?.state ?? 'UNKNOWN');
      });
      setHealthMap(map);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const load = async () => {
      try {
        const roomData = await api.getRoomLayout(roomId);
        if (!active) return;
        setRoom(roomData);
        setLoading(false);
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
      if (active) await loadHealth(roomId);
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId, loading]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-400" />
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

  const allAisles: Aisle[] = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];

  const totalAisles = Math.max(allAisles.length, 1);
  const containerHeight = containerWidth * ASPECT;

  const summary = allRacks.reduce(
    (acc, rack) => {
      const s = healthMap[rack.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const doorSide = room.layout?.door?.side ?? 'west';
  const doorPosition = room.layout?.door?.position ?? 0.5;

  const hoveredRack = hoveredRackId ? (allRacks.find((r) => r.id === hoveredRackId) ?? null) : null;

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
          <p className="font-mono text-xs" style={{ color: BP.labelFaint }}>
            Blueprint Floor Plan · {totalAisles} aisles · {allRacks.length} racks
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Health summary */}
          <div className="flex items-center gap-2">
            {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const)
              .filter((s) => (summary[s] ?? 0) > 0)
              .map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 text-[10px]"
                  style={{ color: BP.label }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: HC[s] }}
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
            onClick={() => roomId && loadHealth(roomId)}
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
          backgroundColor: BP.bg,
          border: `3px solid ${BP.wallStroke}`,
          boxShadow: `0 0 40px ${BP.wallStroke}30`,
        }}
        onMouseMove={(e) => {
          if (hoveredRackId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
      >
        {/* Grid lines */}
        <GridLines containerWidth={containerWidth} containerHeight={containerHeight} cellPx={28} />

        {/* Room inner wall */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: PADDING,
            top: PADDING,
            right: PADDING,
            bottom: PADDING,
            border: `1px solid ${BP.wall}`,
          }}
        />

        {/* Door with arc */}
        <DoorArc
          side={doorSide}
          position={doorPosition}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
        />

        {/* Aisle bands + racks */}
        {allAisles.map((aisle, i) => (
          <AisleBand
            key={aisle.id}
            aisle={aisle}
            aisleIndex={i}
            totalAisles={totalAisles}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            healthMap={healthMap}
            selectedRackId={null}
            hoveredRackId={hoveredRackId}
            onHover={(rId) => {
              setHoveredRackId(rId);
              if (!rId) setTooltipPos(null);
            }}
            onNavigate={(rId) => navigate(`/cosmos/views/rack/${rId}`)}
          />
        ))}

        {/* Compass */}
        <CompassRose />

        {/* Scale label */}
        <div
          className="pointer-events-none absolute bottom-3 left-4 font-mono text-[8px]"
          style={{ color: BP.labelFaint }}
        >
          {room.layout?.size?.width
            ? `${room.layout.size.width}m × ${room.layout.size.height ?? '?'}m`
            : 'Auto-layout'}
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
    </div>
  );
};
