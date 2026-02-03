import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Catalog, Device, DeviceTemplate, Room, RoomSummary, SlurmRoomNodes } from '../types';
import { api } from '../services/api';
import { HUDTooltip } from '../components/RackVisualizer';

type HoverPayload = {
  node: string;
  status: string;
  severity: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
  partitions: string[];
  rackName: string;
  deviceName: string;
};

const expandPattern = (pattern: string): string[] => {
  const match = pattern.match(/^(.*)\[(\d+)-(\d+)\](.*)$/);
  if (!match) return [pattern];
  const [, prefix, startStr, endStr, suffix] = match;
  const start = Number.parseInt(startStr, 10);
  const end = Number.parseInt(endStr, 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return [pattern];
  const width = Math.max(startStr.length, endStr.length);
  const rangeMin = Math.min(start, end);
  const rangeMax = Math.max(start, end);
  const nodes: string[] = [];
  for (let value = rangeMin; value <= rangeMax; value += 1) {
    nodes.push(`${prefix}${String(value).padStart(width, '0')}${suffix}`);
  }
  return nodes;
};

const buildSlotMap = (device: Device, template?: DeviceTemplate): Record<number, string> => {
  const instance = device.instance || device.nodes;
  if (!instance) return {};

  // Handle explicit object mapping (e.g., {1: "node1", 2: "node2"})
  if (typeof instance === 'object' && !Array.isArray(instance)) {
    return Object.entries(instance).reduce<Record<number, string>>((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[Number(key)] = value;
      }
      return acc;
    }, {});
  }

  if (!template) return {};
  const slotOrder = template.layout.matrix.flat().filter((slot) => slot > 0);

  // Handle array or string pattern
  const expanded = Array.isArray(instance) ? instance : expandPattern(instance);

  return slotOrder.reduce<Record<number, string>>((acc, slot, idx) => {
    if (expanded[idx]) acc[slot] = expanded[idx];
    return acc;
  }, {});
};

const severityColor = (severity: HoverPayload['severity']) => {
  if (severity === 'CRIT') return 'bg-status-crit';
  if (severity === 'WARN') return 'bg-status-warn';
  if (severity === 'OK') return 'bg-status-ok';
  return 'bg-gray-600/50';
};

