import type {
  Site,
  Room,
  RoomSummary,
  Device,
  DeviceTemplate,
  RackTemplate,
  Rack,
  AppConfig,
  SimulatorScenario,
  ChecksLibrary,
  GlobalStats,
  PrometheusStats,
  TelemetryStats,
  ActiveAlert,
  RoomState,
  RackState,
  SimulatorOverride,
  SlurmRoomNodes,
} from '../types';

const CACHE_PREFIX = 'rackscope.cache.';
const META_KEY = 'rackscope.cache.meta';
const ERROR_KEY = 'rackscope.client.errors';
const STALE_THRESHOLD_MS = 2 * 60 * 1000;

const readJSON = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
};

const logClientError = (message: string, context?: string) => {
  const entry = { ts: Date.now(), message, context };
  const current = readJSON(ERROR_KEY) || [];
  const next = [entry, ...current].slice(0, 50);
  writeJSON(ERROR_KEY, next);
  // Also log to console for visibility.
  console.error('[rackscope]', message, context || '');
};

const markSuccess = () => {
  writeJSON(META_KEY, { lastSuccess: Date.now() });
};

const readCache = (key: string) => readJSON(`${CACHE_PREFIX}${key}`);
const writeCache = (key: string, data: unknown) => {
  if (data === null) {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return;
  }
  writeJSON(`${CACHE_PREFIX}${key}`, { ts: Date.now(), data });
};

const fetchWithCache = async <T>(url: string, cacheKey: string): Promise<T> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, url);
      const cached = readCache(cacheKey);
      if (cached?.data) return cached.data as T;
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache(cacheKey, data);
    markSuccess();
    return data as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    logClientError(message, url);
    const cached = readCache(cacheKey);
    if (cached?.data) return cached.data as T;
    throw err instanceof Error ? err : new Error('Network error');
  }
};

