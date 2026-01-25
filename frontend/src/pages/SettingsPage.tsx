import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import type { AppConfig } from '../types';
import { Moon, Sun, Check, Save } from 'lucide-react';

type ConfigDraft = {
  paths: {
    topology: string;
    templates: string;
    checks: string;
  };
  refresh: {
    room_state_seconds: string;
    rack_state_seconds: string;
  };
  cache: {
    ttl_seconds: string;
  };
  telemetry: {
    prometheus_url: string;
    identity_label: string;
    rack_label: string;
    chassis_label: string;
    job_regex: string;
  };
  planner: {
    unknown_state: string;
    cache_ttl_seconds: string;
    max_ids_per_query: string;
  };
};

export const SettingsPage = () => {
  const { mode, accent, setMode, setAccent } = useTheme();
  const location = useLocation();
  const [errors, setErrors] = useState<{ ts: number; message: string; context?: string }[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string | null>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const colors = [
    { id: 'blue', value: '#3b82f6' },
    { id: 'green', value: '#10b981' },
    { id: 'purple', value: '#8b5cf6' },
    { id: 'orange', value: '#f97316' },
    { id: 'red', value: '#ef4444' },
    { id: 'cyan', value: '#06b6d4' },
  ];

  useEffect(() => {
    setErrors(api.getErrorLog());
  }, []);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const data = await api.getConfig();
        if (active) setConfig(data);
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
    let active = true;
    const loadEnv = async () => {
      try {
        const data = await api.getEnv();
        if (active) setEnvVars(data || {});
      } catch (err) {
        console.error(err);
      }
    };
    loadEnv();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!config) return;
    setDraft({
      paths: {
        topology: config.paths?.topology || '',
        templates: config.paths?.templates || '',
        checks: config.paths?.checks || '',
      },
      refresh: {
        room_state_seconds: String(config.refresh?.room_state_seconds ?? ''),
        rack_state_seconds: String(config.refresh?.rack_state_seconds ?? ''),
      },
      cache: {
        ttl_seconds: String(config.cache?.ttl_seconds ?? ''),
      },
      telemetry: {
        prometheus_url: config.telemetry?.prometheus_url || '',
        identity_label: config.telemetry?.identity_label || 'instance',
        rack_label: config.telemetry?.rack_label || 'rack_id',
        chassis_label: config.telemetry?.chassis_label || 'chassis_id',
        job_regex: config.telemetry?.job_regex || '.*',
      },
      planner: {
        unknown_state: config.planner?.unknown_state || 'UNKNOWN',
        cache_ttl_seconds: String(config.planner?.cache_ttl_seconds ?? ''),
        max_ids_per_query: String(config.planner?.max_ids_per_query ?? ''),
      },
    });
  }, [config]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const configValue = (value?: string | number | null, emptyFallback = '--') => {
    if (value === null || value === undefined || value === '') return emptyFallback;
    return String(value);
  };

  const validationErrors = useMemo(() => {
    if (!draft) return {};
    const next: Record<string, string> = {};
    const labelPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    if (!draft.paths.topology) next.paths_topology = 'Required path';
    if (!draft.paths.templates) next.paths_templates = 'Required path';
    if (!draft.paths.checks) next.paths_checks = 'Required path';

    if (draft.telemetry.prometheus_url) {
      try {
        const parsed = new URL(draft.telemetry.prometheus_url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          next.telemetry_prometheus_url = 'Invalid URL scheme';
        }
      } catch {
        next.telemetry_prometheus_url = 'Invalid URL';
      }
    }

    if (!labelPattern.test(draft.telemetry.identity_label)) next.telemetry_identity_label = 'Invalid label';
    if (!labelPattern.test(draft.telemetry.rack_label)) next.telemetry_rack_label = 'Invalid label';
    if (!labelPattern.test(draft.telemetry.chassis_label)) next.telemetry_chassis_label = 'Invalid label';

    try {
      // eslint-disable-next-line no-new
      new RegExp(draft.telemetry.job_regex);
    } catch {
      next.telemetry_job_regex = 'Invalid regex';
    }

    const intFields: Array<[string, string, number]> = [
      ['refresh_room', draft.refresh.room_state_seconds, 10],
      ['refresh_rack', draft.refresh.rack_state_seconds, 10],
      ['cache_ttl', draft.cache.ttl_seconds, 1],
      ['planner_cache', draft.planner.cache_ttl_seconds, 1],
      ['planner_max', draft.planner.max_ids_per_query, 1],
    ];
    for (const [key, value, min] of intFields) {
      const num = Number.parseInt(value, 10);
      if (!Number.isFinite(num) || num < min) {
        next[key] = `Must be >= ${min}`;
      }
    }

    const allowedStates = ['OK', 'WARN', 'CRIT', 'UNKNOWN'];
    if (!allowedStates.includes(draft.planner.unknown_state)) {
      next.planner_unknown_state = 'Invalid state';
    }

    return next;
  }, [draft]);

  const canSave = draft && Object.keys(validationErrors).length === 0;

  const handleSave = async () => {
    if (!draft || !canSave) return;
    setSaveState('saving');
    try {
      const payload: AppConfig = {
        paths: {
          topology: draft.paths.topology,
          templates: draft.paths.templates,
          checks: draft.paths.checks,
        },
        refresh: {
          room_state_seconds: Number.parseInt(draft.refresh.room_state_seconds, 10),
          rack_state_seconds: Number.parseInt(draft.refresh.rack_state_seconds, 10),
        },
        cache: {
          ttl_seconds: Number.parseInt(draft.cache.ttl_seconds, 10),
        },
        telemetry: {
          prometheus_url: draft.telemetry.prometheus_url || null,
          identity_label: draft.telemetry.identity_label,
          rack_label: draft.telemetry.rack_label,
          chassis_label: draft.telemetry.chassis_label,
          job_regex: draft.telemetry.job_regex,
        },
        planner: {
          unknown_state: draft.planner.unknown_state as any,
          cache_ttl_seconds: Number.parseInt(draft.planner.cache_ttl_seconds, 10),
          max_ids_per_query: Number.parseInt(draft.planner.max_ids_per_query, 10),
        },
      };
      const updated = await api.updateConfig(payload);
      setConfig(updated);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      console.error(err);
      setSaveState('error');
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-12 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black tracking-tight">Settings</h1>
          <button
            onClick={handleSave}
            disabled={!canSave || saveState === 'saving'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
              canSave
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/25'
                : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {saveState === 'saving' ? 'Saving' : saveState === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>

        <div className="space-y-12">
          <section id="configuration">
            <div className="flex items-center justify-between mb-6 border-b border-rack-border pb-2">
              <h2 className="text-xl font-bold">Configuration</h2>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Editable</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Telemetry</h3>
                <label className="text-xs text-gray-400" title="Prometheus API base URL (http/https)">
                  Prometheus URL
                  <input
                    value={draft?.telemetry.prometheus_url || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, prometheus_url: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    placeholder="http://prometheus:9090"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Full URL to Prometheus API (http/https).</div>
                  {validationErrors.telemetry_prometheus_url && <div className="text-[10px] text-status-crit">{validationErrors.telemetry_prometheus_url}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Prometheus label used to identify nodes">
                  Identity label
                  <input
                    value={draft?.telemetry.identity_label || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, identity_label: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Prometheus label used to identify nodes (e.g. instance).</div>
                  {validationErrors.telemetry_identity_label && <div className="text-[10px] text-status-crit">{validationErrors.telemetry_identity_label}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Prometheus label used to aggregate rack metrics">
                  Rack label
                  <input
                    value={draft?.telemetry.rack_label || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, rack_label: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Label used to aggregate rack metrics.</div>
                  {validationErrors.telemetry_rack_label && <div className="text-[10px] text-status-crit">{validationErrors.telemetry_rack_label}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Prometheus label used for chassis/blade aggregation">
                  Chassis label
                  <input
                    value={draft?.telemetry.chassis_label || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, chassis_label: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Label used for chassis/blade aggregation.</div>
                  {validationErrors.telemetry_chassis_label && <div className="text-[10px] text-status-crit">{validationErrors.telemetry_chassis_label}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Regex used to match Prometheus job labels">
                  Job regex
                  <input
                    value={draft?.telemetry.job_regex || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, job_regex: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    placeholder="node|ipmi"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Regex used to match Prometheus job labels.</div>
                  {validationErrors.telemetry_job_regex && <div className="text-[10px] text-status-crit">{validationErrors.telemetry_job_regex}</div>}
                </label>
              </div>

              <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Refresh</h3>
                <label className="text-xs text-gray-400" title="Room polling interval in seconds (min 10)">
                  Room state (seconds)
                  <input
                    type="number"
                    value={draft?.refresh.room_state_seconds || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, refresh: { ...prev.refresh, room_state_seconds: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Min 10s. Used for room polling + Prometheus heartbeat.</div>
                  {validationErrors.refresh_room && <div className="text-[10px] text-status-crit">{validationErrors.refresh_room}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Rack polling interval in seconds (min 10)">
                  Rack state (seconds)
                  <input
                    type="number"
                    value={draft?.refresh.rack_state_seconds || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, refresh: { ...prev.refresh, rack_state_seconds: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Min 10s. Used for rack polling.</div>
                  {validationErrors.refresh_rack && <div className="text-[10px] text-status-crit">{validationErrors.refresh_rack}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Client cache TTL in seconds">
                  Cache TTL (seconds)
                  <input
                    type="number"
                    value={draft?.cache.ttl_seconds || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, cache: { ttl_seconds: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Client cache duration before refetch.</div>
                  {validationErrors.cache_ttl && <div className="text-[10px] text-status-crit">{validationErrors.cache_ttl}</div>}
                </label>
              </div>

              <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Planner</h3>
                <label className="text-xs text-gray-400" title="Default state when no checks match">
                  UNKNOWN policy
                  <select
                    value={draft?.planner.unknown_state || 'UNKNOWN'}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, planner: { ...prev.planner, unknown_state: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  >
                    <option value="UNKNOWN">UNKNOWN</option>
                    <option value="OK">OK</option>
                    <option value="WARN">WARN</option>
                    <option value="CRIT">CRIT</option>
                  </select>
                  <div className="mt-1 text-[10px] text-gray-500">Default state when no checks match.</div>
                  {validationErrors.planner_unknown_state && <div className="text-[10px] text-status-crit">{validationErrors.planner_unknown_state}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Planner snapshot cache TTL in seconds">
                  Planner cache TTL (seconds)
                  <input
                    type="number"
                    value={draft?.planner.cache_ttl_seconds || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, planner: { ...prev.planner, cache_ttl_seconds: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Cache duration for planner snapshots.</div>
                  {validationErrors.planner_cache && <div className="text-[10px] text-status-crit">{validationErrors.planner_cache}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Max IDs per PromQL query chunk">
                  Max IDs per query
                  <input
                    type="number"
                    value={draft?.planner.max_ids_per_query || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, planner: { ...prev.planner, max_ids_per_query: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Controls query chunking to Prometheus.</div>
                  {validationErrors.planner_max && <div className="text-[10px] text-status-crit">{validationErrors.planner_max}</div>}
                </label>
              </div>

              <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Paths</h3>
                <label className="text-xs text-gray-400" title="Topology directory path">
                  Topology path
                  <input
                    value={draft?.paths.topology || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, paths: { ...prev.paths, topology: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Directory containing the topology hierarchy.</div>
                  {validationErrors.paths_topology && <div className="text-[10px] text-status-crit">{validationErrors.paths_topology}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Templates directory path">
                  Templates path
                  <input
                    value={draft?.paths.templates || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, paths: { ...prev.paths, templates: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Directory containing device/rack templates.</div>
                  {validationErrors.paths_templates && <div className="text-[10px] text-status-crit">{validationErrors.paths_templates}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Checks directory path">
                  Checks path
                  <input
                    value={draft?.paths.checks || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, paths: { ...prev.paths, checks: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Directory containing check definitions.</div>
                  {validationErrors.paths_checks && <div className="text-[10px] text-status-crit">{validationErrors.paths_checks}</div>}
                </label>
              </div>
            </div>
          </section>

        {/* Appearance Section */}
        <section id="appearance">
          <h2 className="text-xl font-bold mb-6 border-b border-rack-border pb-2">Appearance</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Theme Mode */}
            <div className="bg-rack-panel border border-rack-border rounded-xl p-6">
              <h3 className="font-mono text-sm uppercase text-gray-500 mb-4 tracking-widest">Interface Mode</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => setMode('light')}
                  className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'light' ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-rack-border hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="font-bold text-sm">Light</span>
                </button>
                <button 
                  onClick={() => setMode('dark')}
                  className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'dark' ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-rack-border hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="font-bold text-sm">Dark</span>
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div className="bg-rack-panel border border-rack-border rounded-xl p-6">
              <h3 className="font-mono text-sm uppercase text-gray-500 mb-4 tracking-widest">Accent Color</h3>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAccent(c.id as any)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${accent === c.id ? 'ring-2 ring-offset-2 ring-offset-rack-panel ring-gray-400' : ''}`}
                    style={{ backgroundColor: c.value }}
                  >
                    {accent === c.id && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* System Section */}
        <section id="system">
          <h2 className="text-xl font-bold mb-6 border-b border-rack-border pb-2">System</h2>
          <div className="bg-rack-panel border border-rack-border rounded-xl p-6">
             <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-sm">Application Cache</h3>
                    <p className="text-xs text-gray-500 mt-1">Clear local preferences and temporary states.</p>
                </div>
                <button 
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors text-sm font-bold uppercase"
                >
                    Clear Cache & Reload
                </button>
             </div>
          </div>
          <div className="bg-rack-panel border border-rack-border rounded-xl p-6 mt-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm">Client Error Log</h3>
                <p className="text-xs text-gray-500 mt-1">Last API failures stored locally.</p>
              </div>
              <button
                onClick={() => {
                  api.clearErrorLog();
                  setErrors([]);
                }}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs font-bold uppercase text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="mt-4 max-h-48 overflow-auto custom-scrollbar">
              {errors.length === 0 && (
                <div className="text-[11px] font-mono text-gray-500">No errors logged.</div>
              )}
              {errors.map((e, i) => (
                <div key={i} className="text-[11px] font-mono text-gray-400 border-b border-white/5 py-2 last:border-0">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">{new Date(e.ts).toLocaleTimeString()}</div>
                  <div className="truncate">{e.message}{e.context ? ` — ${e.context}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="environment">
          <h2 className="text-xl font-bold mb-6 border-b border-rack-border pb-2">Environment</h2>
          <div className="bg-rack-panel border border-rack-border rounded-xl p-6">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Read only</div>
            <div className="text-[11px] text-gray-500 mb-4">
              Environment variables override app.yaml. When not set, defaults are used.
            </div>
            <div className="space-y-2 text-[12px] font-mono text-gray-400">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <span>{key}</span>
                  <span className="text-right">
                    {configValue(value, 'Not set (using app.yaml/defaults)')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
    </div>
  );
};