export const SlurmRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [slurmNodes, setSlurmNodes] = useState<SlurmRoomNodes | null>(null);
  const [refreshMs, setRefreshMs] = useState(30000);
  const [slurmRoles, setSlurmRoles] = useState<string[]>(['compute', 'visu']);
  const [includeUnlabeled, setIncludeUnlabeled] = useState(false);
  const [hover, setHover] = useState<{ payload: HoverPayload; x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    const loadRooms = async () => {
      try {
        const data = await api.getRooms();
        if (active) {
          setRooms(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadRooms();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (roomId || rooms.length === 0) return;
    navigate(`/slurm/room/${rooms[0].id}`, { replace: true });
  }, [roomId, rooms, navigate]);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const cfg = await api.getConfig();
        const nextRefresh = Number(cfg?.refresh?.room_state_seconds) || 30;
        const roles = Array.isArray(cfg?.plugins?.slurm?.roles) ? cfg.plugins.slurm?.roles : undefined;
        if (active) {
          setRefreshMs(Math.max(10, nextRefresh) * 1000);
          if (roles && roles.length > 0) {
            setSlurmRoles(roles.map((role) => role.toLowerCase()));
          }
          if (typeof cfg?.plugins?.slurm?.include_unlabeled === 'boolean') {
            setIncludeUnlabeled(cfg.plugins.slurm.include_unlabeled);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const loadData = async () => {
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
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
    const interval = setInterval(loadData, refreshMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId, refreshMs]);

  const templatesById = useMemo(() => {
    const map = new Map<string, DeviceTemplate>();
    catalog?.device_templates.forEach((template) => {
      map.set(template.id, template);
    });
    return map;
  }, [catalog]);

  const aisles = useMemo(() => {
    if (!room) return [];
    const allowedRoles = slurmRoles;
    const filterRack = (rack: Room['aisles'][number]['racks'][number]) => {
      return rack.devices.some((device) => {
        const template = templatesById.get(device.template_id);
        const role = template?.role?.toLowerCase();
        if (!role && !includeUnlabeled) return false;
        if (role && !allowedRoles.includes(role)) return false;
        const slotMap = buildSlotMap(device, template);
        return Object.values(slotMap).length > 0;
      });
    };

    const aisleItems = room.aisles
      .map((aisle) => {
        const racks = aisle.racks.filter(filterRack);
        return racks.length > 0 ? { ...aisle, racks } : null;
      })
      .filter(Boolean) as Room['aisles'];

    const standaloneRacks = room.standalone_racks.filter(filterRack);
    if (standaloneRacks.length > 0) {
      aisleItems.push({
        id: 'standalone',
        name: 'Standalone',
        racks: standaloneRacks,
      });
    }

    return aisleItems;
  }, [room, templatesById, slurmRoles, includeUnlabeled]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.3em] text-[var(--color-accent)] uppercase">
            Slurm Wallboard
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text-base)]">
            {room?.name || 'Select a room'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-2 text-sm"
            value={roomId || ''}
            onChange={(event) => navigate(`/slurm/room/${event.target.value}`)}
          >
            {rooms.map((roomItem) => (
              <option key={roomItem.id} value={roomItem.id}>
                {roomItem.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-2 text-xs font-semibold text-[var(--color-text-base)]">
            <span className="bg-status-ok h-2 w-2 rounded-full"></span>
            OK
            <span className="bg-status-warn h-2 w-2 rounded-full"></span>
            WARN
            <span className="bg-status-crit h-2 w-2 rounded-full"></span>
            CRIT
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-[var(--color-border)]/40 bg-[var(--color-bg-panel)]/40 p-6">
        <div className="space-y-8">
          {aisles.map((aisle) => (
            <div key={aisle.id} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[var(--color-text-muted)] uppercase">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]/50"></span>
                {aisle.name}
              </div>
              <div className="flex flex-wrap items-end gap-8">
                {aisle.racks.map((rack) => {
                  const rackHeight = rack.u_height || 42;
                  const devices = [...(rack.devices || [])].sort(
                    (a, b) => a.u_position - b.u_position
                  );
                  return (
                    <div key={rack.id} className="flex flex-col items-center gap-2">
                      <div className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                        {rack.name}
                      </div>
                      <div
                        className="relative grid w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-1"
                        style={{
                          gridTemplateRows: `repeat(${rackHeight}, minmax(0, 1fr))`,
                          height: `${rackHeight * 14}px`,
                        }}
                      >
                        {devices.map((device) => {
                          const template = templatesById.get(device.template_id);
                          if (!template) return null;
                          const role = template.role?.toLowerCase();
                          if (!role && !includeUnlabeled) return null;
                          if (role && !slurmRoles.includes(role)) return null;
                          const slotMap = buildSlotMap(device, template);
                          if (Object.keys(slotMap).length === 0) return null;
                          const start = Math.max(
                            1,
                            rackHeight - (device.u_position + template.u_height) + 1
                          );
                          return (
                            <div
                              key={device.id}
                              className="rounded-sm border border-[var(--color-border)]/40 bg-[var(--color-node-surface)]/30 p-[1px]"
                              style={{
                                gridRow: `${start} / span ${template.u_height}`,
                              }}
                            >
                              <div
                                className="grid h-full w-full gap-[2px]"
                                style={{
                                  gridTemplateRows: `repeat(${template.layout.rows}, 1fr)`,
                                  gridTemplateColumns: `repeat(${template.layout.cols}, 1fr)`,
                                }}
                              >
                                {template.layout.matrix.flat().map((slot, idx) => {
                                  const nodeName = slotMap[slot];
                                  const nodeState = nodeName
                                    ? slurmNodes?.nodes[nodeName]
                                    : undefined;
                                  const severity = nodeState?.severity || 'UNKNOWN';
                                  const status = nodeState?.status || 'unknown';
                                  const partitions = nodeState?.partitions || [];
                                  return (
                                    <div
                                      key={`${device.id}-${idx}`}
                                      className={`h-full w-full rounded-[2px] border border-black/10 ${severityColor(
                                        severity
                                      )} ${nodeName ? 'cursor-help' : 'opacity-30'}`}
                                      onMouseEnter={(event) => {
                                        if (!nodeName) return;
                                        setHover({
                                          payload: {
                                            node: nodeName,
                                            status,
                                            severity,
                                            partitions,
                                            rackName: rack.name,
                                            deviceName: device.name,
                                          },
                                          x: event.clientX,
                                          y: event.clientY,
                                        });
                                      }}
                                      onMouseMove={(event) => {
                                        if (!nodeName) return;
                                        setHover((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                x: event.clientX,
                                                y: event.clientY,
                                              }
                                            : prev
                                        );
                                      }}
                                      onMouseLeave={() => setHover(null)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hover && (
        <HUDTooltip
          title={hover.payload.node}
          subtitle="Node"
          status={hover.payload.severity}
          details={[
            { label: 'Rack', value: hover.payload.rackName },
            { label: 'Device', value: hover.payload.deviceName },
            {
              label: 'Status',
              value: hover.payload.status.toUpperCase(),
              italic: true,
            },
            {
              label: 'Partitions',
              value: hover.payload.partitions.length ? hover.payload.partitions.join(', ') : 'N/A',
              italic: true,
            },
          ]}
          mousePos={{ x: hover.x, y: hover.y }}
        />
      )}
    </div>
  );
};
