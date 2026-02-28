import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { resolveRackComponents } from '../../../utils/rackComponents';
import type {
  Rack,
  DeviceTemplate,
  RackTemplate,
  RackComponentTemplate,
  InfrastructureComponent,
  RackState,
  RackNodeState,
  Room,
} from '../../../types';

export type RoomContext = {
  roomId: string;
  roomName: string;
  aisleId?: string;
  aisleName?: string;
};

export type RackData = {
  rack: Rack | null;
  deviceCatalog: Record<string, DeviceTemplate>;
  rackTemplate: RackTemplate | null;
  health: RackState | null;
  roomCtx: RoomContext | null;
  loading: boolean;
  frontInfra: InfrastructureComponent[];
  rearInfra: InfrastructureComponent[];
  sideInfra: InfrastructureComponent[];
  nodeCounts: Record<string, number>;
  state: string;
  uHeight: number;
  nodes: Record<string, RackNodeState>;
  loadHealth: () => Promise<void>;
};

export function useRackData(rackId: string | undefined): RackData {
  const [rack, setRack] = useState<Rack | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [rackComponentTemplates, setRackComponentTemplates] = useState<
    Record<string, RackComponentTemplate>
  >({});
  const [rackTemplate, setRackTemplate] = useState<RackTemplate | null>(null);
  const [health, setHealth] = useState<RackState | null>(null);
  const [roomCtx, setRoomCtx] = useState<RoomContext | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    if (!rackId) return;
    try {
      const s = await api.getRackState(rackId, true);
      setHealth(s);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!rackId) return;
    Promise.all([api.getRack(rackId), api.getCatalog()])
      .then(([rackData, catalog]) => {
        setRack(rackData);
        const devCat: Record<string, DeviceTemplate> = {};
        (catalog?.device_templates ?? []).forEach((t: DeviceTemplate) => {
          devCat[t.id] = t;
        });
        setDeviceCatalog(devCat);
        const compCat: Record<string, RackComponentTemplate> = {};
        (catalog?.rack_component_templates ?? []).forEach((t: RackComponentTemplate) => {
          compCat[t.id] = t;
        });
        setRackComponentTemplates(compCat);
        if (rackData.template_id) {
          const tpl = (catalog?.rack_templates ?? []).find(
            (t: RackTemplate) => t.id === rackData.template_id
          );
          setRackTemplate(tpl ?? null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rackId]);

  useEffect(() => {
    if (!rack) return;
    api
      .getRooms()
      .then((rooms: Room[]) => {
        for (const room of rooms) {
          for (const aisle of room.aisles ?? []) {
            if (aisle.id === rack.aisle_id) {
              setRoomCtx({
                roomId: room.id,
                roomName: room.name,
                aisleId: aisle.id,
                aisleName: aisle.name,
              });
              return;
            }
          }
          for (const sr of room.standalone_racks ?? []) {
            if (sr.id === rack.id) {
              setRoomCtx({ roomId: room.id, roomName: room.name });
              return;
            }
          }
        }
      })
      .catch(() => {
        /* noop */
      });
  }, [rack]);

  useEffect(() => {
    if (!rackId || loading) return;
    let active = true;
    const poll = async () => {
      try {
        const s = await api.getRackState(rackId, true);
        if (active) setHealth(s);
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
  }, [rackId, loading]);

  const resolved = rackTemplate
    ? resolveRackComponents(rackTemplate.infrastructure?.rack_components, rackComponentTemplates)
    : { front: [], rear: [], side: [], main: [] };

  const baseInfra = rackTemplate?.infrastructure?.components ?? [];
  const frontInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.front_components?.length
      ? rackTemplate.infrastructure.front_components
      : baseInfra),
    ...resolved.main,
    ...resolved.front,
  ];
  const rearInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.rear_components?.length
      ? rackTemplate.infrastructure.rear_components
      : baseInfra),
    ...resolved.main,
    ...resolved.rear,
  ];
  const sideInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.side_components ?? []),
    ...resolved.side,
  ];

  const nodes = (health?.nodes ?? {}) as Record<string, RackNodeState>;
  const nodeCounts = Object.values(nodes).reduce(
    (acc, n) => {
      const s = n.state ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    rack,
    deviceCatalog,
    rackTemplate,
    health,
    roomCtx,
    loading,
    frontInfra,
    rearInfra,
    sideInfra,
    nodeCounts,
    state: health?.state ?? 'UNKNOWN',
    uHeight: rack?.u_height ?? 42,
    nodes,
    loadHealth,
  };
}
