import type { Site, Room, RoomSummary, DeviceTemplate, Rack, AppConfig, SimulatorScenario } from '../types';

const CACHE_PREFIX = 'rackscope.cache.';
const META_KEY = 'rackscope.cache.meta';
const ERROR_KEY = 'rackscope.client.errors';
const STALE_THRESHOLD_MS = 2 * 60 * 1000;

const readJSON = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJSON = (key: string, value: any) => {
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
const writeCache = (key: string, data: any) => {
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
  } catch (err: any) {
    logClientError(err?.message || 'Network error', url);
    const cached = readCache(cacheKey);
    if (cached?.data) return cached.data as T;
    throw err;
  }
};

export const api = {
  getSites: async (): Promise<Site[]> => {
    return fetchWithCache('/api/sites', 'sites');
  },
  getCatalog: async (): Promise<{ device_templates: DeviceTemplate[], rack_templates: any[] }> => {
    return fetchWithCache('/api/catalog', 'catalog');
  },
  createTemplate: async (payload: { kind: 'device' | 'rack'; template: Record<string, any> }) => {
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
  updateTemplate: async (payload: { kind: 'device' | 'rack'; template: Record<string, any> }) => {
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
  getGlobalStats: async () => {
    return fetchWithCache('/api/stats/global', 'stats.global');
  },
  getPrometheusStats: async () => {
    return fetchWithCache('/api/stats/prometheus', 'stats.prometheus');
  },
  getTelemetryStats: async () => {
    return fetchWithCache('/api/stats/telemetry', 'stats.telemetry');
  },
  getActiveAlerts: async () => {
    return fetchWithCache('/api/alerts/active', 'alerts.active');
  },
  getChecks: async () => {
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
        const data = await res.json();
        const detail = data?.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (detail?.message) {
          if (Array.isArray(detail.errors)) {
            const lines = detail.errors.map((entry: any) => {
              const id = entry?.id ? ` (${entry.id})` : '';
              const msg = entry?.errors?.[0]?.msg || 'invalid check';
              return `- check #${entry?.index ?? '?'}${id}: ${msg}`;
            });
            message = `${detail.message}\n${lines.join('\n')}`;
          } else {
            message = detail.message;
          }
        } else if (detail) {
          message = JSON.stringify(detail, null, 2);
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
  getRoomLayout: async (roomId: string): Promise<Room> => {
    return fetchWithCache(`/api/rooms/${roomId}/layout`, `room.layout.${roomId}`);
  },
  getRoomState: async (roomId: string) => {
    return fetchWithCache(`/api/rooms/${roomId}/state`, `room.state.${roomId}`);
  },
  getRackState: async (rackId: string) => {
    return fetchWithCache(`/api/racks/${rackId}/state`, `rack.state.${rackId}`);
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
  getSimulatorOverrides: async () => {
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
  }) => {
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
  clearSimulatorOverrides: async () => {
    const res = await fetch('/api/simulator/overrides', { method: 'DELETE' });
    if (!res.ok) {
      logClientError(`Request failed: ${res.status} ${res.statusText}`, '/api/simulator/overrides');
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    writeCache('simulator.overrides', data);
    return data;
  },
  deleteSimulatorOverride: async (overrideId: string) => {
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
