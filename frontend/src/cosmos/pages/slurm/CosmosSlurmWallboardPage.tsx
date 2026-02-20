import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, DeviceTemplate, SlurmRoomNodes } from '../../../types';

const SEV_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

function expandToArray(instance: unknown): string[] {
  if (!instance) return [];
  if (typeof instance === 'string') {
    const m = instance.match(/^(.*)\[(\d+)-(\d+)\]$/);
    if (m) {
      const [, prefix, start, end] = m;
      const w = start.length;
      return Array.from(
        { length: parseInt(end) - parseInt(start) + 1 },
        (_, i) => `${prefix}${String(parseInt(start) + i).padStart(w, '0')}`
      );
    }
    return [instance];
  }
  if (Array.isArray(instance)) return instance as string[];
  if (typeof instance === 'object' && instance !== null) {
    return Object.values(instance as Record<string, string>);
  }
  return [];
}

function buildSlotMap(instance: unknown): Record<number, string> {
  if (typeof instance === 'object' && !Array.isArray(instance) && instance !== null) {
    const obj = instance as Record<string | number, string>;
    const result: Record<number, string> = {};
    Object.entries(obj).forEach(([k, v]) => {
      result[Number(k)] = v;
    });
    return result;
  }
  const arr = expandToArray(instance);
  const result: Record<number, string> = {};
  arr.forEach((name, i) => {
    result[i + 1] = name;
  });
  return result;
}

export const CosmosSlurmWallboardPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [slurmData, setSlurmData] = useState<SlurmRoomNodes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    Promise.all([api.getRoomLayout(roomId), api.getCatalog()])
      .then(([roomData, cat]) => {
        setRoom(roomData);
        const dc: Record<string, DeviceTemplate> = {};
        (cat?.device_templates ?? []).forEach((t: DeviceTemplate) => {
          dc[t.id] = t;
        });
        setCatalog(dc);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await api.getSlurmRoomNodes(roomId);
        if (active) setSlurmData(data);
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId]);

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

  const nodes = slurmData?.nodes ?? {};

  const critCount = Object.values(nodes).filter((n) => n.severity === 'CRIT').length;
  const warnCount = Object.values(nodes).filter((n) => n.severity === 'WARN').length;
  const totalNodes = Object.keys(nodes).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-sm">
            <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{room.name}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">Slurm Wallboard</span>
          </nav>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {room.name} — Wallboard
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Live stats */}
          <div className="flex items-center gap-2 text-xs">
            {critCount > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
                {critCount} CRIT
              </span>
            )}
            {warnCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                {warnCount} WARN
              </span>
            )}
            <span className="text-gray-400">{totalNodes} nodes</span>
          </div>
          <button
            onClick={() => {
              api
                .getSlurmRoomNodes(roomId ?? '')
                .then(setSlurmData)
                .catch(() => {});
            }}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600 dark:border-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-xs font-semibold text-gray-400 uppercase">Legend</span>
        {[
          { label: 'OK / Idle', color: SEV_COLOR.OK },
          { label: 'WARN', color: SEV_COLOR.WARN },
          { label: 'CRIT / Down', color: SEV_COLOR.CRIT },
          { label: 'Unknown', color: SEV_COLOR.UNKNOWN },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Aisles */}
      {(room.aisles ?? []).length === 0 && (room.standalone_racks ?? []).length === 0 ? (
        <div className="flex h-32 items-center justify-center text-gray-400">
          No aisles configured
        </div>
      ) : (
        <div className="space-y-6">
          {(room.aisles ?? []).map((aisle) => (
            <div key={aisle.id}>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                {aisle.name}
              </h3>
              <div className="flex flex-wrap gap-3">
                {(aisle.racks ?? []).map((rack) => (
                  <RackWallCard key={rack.id} rack={rack} catalog={catalog} nodes={nodes} />
                ))}
              </div>
            </div>
          ))}
          {(room.standalone_racks ?? []).length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Standalone Racks
              </h3>
              <div className="flex flex-wrap gap-3">
                {(room.standalone_racks ?? []).map((rack) => (
                  <RackWallCard key={rack.id} rack={rack} catalog={catalog} nodes={nodes} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── RackWallCard — compact rack visualization ──────────────────────────────

type SlurmNodeState = {
  severity: string;
  status: string;
  statuses?: string[];
  partitions?: string[];
};

type RackWallCardProps = {
  rack: {
    id: string;
    name: string;
    u_height?: number;
    devices: Array<{
      id: string;
      name: string;
      template_id: string;
      u_position: number;
      instance?: unknown;
      nodes?: unknown;
    }>;
  };
  catalog: Record<string, DeviceTemplate>;
  nodes: Record<string, SlurmNodeState>;
};

const RackWallCard = ({ rack, catalog, nodes }: RackWallCardProps) => {
  const deviceNodes: Array<{ name: string; severity: string; status: string }> = [];

  rack.devices.forEach((dev) => {
    const tpl = catalog[dev.template_id];
    if (!tpl) return;
    const slotMap = buildSlotMap(dev.instance ?? dev.nodes);
    const layout = tpl.layout ?? tpl.disk_layout;
    if (!layout?.matrix) {
      const names = Object.values(slotMap);
      names.forEach((name) => {
        const ns = nodes[name];
        deviceNodes.push({ name, severity: ns?.severity ?? 'UNKNOWN', status: ns?.status ?? '—' });
      });
      return;
    }
    layout.matrix.flat().forEach((slot: number) => {
      if (slot <= 0) return;
      const name = slotMap[slot];
      if (!name) return;
      const ns = nodes[name];
      deviceNodes.push({ name, severity: ns?.severity ?? 'UNKNOWN', status: ns?.status ?? '—' });
    });
  });

  const rackCrit = deviceNodes.some((n) => n.severity === 'CRIT');
  const rackWarn = !rackCrit && deviceNodes.some((n) => n.severity === 'WARN');
  const borderColor = rackCrit
    ? '#ef4444'
    : rackWarn
      ? '#f59e0b'
      : deviceNodes.length > 0
        ? '#22c55e'
        : '#374151';

  return (
    <div
      className="rounded-xl border-2 bg-white p-2.5 dark:bg-gray-900"
      style={{ borderColor, minWidth: '120px' }}
    >
      <p className="mb-1.5 truncate font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300">
        {rack.id}
      </p>
      {deviceNodes.length === 0 ? (
        <div className="text-[9px] text-gray-400 italic">no Slurm nodes</div>
      ) : (
        <div className="flex flex-wrap gap-0.5">
          {deviceNodes.map((n, i) => (
            <div
              key={i}
              title={`${n.name}: ${n.status} (${n.severity})`}
              className="h-3.5 w-3.5 cursor-help rounded-sm transition-transform hover:scale-125"
              style={{ backgroundColor: SEV_COLOR[n.severity] ?? SEV_COLOR.UNKNOWN }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
