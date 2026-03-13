/**
 * Rackscope API client.
 *
 * ## Caching strategy
 * All GET requests go through `fetchWithCache`, which:
 * - Tries the network first
 * - On success: stores the response in localStorage under `rackscope.cache.*`
 * - On failure: returns the last cached value (stale-on-error)
 * - Tracks errors in `rackscope.client.errors` for the status panel
 *
 * ## Performance-sensitive endpoints
 * `/api/racks/{id}/state` defaults to health-only (~30ms). Pass
 * `includeMetrics=true` only on detail views (~743ms — 20+ Prometheus queries).
 *
 * ## Auth
 * Bearer token is read from `localStorage["rackscope.auth.token"]` and
 * injected into every request via `apiFetch`.
 */

import type {
  Site,
  Room,
  RoomSummary,
  Device,
  DeviceTemplate,
  RackTemplate,
  RackComponentTemplate,
  Rack,
  DeviceContext,
  AppConfig,
  ChecksLibrary,
  GlobalStats,
  PrometheusStats,
  TelemetryStats,
  ActiveAlert,
  RoomState,
  RackState,
  SimulatorOverride,
  SlurmRoomNodes,
  SlurmSummary,
  SlurmPartitionSummary,
  SlurmNodeEntry,
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
  const current = readJSON<{ ts: number; message: string; context?: string }[]>(ERROR_KEY) || [];
  const next = [entry, ...current].slice(0, 50);
  writeJSON(ERROR_KEY, next);
  // Also log to console for visibility.
  console.error('[rackscope]', message, context || '');
};

const markSuccess = () => {
  writeJSON(META_KEY, { lastSuccess: Date.now() });
};

const readCache = (key: string) =>
  readJSON<{ ts: number; data: unknown; ttl?: number }>(`${CACHE_PREFIX}${key}`);
