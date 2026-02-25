import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { HUDTooltip } from '../../../components/RackVisualizer';
import { api } from '../../../services/api';
import type {
  Catalog,
  Device,
  DeviceTemplate,
  Room,
  RoomSummary,
  SlurmRoomNodes,
} from '../../../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const expandPattern = (pattern: string): string[] => {
  const match = pattern.match(/^(.*)\[(\d+)-(\d+)\](.*)$/);
  if (!match) return [pattern];
  const [, prefix, startStr, endStr, suffix] = match;
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);
  if (isNaN(start) || isNaN(end)) return [pattern];
  const w = Math.max(startStr.length, endStr.length);
  const result: string[] = [];
  for (let v = Math.min(start, end); v <= Math.max(start, end); v++) {
    result.push(`${prefix}${String(v).padStart(w, '0')}${suffix}`);
  }
  return result;
};

const buildSlotMap = (device: Device, template?: DeviceTemplate): Record<number, string> => {
  const instance = device.instance || device.nodes;
  if (!instance) return {};
  if (typeof instance === 'object' && !Array.isArray(instance)) {
    return Object.entries(instance as Record<string, string>).reduce<Record<number, string>>(
      (acc, [k, v]) => {
        if (typeof v === 'string') acc[Number(k)] = v;
        return acc;
      },
      {}
    );
  }
  if (!template) return {};
  const layout =
    template.type === 'storage' && template.disk_layout ? template.disk_layout : template.layout;
  if (!layout?.matrix) return {};
  const slotOrder = layout.matrix.flat().filter((s) => s > 0);
  const expanded = Array.isArray(instance) ? instance : expandPattern(instance as string);
  return slotOrder.reduce<Record<number, string>>((acc, slot, idx) => {
    if (expanded[idx]) acc[slot] = expanded[idx];
    return acc;
  }, {});
};

// ── HoverPayload type ────────────────────────────────────────────────────────

type HoverPayload = {
  node: string;
  status: string;
  severity: string;
  partitions: string[];
  rackName: string;
  deviceName: string;
  x: number;
  y: number;
};

// ── NodeCell — colored cell per Slurm node ───────────────────────────────────

type NodeCellProps = {
  slot: number;
  slotMap: Record<number, string>;
  slurmNodes: SlurmRoomNodes | null;
  rackName: string;
  deviceName: string;
  onHover: (p: HoverPayload | null) => void;
};

