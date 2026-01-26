import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import type { AppConfig, SimulatorScenario } from '../types';
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
    prometheus_heartbeat_seconds: string;
    prometheus_latency_window: string;
    basic_auth_user: string;
    basic_auth_password: string;
    tls_verify: boolean;
    tls_ca_file: string;
    tls_cert_file: string;
    tls_key_file: string;
  };
  planner: {
    unknown_state: string;
    cache_ttl_seconds: string;
    max_ids_per_query: string;
  };
  features: {
    notifications: boolean;
    notifications_max_visible: string;
    playlist: boolean;
    offline: boolean;
    demo: boolean;
  };
  simulator: {
    update_interval_seconds: string;
    seed: string;
    scenario: string;
    scale_factor: string;
    default_ttl_seconds: string;
    metrics_catalog_path: string;
    incident_rates: {
      node_micro_failure: string;
      rack_macro_failure: string;
      aisle_cooling_failure: string;
    };
    incident_durations: {
      rack: string;
      aisle: string;
    };
    overrides_path: string;
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
  const [overrides, setOverrides] = useState<Array<{ id: string; instance?: string; rack_id?: string; metric: string; value: number; expires_at?: number }>>([]);
  const [overrideForm, setOverrideForm] = useState({ scope: 'instance', instance: '', rack_id: '', metric: 'up', value: '', ttl_seconds: '' });
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [scenarioOptions, setScenarioOptions] = useState<SimulatorScenario[]>([]);

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
    let active = true;
    const loadOverrides = async () => {
      try {
        const data = await api.getSimulatorOverrides();
        if (active) {
          setOverrides((data?.overrides || []) as any[]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadOverrides();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadScenarios = async () => {
      try {
        const data = await api.getSimulatorScenarios();
        if (active) {
          setScenarioOptions((data?.scenarios || []) as SimulatorScenario[]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadScenarios();
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
        prometheus_heartbeat_seconds: String(config.telemetry?.prometheus_heartbeat_seconds ?? 30),
        prometheus_latency_window: String(config.telemetry?.prometheus_latency_window ?? 20),
        basic_auth_user: config.telemetry?.basic_auth_user || '',
        basic_auth_password: config.telemetry?.basic_auth_password || '',
        tls_verify: config.telemetry?.tls_verify ?? true,
        tls_ca_file: config.telemetry?.tls_ca_file || '',
        tls_cert_file: config.telemetry?.tls_cert_file || '',
        tls_key_file: config.telemetry?.tls_key_file || '',
      },
      planner: {
        unknown_state: config.planner?.unknown_state || 'UNKNOWN',
        cache_ttl_seconds: String(config.planner?.cache_ttl_seconds ?? ''),
        max_ids_per_query: String(config.planner?.max_ids_per_query ?? ''),
      },
      features: {
        notifications: config.features?.notifications ?? false,
        notifications_max_visible: String(config.features?.notifications_max_visible ?? 10),
        playlist: config.features?.playlist ?? false,
        offline: config.features?.offline ?? false,
        demo: config.features?.demo ?? false,
      },
      simulator: {
        update_interval_seconds: String(config.simulator?.update_interval_seconds ?? 20),
        seed: config.simulator?.seed !== null && config.simulator?.seed !== undefined ? String(config.simulator?.seed) : '',
        scenario: config.simulator?.scenario || '',
        scale_factor: String(config.simulator?.scale_factor ?? 1.0),
        default_ttl_seconds: String(config.simulator?.default_ttl_seconds ?? 120),
        metrics_catalog_path: config.simulator?.metrics_catalog_path || 'config/simulator_metrics_full.yaml',
        incident_rates: {
          node_micro_failure: String(config.simulator?.incident_rates?.node_micro_failure ?? 0.001),
          rack_macro_failure: String(config.simulator?.incident_rates?.rack_macro_failure ?? 0.01),
          aisle_cooling_failure: String(config.simulator?.incident_rates?.aisle_cooling_failure ?? 0.005),
        },
        incident_durations: {
          rack: String(config.simulator?.incident_durations?.rack ?? 3),
          aisle: String(config.simulator?.incident_durations?.aisle ?? 5),
        },
        overrides_path: config.simulator?.overrides_path || 'config/simulator_overrides.yaml',
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
    const heartbeat = Number.parseInt(draft.telemetry.prometheus_heartbeat_seconds, 10);
    if (!Number.isFinite(heartbeat) || heartbeat < 10) {
      next.telemetry_heartbeat = 'Must be >= 10';
    }
    const windowSize = Number.parseInt(draft.telemetry.prometheus_latency_window, 10);
    if (!Number.isFinite(windowSize) || windowSize < 1) {
      next.telemetry_latency_window = 'Must be >= 1';
    }

    if (draft.telemetry.basic_auth_password && !draft.telemetry.basic_auth_user) {
      next.telemetry_basic_auth = 'Username required when password is set';
    }
    if (draft.telemetry.basic_auth_user && !draft.telemetry.basic_auth_password) {
      next.telemetry_basic_auth = 'Password required when username is set';
    }
    if (draft.telemetry.tls_key_file && !draft.telemetry.tls_cert_file) {
      next.telemetry_tls_pair = 'Client cert required when key is set';
    }
    if (draft.telemetry.tls_cert_file && !draft.telemetry.tls_key_file) {
      next.telemetry_tls_pair = 'Client key required when cert is set';
    }

    const intFields: Array<[string, string, number]> = [
      ['refresh_room', draft.refresh.room_state_seconds, 10],
      ['refresh_rack', draft.refresh.rack_state_seconds, 10],
      ['cache_ttl', draft.cache.ttl_seconds, 1],
      ['planner_cache', draft.planner.cache_ttl_seconds, 1],
      ['planner_max', draft.planner.max_ids_per_query, 1],
      ['notifications_max_visible', draft.features.notifications_max_visible, 1],
      ['sim_update_interval', draft.simulator.update_interval_seconds, 1],
      ['sim_default_ttl', draft.simulator.default_ttl_seconds, 0],
      ['sim_duration_rack', draft.simulator.incident_durations.rack, 1],
      ['sim_duration_aisle', draft.simulator.incident_durations.aisle, 1],
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

    const rateFields: Array<[string, string]> = [
      ['sim_rate_node', draft.simulator.incident_rates.node_micro_failure],
      ['sim_rate_rack', draft.simulator.incident_rates.rack_macro_failure],
      ['sim_rate_aisle', draft.simulator.incident_rates.aisle_cooling_failure],
    ];
    for (const [key, value] of rateFields) {
      const num = Number.parseFloat(value);
      if (!Number.isFinite(num) || num < 0 || num > 1) {
        next[key] = 'Must be between 0 and 1';
      }
    }
    const scale = Number.parseFloat(draft.simulator.scale_factor);
    if (!Number.isFinite(scale) || scale < 0) {
      next.sim_scale = 'Must be >= 0';
    }

    return next;
  }, [draft]);

  const canSave = draft && Object.keys(validationErrors).length === 0;
  const selectedScenario = useMemo(() => {
    if (!draft?.simulator.scenario) return null;
    return scenarioOptions.find((opt) => opt.name === draft.simulator.scenario) || null;
  }, [scenarioOptions, draft?.simulator.scenario]);

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
          prometheus_heartbeat_seconds: Number.parseInt(draft.telemetry.prometheus_heartbeat_seconds, 10),
          prometheus_latency_window: Number.parseInt(draft.telemetry.prometheus_latency_window, 10),
          basic_auth_user: draft.telemetry.basic_auth_user || null,
          basic_auth_password: draft.telemetry.basic_auth_password || null,
          tls_verify: draft.telemetry.tls_verify,
          tls_ca_file: draft.telemetry.tls_ca_file || null,
          tls_cert_file: draft.telemetry.tls_cert_file || null,
          tls_key_file: draft.telemetry.tls_key_file || null,
        },
        planner: {
          unknown_state: draft.planner.unknown_state as any,
          cache_ttl_seconds: Number.parseInt(draft.planner.cache_ttl_seconds, 10),
          max_ids_per_query: Number.parseInt(draft.planner.max_ids_per_query, 10),
        },
        features: {
          notifications: draft.features.notifications,
          notifications_max_visible: Number.parseInt(draft.features.notifications_max_visible, 10),
          playlist: draft.features.playlist,
          offline: draft.features.offline,
          demo: draft.features.demo,
        },
        simulator: {
          update_interval_seconds: Number.parseInt(draft.simulator.update_interval_seconds, 10),
          seed: draft.simulator.seed ? Number.parseInt(draft.simulator.seed, 10) : null,
          scenario: draft.simulator.scenario || null,
          scale_factor: Number.parseFloat(draft.simulator.scale_factor),
          default_ttl_seconds: Number.parseInt(draft.simulator.default_ttl_seconds, 10),
          metrics_catalog_path: draft.simulator.metrics_catalog_path,
          incident_rates: {
            node_micro_failure: Number.parseFloat(draft.simulator.incident_rates.node_micro_failure),
            rack_macro_failure: Number.parseFloat(draft.simulator.incident_rates.rack_macro_failure),
            aisle_cooling_failure: Number.parseFloat(draft.simulator.incident_rates.aisle_cooling_failure),
          },
          incident_durations: {
            rack: Number.parseInt(draft.simulator.incident_durations.rack, 10),
            aisle: Number.parseInt(draft.simulator.incident_durations.aisle, 10),
          },
          overrides_path: draft.simulator.overrides_path,
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
                <label className="text-xs text-gray-400" title="Interval for heartbeat calls to Prometheus">
                  Prometheus heartbeat (seconds)
                  <input
                    type="number"
                    value={draft?.telemetry.prometheus_heartbeat_seconds || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, prometheus_heartbeat_seconds: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Min 10s. Drives scrape countdown in sidebar.</div>
                  {validationErrors.telemetry_heartbeat && <div className="text-[10px] text-status-crit">{validationErrors.telemetry_heartbeat}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Number of latency samples used to compute average">
                  Prometheus latency window
                  <input
                    type="number"
                    value={draft?.telemetry.prometheus_latency_window || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, prometheus_latency_window: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Number of samples for average latency.</div>
                  {validationErrors.telemetry_latency_window && <div className="text-[10px] text-status-crit">{validationErrors.telemetry_latency_window}</div>}
                </label>
                <label className="text-xs text-gray-400" title="Basic auth username for Prometheus">
                  Basic auth username
                  <input
                    value={draft?.telemetry.basic_auth_user || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, basic_auth_user: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Optional. Requires password.</div>
                </label>
                <label className="text-xs text-gray-400" title="Basic auth password for Prometheus">
                  Basic auth password
                  <input
                    type="password"
                    value={draft?.telemetry.basic_auth_password || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, basic_auth_password: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Optional. Requires username.</div>
                </label>
                {validationErrors.telemetry_basic_auth && (
                  <div className="text-[10px] text-status-crit">{validationErrors.telemetry_basic_auth}</div>
                )}
                <label className="text-xs text-gray-400" title="Verify Prometheus TLS certificate">
                  TLS verify
                  <select
                    value={draft?.telemetry.tls_verify ? 'true' : 'false'}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, tls_verify: e.target.value === 'true' } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                  <div className="mt-1 text-[10px] text-gray-500">Disable only for trusted internal endpoints.</div>
                </label>
                <label className="text-xs text-gray-400" title="Custom CA bundle path for TLS verification">
                  TLS CA file
                  <input
                    value={draft?.telemetry.tls_ca_file || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, tls_ca_file: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Optional CA bundle path.</div>
                </label>
                <label className="text-xs text-gray-400" title="Client certificate path for mTLS">
                  TLS client cert
                  <input
                    value={draft?.telemetry.tls_cert_file || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, tls_cert_file: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Optional. Requires key.</div>
                </label>
                <label className="text-xs text-gray-400" title="Client key path for mTLS">
                  TLS client key
                  <input
                    value={draft?.telemetry.tls_key_file || ''}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, telemetry: { ...prev.telemetry, tls_key_file: e.target.value } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Optional. Requires cert.</div>
                </label>
                {validationErrors.telemetry_tls_pair && (
                  <div className="text-[10px] text-status-crit">{validationErrors.telemetry_tls_pair}</div>
                )}
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

              <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Feature toggles</h3>
                <label className="text-xs text-gray-400" title="Enable notifications UI">
                  Notifications
                  <select
                    value={draft?.features.notifications ? 'true' : 'false'}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, features: { ...prev.features, notifications: e.target.value === 'true' } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </label>
                <label className="text-xs text-gray-400" title="Max alert rows shown before scrolling">
                  Max visible alerts
                  <input
                    type="number"
                    value={draft?.features.notifications_max_visible || ''}
                    onChange={(e) => setDraft((prev) => prev && ({
                      ...prev,
                      features: { ...prev.features, notifications_max_visible: e.target.value },
                    }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  />
                  <div className="mt-1 text-[10px] text-gray-500">Controls alert panel height (scroll for more).</div>
                  {validationErrors.notifications_max_visible && (
                    <div className="text-[10px] text-status-crit">{validationErrors.notifications_max_visible}</div>
                  )}
                </label>
                <label className="text-xs text-gray-400" title="Enable playlist mode UI">
                  Playlist
                  <select
                    value={draft?.features.playlist ? 'true' : 'false'}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, features: { ...prev.features, playlist: e.target.value === 'true' } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </label>
                <label className="text-xs text-gray-400" title="Enable offline snapshot UI">
                  Offline snapshots
                  <select
                    value={draft?.features.offline ? 'true' : 'false'}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, features: { ...prev.features, offline: e.target.value === 'true' } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </label>
                <label className="text-xs text-gray-400" title="Enable simulator controls for demo mode">
                  Demo mode
                  <select
                    value={draft?.features.demo ? 'true' : 'false'}
                    onChange={(e) => setDraft((prev) => prev && ({ ...prev, features: { ...prev.features, demo: e.target.value === 'true' } }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          {draft?.features.demo && (
            <section id="simulator">
              <h2 className="text-xl font-bold mb-6 border-b border-rack-border pb-2">Simulator</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                  <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Runtime</h3>
                  <label className="text-xs text-gray-400" title="Simulator update interval">
                    Update interval (seconds)
                    <input
                      type="number"
                      value={draft?.simulator.update_interval_seconds || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, update_interval_seconds: e.target.value } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_update_interval && <div className="text-[10px] text-status-crit">{validationErrors.sim_update_interval}</div>}
                  </label>
                  <label className="text-xs text-gray-400" title="Scenario name from simulator.yaml">
                    Scenario
                    <select
                      value={draft?.simulator.scenario || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, scenario: e.target.value } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    >
                      <option value="">(none)</option>
                      {scenarioOptions.map((item) => (
                        <option key={item.name} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                    {selectedScenario?.description && (
                      <div className="mt-1 text-[10px] text-gray-500">{selectedScenario.description}</div>
                    )}
                  </label>
                  <label className="text-xs text-gray-400" title="Scale factor for incident rates (1.0 = baseline, 2.0 = twice as frequent)">
                    Scale factor
                    <input
                      type="number"
                      step="0.1"
                      value={draft?.simulator.scale_factor || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, scale_factor: e.target.value } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_scale && <div className="text-[10px] text-status-crit">{validationErrors.sim_scale}</div>}
                  </label>
                  <label className="text-xs text-gray-400" title="Seed for deterministic simulation">
                    Seed
                    <input
                      type="number"
                      value={draft?.simulator.seed || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, seed: e.target.value } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="text-xs text-gray-400" title="Default TTL for overrides when left empty (0 disables TTL)">
                    Override default TTL (seconds)
                    <input
                      type="number"
                      value={draft?.simulator.default_ttl_seconds || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, default_ttl_seconds: e.target.value } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_default_ttl && <div className="text-[10px] text-status-crit">{validationErrors.sim_default_ttl}</div>}
                  </label>
                  <label className="text-xs text-gray-400" title="Overrides file path">
                    Overrides path
                    <input
                      value={draft?.simulator.overrides_path || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, overrides_path: e.target.value } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                  <label className="text-xs text-gray-400" title="Metrics catalog file for multi-metric simulator">
                    Metrics catalog path
                    <input
                      value={draft?.simulator.metrics_catalog_path || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, metrics_catalog_path: e.target.value } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                </div>

                <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                  <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Incident rates</h3>
                  <label className="text-xs text-gray-400">
                    Node micro failure
                    <input
                      type="number"
                      step="0.0001"
                      value={draft?.simulator.incident_rates.node_micro_failure || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, incident_rates: { ...prev.simulator.incident_rates, node_micro_failure: e.target.value } } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_rate_node && <div className="text-[10px] text-status-crit">{validationErrors.sim_rate_node}</div>}
                  </label>
                  <label className="text-xs text-gray-400">
                    Rack macro failure
                    <input
                      type="number"
                      step="0.0001"
                      value={draft?.simulator.incident_rates.rack_macro_failure || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, incident_rates: { ...prev.simulator.incident_rates, rack_macro_failure: e.target.value } } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_rate_rack && <div className="text-[10px] text-status-crit">{validationErrors.sim_rate_rack}</div>}
                  </label>
                  <label className="text-xs text-gray-400">
                    Aisle cooling failure
                    <input
                      type="number"
                      step="0.0001"
                      value={draft?.simulator.incident_rates.aisle_cooling_failure || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, incident_rates: { ...prev.simulator.incident_rates, aisle_cooling_failure: e.target.value } } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_rate_aisle && <div className="text-[10px] text-status-crit">{validationErrors.sim_rate_aisle}</div>}
                  </label>
                </div>

                <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                  <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Incident durations</h3>
                  <label className="text-xs text-gray-400">
                    Rack duration (ticks)
                    <input
                      type="number"
                      value={draft?.simulator.incident_durations.rack || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, incident_durations: { ...prev.simulator.incident_durations, rack: e.target.value } } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_duration_rack && <div className="text-[10px] text-status-crit">{validationErrors.sim_duration_rack}</div>}
                  </label>
                  <label className="text-xs text-gray-400">
                    Aisle duration (ticks)
                    <input
                      type="number"
                      value={draft?.simulator.incident_durations.aisle || ''}
                      onChange={(e) => setDraft((prev) => prev && ({ ...prev, simulator: { ...prev.simulator, incident_durations: { ...prev.simulator.incident_durations, aisle: e.target.value } } }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {validationErrors.sim_duration_aisle && <div className="text-[10px] text-status-crit">{validationErrors.sim_duration_aisle}</div>}
                  </label>
                </div>

                <div className="bg-rack-panel border border-rack-border rounded-xl p-6 space-y-3">
                  <h3 className="font-mono text-sm uppercase text-gray-500 tracking-widest">Overrides</h3>
                  <div className="space-y-2">
                    <select
                      value={overrideForm.scope}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, scope: e.target.value }))}
                      className="w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    >
                      <option value="instance">Instance override</option>
                      <option value="rack">Rack override</option>
                    </select>
                    {overrideForm.scope === 'instance' ? (
                    <input
                      value={overrideForm.instance}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, instance: e.target.value }))}
                      placeholder="Instance (e.g. compute001)"
                      className="w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    ) : (
                    <input
                      value={overrideForm.rack_id}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, rack_id: e.target.value }))}
                      placeholder="Rack ID (e.g. r01-01)"
                      className="w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    )}
                    <select
                      value={overrideForm.metric}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, metric: e.target.value }))}
                      className="w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    >
                      <option value="up">up</option>
                      <option value="node_temperature_celsius">node_temperature_celsius</option>
                      <option value="node_power_watts">node_power_watts</option>
                      <option value="node_load_percent">node_load_percent</option>
                      <option value="node_health_status">node_health_status</option>
                      <option value="rack_down">rack_down</option>
                    </select>
                    <input
                      value={overrideForm.value}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, value: e.target.value }))}
                      placeholder="Value"
                      className="w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    <input
                      value={overrideForm.ttl_seconds}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, ttl_seconds: e.target.value }))}
                      placeholder={`TTL seconds (default ${draft?.simulator.default_ttl_seconds ?? 120})`}
                      className="w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                    {overrideError && <div className="text-[10px] text-status-crit">{overrideError}</div>}
                    <button
                      type="button"
                      onClick={async () => {
                        setOverrideError(null);
                        if (overrideForm.value === '') {
                          setOverrideError('Value is required');
                          return;
                        }
                        if (overrideForm.scope === 'instance' && !overrideForm.instance) {
                          setOverrideError('Instance is required');
                          return;
                        }
                        if (overrideForm.scope === 'rack' && !overrideForm.rack_id) {
                          setOverrideError('Rack ID is required');
                          return;
                        }
                        if (overrideForm.scope === 'rack' && overrideForm.metric !== 'rack_down') {
                          setOverrideError('Rack overrides only support rack_down');
                          return;
                        }
                        if (overrideForm.scope === 'instance' && overrideForm.metric === 'rack_down') {
                          setOverrideError('rack_down requires rack scope');
                          return;
                        }
                        const value = Number.parseFloat(overrideForm.value);
                        if (!Number.isFinite(value)) {
                          setOverrideError('Value must be numeric');
                          return;
                        }
                        if (overrideForm.metric === 'up' && ![0, 1].includes(value)) {
                          setOverrideError('up must be 0 or 1');
                          return;
                        }
                        if (overrideForm.metric === 'node_health_status' && ![0, 1, 2].includes(value)) {
                          setOverrideError('node_health_status must be 0, 1, or 2');
                          return;
                        }
                        let ttl: number | undefined;
                        if (overrideForm.ttl_seconds) {
                          ttl = Number.parseInt(overrideForm.ttl_seconds, 10);
                          if (!Number.isFinite(ttl) || ttl < 0) {
                            setOverrideError('TTL must be >= 0');
                            return;
                          }
                        }
                        const payload = {
                          instance: overrideForm.scope === 'instance' ? overrideForm.instance : undefined,
                          rack_id: overrideForm.scope === 'rack' ? overrideForm.rack_id : undefined,
                          metric: overrideForm.metric,
                          value,
                          ttl_seconds: ttl,
                        };
                        const data = await api.addSimulatorOverride(payload);
                        setOverrides((data?.overrides || []) as any[]);
                        setOverrideForm({ scope: overrideForm.scope, instance: '', rack_id: '', metric: 'up', value: '', ttl_seconds: '' });
                      }}
                      className="w-full rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 px-3 py-2 text-xs font-bold uppercase tracking-widest"
                    >
                      Add override
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const data = await api.clearSimulatorOverrides();
                        setOverrides((data?.overrides || []) as any[]);
                      }}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs uppercase tracking-widest text-gray-400"
                    >
                      Reset overrides
                    </button>
                  </div>
                  <div className="mt-4 space-y-2 text-[11px] text-gray-400">
                    {overrides.length === 0 && <div>No overrides set.</div>}
                    {overrides.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
                            {(item.instance || item.rack_id)} · {item.metric}
                          </div>
                          <div>{item.value}</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const data = await api.deleteSimulatorOverride(item.id);
                            setOverrides((data?.overrides || []) as any[]);
                          }}
                          className="text-[10px] uppercase tracking-widest text-status-crit"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

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