const writeCache = (key: string, data: unknown, ttl?: number) => {
  if (data === null) {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return;
  }
  writeJSON(`${CACHE_PREFIX}${key}`, { ts: Date.now(), data, ...(ttl !== undefined && { ttl }) });
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

/**
 * Fetch a URL with stale-on-error caching via localStorage.
 *
 * On network/HTTP failure, returns the previously cached value if available,
 * so the UI degrades gracefully rather than showing empty states.
 */
const fetchWithCache = async <T>(url: string, cacheKey: string, ttl?: number): Promise<T> => {
  // Check if we have a fresh cached value before hitting the network.
  const existing = readCache(cacheKey);
  if (existing?.data) {
    const threshold = existing.ttl ?? STALE_THRESHOLD_MS;
    if (Date.now() - existing.ts < threshold) {
      return existing.data as T;
    }
  }
  try {
    const res = await apiFetch(url);
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, url);
      const cached = readCache(cacheKey);
      if (cached?.data) return cached.data as T;
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache(cacheKey, data, ttl);
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
    rack_component_templates?: RackComponentTemplate[];
  }> => {
    return fetchWithCache('/api/catalog', 'catalog');
  },
  createTemplate: async (payload: {
    kind: 'device' | 'rack' | 'rack_component';
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
    kind: 'device' | 'rack' | 'rack_component';
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
  deleteDeviceTemplate: async (templateId: string) => {
    const res = await apiFetch(`/api/catalog/templates/device/${encodeURIComponent(templateId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    writeCache('catalog', null);
    return res.json();
  },

  validateTemplate: async (payload: {
    kind: 'device' | 'rack' | 'rack_component';
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
  getSlurmSummary: async (roomId?: string): Promise<SlurmSummary> => {
    const params = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
    return fetchWithCache<SlurmSummary>(
      `/api/slurm/summary${params}`,
      `slurm.summary.${roomId || 'all'}`
    );
  },
  getSlurmPartitions: async (roomId?: string): Promise<SlurmPartitionSummary> => {
    const params = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
    return fetchWithCache<SlurmPartitionSummary>(
      `/api/slurm/partitions${params}`,
      `slurm.partitions.${roomId || 'all'}`
    );
  },
  getSlurmNodes: async (roomId?: string) => {
    const params = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
    return fetchWithCache<{ nodes: SlurmNodeEntry[] }>(
      `/api/slurm/nodes${params}`,
      `slurm.node-list.${roomId || 'all'}`
    );
  },
  getSlurmMetricsCatalog: async () => {
    return fetch('/api/slurm/metrics/catalog').then((r) => r.json());
  },
  getSlurmMetricData: async (metricId: string) => {
    return fetch(`/api/slurm/metrics/data?metric_id=${encodeURIComponent(metricId)}`).then((r) =>
      r.json()
    );
  },
  updateSlurmCatalogConfig: async (metricsCatalogs: string[]) => {
    return fetch('/api/slurm/metrics/catalog/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics_catalogs: metricsCatalogs }),
    }).then((r) => r.json());
  },
  getSlurmMapping: async () => {
    return fetch('/api/slurm/mapping').then((r) => r.json());
  },
  saveSlurmMapping: async (entries: { node: string; instance: string }[]) => {
    return fetch('/api/slurm/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    }).then((r) => r.json());
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
  getMetricsFiles: async (): Promise<{ files: Array<{ name: string; path: string }> }> => {
    return fetchWithCache('/api/metrics/files', 'metrics.files');
  },
  // Metrics library CRUD
  getMetricsLibrary: async (params?: { category?: string; tag?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.tag) qs.set('tag', params.tag);
    const url = `/api/metrics/library${qs.toString() ? `?${qs}` : ''}`;
    return fetchWithCache<{ metrics: unknown[] }>(
      url,
      `metrics.library${params?.category ?? ''}${params?.tag ?? ''}`
    );
  },
  getMetricsLibraryFiles: async (): Promise<{ files: Array<{ name: string; path: string }> }> => {
    return fetchWithCache('/api/metrics/library/files', 'metrics.library.files');
  },
  getMetricFile: async (name: string): Promise<{ name: string; content: string }> => {
    const res = await apiFetch(`/api/metrics/library/files/${encodeURIComponent(name)}`);
    return res.json();
  },
  updateMetricFile: async (name: string, content: string) => {
    const res = await apiFetch(`/api/metrics/library/files/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return res.json();
  },
  deleteMetricFile: async (name: string) => {
    const res = await apiFetch(`/api/metrics/library/files/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  getChecks: async (): Promise<ChecksLibrary> => {
    return fetchWithCache('/api/checks', 'checks.library');
  },
  getChecksFiles: async (): Promise<{ files: Array<{ name: string; path: string }> }> => {
    return fetchWithCache<{ files: Array<{ name: string; path: string }> }>(
      '/api/checks/files',
      'checks.files'
    );
  },
  getChecksFile: async (name: string): Promise<{ name: string; content: string }> => {
    return fetchWithCache<{ name: string; content: string }>(
      `/api/checks/files/${encodeURIComponent(name)}`,
      `checks.file.${name}`
    );
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
  testCheckQuery: async (
    expr: string,
    variables: Record<string, string>
  ): Promise<{
    expr: string;
    prometheus: {
      status: string;
      data: {
        resultType: string;
        result: Array<{ metric: Record<string, string>; value: [number, string] }>;
      };
    };
  }> => {
    const res = await apiFetch('/api/checks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expr, variables }),
    });
    if (!res.ok) {
      let message = `Query failed: ${res.status}`;
      try {
        const body = await res.json();
        message = body?.detail ?? message;
      } catch {
        /* noop */
      }
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
    return res.json();
  },
  getRoomState: async (roomId: string): Promise<RoomState> => {
    // Short TTL (5s): room state is polled by RoomPage on a tight loop.
    return fetchWithCache(`/api/rooms/${roomId}/state`, `room.${roomId}.state`, 5000);
  },
  /**
   * Fetch rack health state, optionally including detailed metrics.
   *
   * @param includeMetrics - When true, backend fetches 20+ Prometheus queries
   *   for temperature/power/PDU (~743ms). Use only on detail views (RackPage,
   *   DevicePage). Default false returns health-only in ~30ms.
   */
  getRackState: async (rackId: string, includeMetrics: boolean = false): Promise<RackState> => {
    const url = `/api/racks/${rackId}/state${includeMetrics ? '?include_metrics=true' : ''}`;
    const cacheKey = `rack.${rackId}.state${includeMetrics ? '.metrics' : ''}`;
    return fetchWithCache(url, cacheKey, 5000);
  },
  /**
   * Fetch detailed per-instance metrics for a device (lazy-loaded on DevicePage).
   * Cached for 60s — metrics are heavier and less time-sensitive than health states.
   */
  getDeviceMetrics: async (
    rackId: string,
    deviceId: string
  ): Promise<{
    device_id: string;
    rack_id: string;
    metrics: Record<string, Record<string, number>>;
  }> => {
    const url = `/api/devices/${rackId}/${deviceId}/metrics`;
    const cacheKey = `device.${rackId}.${deviceId}.metrics`;
    return fetchWithCache(url, cacheKey, 60000);
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
  createRack: async (
    aisleId: string,
    payload: { id?: string | null; name: string; u_height: number; template_id?: string | null }
  ) => {
    const res = await apiFetch(`/api/topology/aisles/${encodeURIComponent(aisleId)}/racks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    writeCache('rooms', null);
    markSuccess();
    return res.json();
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
  getProcessStats: async (): Promise<{
    backend: { memory_bytes: number | null; cpu_seconds: number | null; available: boolean };
    simulator: { memory_bytes: number | null; cpu_seconds: number | null; available: boolean };
    prometheus: { memory_bytes: number | null; cpu_seconds: number | null; available: boolean };
  }> => {
    return apiFetch('/api/system/process-stats').then((r) => r.json());
  },
  getAllRoomStates: async (): Promise<Record<string, string>> => {
    return fetchWithCache('/api/rooms/states', 'rooms.all-states', 15_000);
  },
  getSimulatorStatus: async (): Promise<{
    running: boolean;
    endpoint: string;
    update_interval: number;
    incident_mode: string | null;
    changes_per_hour: number | null;
    overrides_count: number;
  }> => {
    // Not cached — used to detect live running state (e.g. to grey out settings).
    return apiFetch('/api/simulator/status').then((r) => r.json());
  },
  restartSimulator: async (): Promise<{ status: string }> => {
    return apiFetch('/api/simulator/restart', { method: 'POST' }).then((r) => r.json());
  },
  getSimulatorOverrides: async (): Promise<{ overrides: SimulatorOverride[] }> => {
    return fetchWithCache('/api/simulator/overrides', 'simulator.overrides');
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
    // Not cached: plugin enabled/disabled state must reflect live backend config.
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
    const meta = readJSON<{ lastSuccess: number }>(META_KEY);
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
  disableSetupWizard: async (): Promise<void> => {
    await apiFetch('/api/setup/wizard/disable', { method: 'POST' });
  },
};
