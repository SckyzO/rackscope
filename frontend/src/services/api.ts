import type {
  Site,
  Room,
  RoomSummary,
  Device,
  DeviceTemplate,
  RackTemplate,
  Rack,
  DeviceContext,
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
  PluginsMenuResponse,
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

// ── Auth-aware fetch ───────────────────────────────────────────────────────

const getToken = (): string | null => {
  try {
    return localStorage.getItem('rackscope.auth.token');
  } catch {
    return null;
  }
};

const apiFetch = (url: string, options?: RequestInit): Promise<Response> => {
  const token = getToken();
  const base = options?.headers ? new Headers(options.headers) : new Headers();
  if (token) base.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers: base });
};

const fetchWithCache = async <T>(url: string, cacheKey: string): Promise<T> => {
  try {
    const res = await apiFetch(url);
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
    const res = await apiFetch('/api/topology/sites', {
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
    const res = await apiFetch(`/api/topology/sites/${encodeURIComponent(siteId)}/rooms`, {
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
  deleteSite: async (siteId: string) => {
    const res = await apiFetch(`/api/topology/sites/${encodeURIComponent(siteId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    writeCache('sites', null);
    writeCache('rooms', null);
    markSuccess();
    return res.json();
  },
  deleteRoom: async (roomId: string) => {
    const res = await apiFetch(`/api/topology/rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    writeCache('rooms', null);
    markSuccess();
    return res.json();
  },
  deleteAisle: async (aisleId: string) => {
    const res = await apiFetch(`/api/topology/aisles/${encodeURIComponent(aisleId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    writeCache('rooms', null);
    markSuccess();
    return res.json();
  },
  createRoomAisles: async (roomId: string, aisles: { id?: string | null; name: string }[]) => {
    // Filter out null/empty ids to avoid 422 from backend Dict[str, str] validation
    const payload = aisles.map((a) => {
      const entry: { name: string; id?: string } = { name: a.name };
      if (a.id) entry.id = a.id;
      return entry;
    });
    const res = await apiFetch(`/api/topology/rooms/${encodeURIComponent(roomId)}/aisles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aisles: payload }),
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
    const res = await apiFetch('/api/catalog/templates', {
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
    const res = await apiFetch('/api/catalog/templates', {
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
  validateTemplate: async (payload: {
    kind: 'device' | 'rack';
    template: Record<string, unknown>;
  }) => {
    const res = await apiFetch('/api/catalog/templates/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logClientError(
        `Request failed: ${res.status} ${res.statusText}`,
        '/api/catalog/templates/validate'
      );
      const detail = await res.json().catch(() => null);
      const error = new Error(`Request failed: ${res.status}`);
      (error as Error & { detail?: unknown }).detail = detail;
      throw error;
    }
    const data = await res.json();
    markSuccess();
    return data;
  },
  getRack: async (rackId: string): Promise<Rack> => {
    return fetchWithCache(`/api/racks/${rackId}`, `rack.${rackId}`);
  },
  getDeviceDetails: async (rackId: string, deviceId: string): Promise<DeviceContext> => {
    return fetchWithCache(
      `/api/racks/${encodeURIComponent(rackId)}/devices/${encodeURIComponent(deviceId)}`,
      `device.${rackId}.${deviceId}`
    );
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
  getSlurmSummary: async (roomId?: string) => {
    const params = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
    return fetchWithCache(`/api/slurm/summary${params}`, `slurm.summary.${roomId || 'all'}`);
  },
  getSlurmPartitions: async (roomId?: string) => {
    const params = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
    return fetchWithCache(`/api/slurm/partitions${params}`, `slurm.partitions.${roomId || 'all'}`);
  },
  getSlurmNodes: async (roomId?: string) => {
    const params = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
    return fetchWithCache(`/api/slurm/nodes${params}`, `slurm.nodes.${roomId || 'all'}`);
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
    const res = await apiFetch(`/api/checks/files/${encodeURIComponent(name)}`, {
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
    // Cache with very short TTL (5s) for performance while keeping data fresh
    return fetchWithCache(`/api/rooms/${roomId}/state`, `room.${roomId}.state`, 5000);
  },
  getRackState: async (rackId: string, includeMetrics: boolean = false): Promise<RackState> => {
    // Cache with very short TTL (5s) for performance while keeping data fresh
    const url = `/api/racks/${rackId}/state${includeMetrics ? '?include_metrics=true' : ''}`;
    const cacheKey = `rack.${rackId}.state${includeMetrics ? '.metrics' : ''}`;
    return fetchWithCache(url, cacheKey, 5000);
  },
  getDeviceMetrics: async (
    rackId: string,
    deviceId: string
  ): Promise<{
    device_id: string;
    rack_id: string;
    metrics: Record<string, Record<string, number>>;
  }> => {
    // Fetch detailed metrics for a specific device (lazy-loaded)
    const url = `/api/devices/${rackId}/${deviceId}/metrics`;
    const cacheKey = `device.${rackId}.${deviceId}.metrics`;
    return fetchWithCache(url, cacheKey, 60000); // 60s cache for metrics
  },
  updateAisleRacks: async (aisleId: string, roomId: string, racks: string[]) => {
    const res = await apiFetch(`/api/topology/aisles/${encodeURIComponent(aisleId)}/racks`, {
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
    const res = await apiFetch(`/api/topology/racks/${encodeURIComponent(rackId)}/template`, {
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
    const res = await apiFetch(`/api/topology/rooms/${encodeURIComponent(roomId)}/aisles`, {
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
    const res = await apiFetch(`/api/topology/racks/${encodeURIComponent(rackId)}/devices`, {
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
    const res = await apiFetch(
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
    const res = await apiFetch(
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
    const res = await apiFetch(`/api/topology/racks/${encodeURIComponent(rackId)}/devices`, {
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
    const res = await apiFetch('/api/config', {
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
    const res = await apiFetch('/api/simulator/overrides', {
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
    const res = await apiFetch('/api/simulator/overrides', { method: 'DELETE' });
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
    const res = await apiFetch(`/api/simulator/overrides/${overrideId}`, { method: 'DELETE' });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/simulator/overrides');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('simulator.overrides', data);
    return data;
  },
  getPluginsMenu: async (): Promise<PluginsMenuResponse> => {
    // Don't cache plugins menu - needs to be fresh for enabled/disabled state changes
    try {
      const res = await apiFetch('/api/plugins/menu');
      if (!res.ok) {
        logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/plugins/menu');
        throw new Error(`Request failed: ${res.status}`);
      }
      const data = await res.json();
      markSuccess();
      return data as PluginsMenuResponse;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      logClientError(message, '/api/plugins/menu');
      throw err instanceof Error ? err : new Error('Network error');
    }
  },
  restartBackend: async (): Promise<{ status: string; message: string }> => {
    try {
      const res = await apiFetch('/api/system/restart', { method: 'POST' });
      if (!res.ok) {
        logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/system/restart');
        throw new Error(`Request failed: ${res.status}`);
      }
      const data = await res.json();
      markSuccess();
      return data as { status: string; message: string };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      logClientError(message, '/api/system/restart');
      throw err instanceof Error ? err : new Error('Network error');
    }
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
  // ── Auth ──────────────────────────────────────────────────────────────────
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const res = await apiFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail ?? 'Failed to change password');
    }
  },
  changeUsername: async (password: string, newUsername: string): Promise<{ username: string }> => {
    const res = await apiFetch('/api/auth/change-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, new_username: newUsername }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail ?? 'Failed to change username');
    }
    return res.json() as Promise<{ username: string }>;
  },
};