export const api = {
  getSites: async (): Promise<Site[]> => {
    return fetchWithCache('/api/sites', 'sites');
  },
  createSite: async (payload: { id?: string | null; name: string }) => {
    const res = await fetch('/api/topology/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/topology/sites');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('sites', null);
    writeCache('rooms', null);
    markSuccess();
    return data;
  },
  createRoom: async (
    siteId: string,
    payload: { id?: string | null; name: string; description?: string | null }
  ) => {
    const res = await fetch(`/api/topology/sites/${encodeURIComponent(siteId)}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(
        `Request failed: ${res.status} ${res.statusText}`,
        '/api/topology/sites/rooms'
      );
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    markSuccess();
    return data;
  },
  createRoomAisles: async (roomId: string, aisles: { id?: string | null; name: string }[]) => {
    const res = await fetch(`/api/topology/rooms/${encodeURIComponent(roomId)}/aisles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aisles }),
    });
    if (!res.ok) {
      logClientError(
        `Request failed: ${res.status} ${res.statusText}`,
        '/api/topology/rooms/aisles/create'
      );
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    markSuccess();
    return data;
  },
  getCatalog: async (): Promise<{
    device_templates: DeviceTemplate[];
    rack_templates: RackTemplate[];
  }> => {
    return fetchWithCache('/api/catalog', 'catalog');
  },
  createTemplate: async (payload: {
    kind: 'device' | 'rack';
    template: Record<string, unknown>;
  }) => {
    const res = await fetch('/api/catalog/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/catalog/templates');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('catalog', null);
    markSuccess();
    return data;
  },
  updateTemplate: async (payload: {
    kind: 'device' | 'rack';
    template: Record<string, unknown>;
  }) => {
    const res = await fetch('/api/catalog/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/catalog/templates');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('catalog', null);
    markSuccess();
    return data;
  },
  getRack: async (rackId: string): Promise<Rack> => {
    return fetchWithCache(`/api/racks/${rackId}`, `rack.${rackId}`);
  },
  getRooms: async (): Promise<RoomSummary[]> => {
    return fetchWithCache('/api/rooms', 'rooms');
  },
  getRoomLayout: async (roomId: string): Promise<Room> => {
    return fetchWithCache(
      `/api/rooms/${encodeURIComponent(roomId)}/layout`,
      `room.layout.${roomId}`
    );
  },
  getSlurmRoomNodes: async (roomId: string): Promise<SlurmRoomNodes> => {
    return fetchWithCache(
      `/api/slurm/rooms/${encodeURIComponent(roomId)}/nodes`,
      `slurm.nodes.${roomId}`
    );
  },
  getGlobalStats: async (): Promise<GlobalStats> => {
    return fetchWithCache('/api/stats/global', 'stats.global');
  },
  getPrometheusStats: async (): Promise<PrometheusStats> => {
    return fetchWithCache('/api/stats/prometheus', 'stats.prometheus');
  },
  getTelemetryStats: async (): Promise<TelemetryStats> => {
    return fetchWithCache('/api/stats/telemetry', 'stats.telemetry');
  },
  getActiveAlerts: async (): Promise<{ alerts: ActiveAlert[] }> => {
    return fetchWithCache('/api/alerts/active', 'alerts.active');
  },
  getChecks: async (): Promise<ChecksLibrary> => {
    return fetchWithCache('/api/checks', 'checks.library');
  },
  getChecksFiles: async () => {
    return fetchWithCache('/api/checks/files', 'checks.files');
  },
  getChecksFile: async (name: string) => {
    return fetchWithCache(`/api/checks/files/${encodeURIComponent(name)}`, `checks.file.${name}`);
  },
  updateChecksFile: async (name: string, content: string) => {
    const res = await fetch(`/api/checks/files/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      let message = `Request failed: ${res.status} ${res.statusText}`;
      try {
        const data = (await res.json()) as { detail?: unknown };
        const detail = data?.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (detail && typeof detail === 'object') {
          const detailObj = detail as {
            message?: string;
            errors?: Array<{ index?: number; id?: string; errors?: Array<{ msg?: string }> }>;
          };
          if (detailObj.message) {
            if (Array.isArray(detailObj.errors)) {
              const lines = detailObj.errors.map((entry) => {
                const id = entry?.id ? ` (${entry.id})` : '';
                const msg = entry?.errors?.[0]?.msg || 'invalid check';
                return `- check #${entry?.index ?? '?'}${id}: ${msg}`;
              });
              message = `${detailObj.message}\n${lines.join('\n')}`;
            } else {
              message = detailObj.message;
            }
          } else {
            message = JSON.stringify(detail, null, 2);
          }
        }
      } catch {
        // Ignore parsing errors.
      }
      logClientError(message, '/api/checks/files');
      throw new Error(message);
    }
    const data = await res.json();
    writeCache('checks.files', null);
    markSuccess();
    return data;
  },
  getRoomState: async (roomId: string): Promise<RoomState> => {
    return fetchWithCache(`/api/rooms/${roomId}/state`, `room.state.${roomId}`);
  },
  getRackState: async (rackId: string): Promise<RackState> => {
    return fetchWithCache(`/api/racks/${rackId}/state`, `rack.state.${rackId}`);
  },
  updateAisleRacks: async (aisleId: string, roomId: string, racks: string[]) => {
    const res = await fetch(`/api/topology/aisles/${encodeURIComponent(aisleId)}/racks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, racks }),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/topology/aisles');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    markSuccess();
    return data;
  },
  updateRackTemplate: async (rackId: string, templateId: string | null) => {
    const res = await fetch(`/api/topology/racks/${encodeURIComponent(rackId)}/template`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId }),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/topology/racks');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    writeCache(`rack.${rackId}`, null);
    markSuccess();
    return data;
  },
  updateRoomAisles: async (roomId: string, aisles: Record<string, string[]>) => {
    const res = await fetch(`/api/topology/rooms/${encodeURIComponent(roomId)}/aisles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aisles }),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/topology/rooms');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    writeCache(`room.layout.${roomId}`, null);
    markSuccess();
    return data;
  },
  addRackDevice: async (
    rackId: string,
    payload: {
      id: string;
      name: string;
      template_id: string;
      u_position: number;
      instance?: Record<number, string> | string | null;
    }
  ) => {
    const res = await fetch(`/api/topology/racks/${encodeURIComponent(rackId)}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/topology/racks');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    writeCache(`rack.${rackId}`, null);
    markSuccess();
    return data;
  },
  updateRackDevicePosition: async (rackId: string, deviceId: string, uPosition: number) => {
    const res = await fetch(
      `/api/topology/racks/${encodeURIComponent(rackId)}/devices/${encodeURIComponent(deviceId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u_position: uPosition }),
      }
    );
    if (!res.ok) {
      logClientError(
        `Request failed: ${res.status} ${res.statusText}`,
        '/api/topology/racks/devices'
      );
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    writeCache(`rack.${rackId}`, null);
    markSuccess();
    return data;
  },
  deleteRackDevice: async (rackId: string, deviceId: string) => {
    const res = await fetch(
      `/api/topology/racks/${encodeURIComponent(rackId)}/devices/${encodeURIComponent(deviceId)}`,
      {
        method: 'DELETE',
      }
    );
    if (!res.ok) {
      logClientError(
        `Request failed: ${res.status} ${res.statusText}`,
        '/api/topology/racks/devices'
      );
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    writeCache(`rack.${rackId}`, null);
    markSuccess();
    return data;
  },
  updateRackDevices: async (rackId: string, devices: Device[]) => {
    const res = await fetch(`/api/topology/racks/${encodeURIComponent(rackId)}/devices`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devices }),
    });
    if (!res.ok) {
      logClientError(
        `Request failed: ${res.status} ${res.statusText}`,
        '/api/topology/racks/devices'
      );
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('rooms', null);
    writeCache(`rack.${rackId}`, null);
    markSuccess();
    return data;
  },
  getConfig: async (): Promise<AppConfig> => {
    return fetchWithCache('/api/config', 'app.config');
  },
  updateConfig: async (payload: AppConfig): Promise<AppConfig> => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/config');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('app.config', data);
    markSuccess();
    return data as AppConfig;
  },
  getEnv: async (): Promise<Record<string, string | null>> => {
    return fetchWithCache('/api/env', 'app.env');
  },
  getSimulatorOverrides: async (): Promise<{ overrides: SimulatorOverride[] }> => {
    return fetchWithCache('/api/simulator/overrides', 'simulator.overrides');
  },
  getSimulatorScenarios: async (): Promise<{ scenarios: SimulatorScenario[] }> => {
    return fetchWithCache('/api/simulator/scenarios', 'simulator.scenarios');
  },
  addSimulatorOverride: async (payload: {
    instance?: string;
    rack_id?: string;
    metric: string;
    value: number;
    ttl_seconds?: number;
  }): Promise<{ overrides: SimulatorOverride[] }> => {
    const res = await fetch('/api/simulator/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/simulator/overrides');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('simulator.overrides', data);
    return data;
  },
  clearSimulatorOverrides: async (): Promise<{ overrides: SimulatorOverride[] }> => {
    const res = await fetch('/api/simulator/overrides', { method: 'DELETE' });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/simulator/overrides');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('simulator.overrides', data);
    return data;
  },
  deleteSimulatorOverride: async (
    overrideId: string
  ): Promise<{ overrides: SimulatorOverride[] }> => {
    const res = await fetch(`/api/simulator/overrides/${overrideId}`, { method: 'DELETE' });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/simulator/overrides');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('simulator.overrides', data);
    return data;
  },
  getLastSuccessTs: () => {
    const meta = readJSON(META_KEY);
    return meta?.lastSuccess || null;
  },
  isStale: () => {
    const ts = api.getLastSuccessTs();
    if (!ts) return true;
    return Date.now() - ts > STALE_THRESHOLD_MS;
  },
  getErrorLog: () => readJSON(ERROR_KEY) || [],
  clearErrorLog: () => writeJSON(ERROR_KEY, []),
};