const NodeCell = ({ slot, slotMap, slurmNodes, rackName, deviceName, onHover }: NodeCellProps) => {
  const nodeName = slotMap[slot];
  const ns = nodeName ? slurmNodes?.nodes[nodeName] : undefined;
  const severity = ns?.severity ?? 'UNKNOWN';
  const status = ns?.status ?? 'unknown';
  const partitions = ns?.partitions ?? [];
  const color = SEV_COLOR[severity] ?? SEV_COLOR.UNKNOWN;

  return (
    <div
      className="h-full w-full rounded-[2px] border border-black/10 transition-transform hover:scale-110"
      style={{
        backgroundColor: color,
        opacity: nodeName ? 1 : 0.2,
        cursor: nodeName ? 'help' : 'default',
      }}
      onMouseEnter={(e) => {
        if (!nodeName) return;
        onHover({
          node: nodeName,
          status,
          severity,
          partitions,
          rackName,
          deviceName,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseMove={(e) => {
        if (!nodeName) return;
        onHover({
          node: nodeName,
          status,
          severity,
          partitions,
          rackName,
          deviceName,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseLeave={() => onHover(null)}
    />
  );
};

// ── DeviceBlock — one device in the rack grid ────────────────────────────────

type DeviceBlockProps = {
  device: Device;
  template: DeviceTemplate;
  rackHeight: number;
  slurmNodes: SlurmRoomNodes | null;
  rackName: string;
  onHover: (p: HoverPayload | null) => void;
};

const DeviceBlock = ({
  device,
  template,
  rackHeight,
  slurmNodes,
  rackName,
  onHover,
}: DeviceBlockProps) => {
  const slotMap = buildSlotMap(device, template);
  if (Object.keys(slotMap).length === 0) return null;

  const layout =
    template.type === 'storage' && template.disk_layout ? template.disk_layout : template.layout;
  if (!layout) return null;

  // CSS grid row: rack is top=U42 bottom=U1 (grid-row 1 = top)
  const gridRowStart = rackHeight - (device.u_position + template.u_height) + 2;
  const gridRowSpan = template.u_height;

  return (
    <div
      className="rounded-sm border border-white/10 bg-white/5 p-[1px] dark:border-white/5 dark:bg-white/5"
      style={{ gridRow: `${gridRowStart} / span ${gridRowSpan}` }}
    >
      <div
        className="grid h-full w-full gap-[2px]"
        style={{
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        }}
      >
        {layout.matrix.flat().map((slot, idx) => (
          <NodeCell
            key={idx}
            slot={slot}
            slotMap={slotMap}
            slurmNodes={slurmNodes}
            rackName={rackName}
            deviceName={device.name}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
};

// ── RackColumn — one rack in the wallboard ───────────────────────────────────

type RackColumnProps = {
  rack: Room['aisles'][0]['racks'][0];
  templatesById: Map<string, DeviceTemplate>;
  slurmNodes: SlurmRoomNodes | null;
  slurmRoles: string[];
  includeUnlabeled: boolean;
  onHover: (p: HoverPayload | null) => void;
};

const RackColumn = ({
  rack,
  templatesById,
  slurmNodes,
  slurmRoles,
  includeUnlabeled,
  onHover,
}: RackColumnProps) => {
  const rackHeight = rack.u_height ?? 42;

  const visibleDevices = rack.devices
    .slice()
    .sort((a, b) => a.u_position - b.u_position)
    .filter((dev) => {
      const tpl = templatesById.get(dev.template_id);
      if (!tpl) return false;
      const role = tpl.role?.toLowerCase();
      if (!role && !includeUnlabeled) return false;
      if (role && !slurmRoles.includes(role)) return false;
      return Object.keys(buildSlotMap(dev, tpl)).length > 0;
    });

  if (visibleDevices.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-mono text-[10px] font-semibold text-gray-500 dark:text-gray-400">
        {rack.id}
      </span>
      <div
        className="relative grid w-[160px] overflow-hidden rounded-md border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-950"
        style={{
          gridTemplateRows: `repeat(${rackHeight}, minmax(0, 1fr))`,
          height: `${rackHeight * 14}px`,
        }}
      >
        {visibleDevices.map((dev) => {
          const tpl = templatesById.get(dev.template_id)!;
          return (
            <DeviceBlock
              key={dev.id}
              device={dev}
              template={tpl}
              rackHeight={rackHeight}
              slurmNodes={slurmNodes}
              rackName={rack.name}
              onHover={onHover}
            />
          );
        })}
      </div>
      <span className="max-w-[160px] truncate text-center text-[9px] text-gray-400">
        {rack.name}
      </span>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────

export const CosmosSlurmWallboardPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [slurmNodes, setSlurmNodes] = useState<SlurmRoomNodes | null>(null);
  const [slurmRoles, setSlurmRoles] = useState<string[]>(['compute', 'visu']);
  const [includeUnlabeled, setIncludeUnlabeled] = useState(false);
  const [refreshMs, setRefreshMs] = useState(30000);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<HoverPayload | null>(null);

  // Load rooms + config once
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [roomsData, cfg] = await Promise.all([api.getRooms(), api.getConfig()]);
        if (!active) return;
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        const nextRefresh = Number(cfg?.refresh?.room_state_seconds) || 30;
        setRefreshMs(Math.max(10, nextRefresh) * 1000);
        const roles = cfg?.plugins?.slurm?.roles;
        if (Array.isArray(roles) && roles.length > 0) {
          setSlurmRoles(roles.map((r: string) => r.toLowerCase()));
        }
        if (typeof cfg?.plugins?.slurm?.include_unlabeled === 'boolean') {
          setIncludeUnlabeled(cfg.plugins.slurm.include_unlabeled);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Auto-redirect to first room if none selected
  useEffect(() => {
    if (roomId || rooms.length === 0) return;
    navigate(`/cosmos/slurm/wallboard-v2/${rooms[0].id}`, { replace: true });
  }, [roomId, rooms, navigate]);

  // Load room data + poll Slurm
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const load = async () => {
      try {
        const [roomData, catalogData, slurmData] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getCatalog(),
          api.getSlurmRoomNodes(roomId),
        ]);
        if (!active) return;
        setRoom(roomData);
        setCatalog(catalogData);
        setSlurmNodes(slurmData);
        setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, refreshMs);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId, refreshMs]);

  const templatesById = useMemo(() => {
    const map = new Map<string, DeviceTemplate>();
    catalog?.device_templates.forEach((t) => map.set(t.id, t));
    return map;
  }, [catalog]);

  const aisles = useMemo(() => {
    if (!room) return [];
    const filterRack = (rack: Room['aisles'][0]['racks'][0]) =>
      rack.devices.some((dev) => {
        const tpl = templatesById.get(dev.template_id);
        const role = tpl?.role?.toLowerCase();
        if (!role && !includeUnlabeled) return false;
        if (role && !slurmRoles.includes(role)) return false;
        return Object.keys(buildSlotMap(dev, tpl)).length > 0;
      });

    const result = room.aisles
      .map((a) => {
        const racks = a.racks.filter(filterRack);
        return racks.length > 0 ? { ...a, racks } : null;
      })
      .filter(Boolean) as Room['aisles'];

    const standalone = (room.standalone_racks ?? []).filter(filterRack);
    if (standalone.length > 0)
      result.push({ id: 'standalone', name: 'Standalone', racks: standalone });

    return result;
  }, [room, templatesById, slurmRoles, includeUnlabeled]);

  // Summary counts
  const nodes = slurmNodes?.nodes ?? {};
  const critCount = Object.values(nodes).filter((n) => n.severity === 'CRIT').length;
  const warnCount = Object.values(nodes).filter((n) => n.severity === 'WARN').length;
  const totalNodes = Object.keys(nodes).length;

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-sm">
            <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{room?.name ?? roomId}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">Slurm Wallboard</span>
          </nav>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {room?.name ?? 'Slurm Wallboard'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Summary badges */}
          {critCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
              {critCount} CRIT
            </span>
          )}
          {warnCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              {warnCount} WARN
            </span>
          )}
          <span className="text-xs text-gray-400">{totalNodes} nodes</span>

          {/* Room selector */}
          <select
            value={roomId ?? ''}
            onChange={(e) => navigate(`/cosmos/slurm/wallboard-v2/${e.target.value}`)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={() => {
              if (roomId) {
                api
                  .getSlurmRoomNodes(roomId)
                  .then(setSlurmNodes)
                  .catch(() => {});
              }
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
          { label: 'WARN / Mixed', color: SEV_COLOR.WARN },
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
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
          </div>
        ) : aisles.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            No Slurm nodes found in this room
          </div>
        ) : (
          <div className="space-y-8">
            {aisles.map((aisle) => (
              <div key={aisle.id}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="bg-brand-500 h-2 w-2 rounded-full opacity-60" />
                  <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    {aisle.name}
                  </h3>
                </div>
                <div className="flex flex-wrap items-end gap-6">
                  {aisle.racks.map((rack) => (
                    <RackColumn
                      key={rack.id}
                      rack={rack}
                      templatesById={templatesById}
                      slurmNodes={slurmNodes}
                      slurmRoles={slurmRoles}
                      includeUnlabeled={includeUnlabeled}
                      onHover={setHover}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HUD Tooltip */}
      {hover && (
        <HUDTooltip
          title={hover.node}
          subtitle="Slurm Node"
          status={hover.severity}
          details={[
            { label: 'Rack', value: hover.rackName },
            { label: 'Device', value: hover.deviceName },
            { label: 'Status', value: hover.status.toUpperCase(), italic: true },
            {
              label: 'Partitions',
              value: hover.partitions.length ? hover.partitions.join(', ') : 'N/A',
              italic: true,
            },
          ]}
          mousePos={{ x: hover.x, y: hover.y }}
        />
      )}
    </div>
  );
};
