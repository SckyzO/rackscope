import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AppConfig } from '../../types';

export type ConfigDraft = {
  app: {
    name: string;
    description: string;
  };
  map: {
    default_view: string;
    default_zoom: string;
    min_zoom: string;
    max_zoom: string;
    zoom_controls: boolean;
    center_lat: string;
    center_lon: string;
    style: string;
  };
  paths: {
    topology: string;
    templates: string;
    checks: string;
    metrics: string;
  };
  refresh: {
    room_state_seconds: string;
    rack_state_seconds: string;
  };
  cache: {
    ttl_seconds: string;
    health_checks_ttl_seconds: string;
    metrics_ttl_seconds: string;
  };
  telemetry: {
    prometheus_url: string;
    identity_label: string;
    rack_label: string;
    chassis_label: string;
    job_regex: string;
    prometheus_heartbeat_seconds: string;
    prometheus_latency_window: string;
    debug_stats: boolean;
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
    toast_duration_seconds: string;
    toast_position: string;
    toast_stack_threshold: string;
    worldmap: boolean;
    aisle_dashboard: boolean;
    dev_tools: boolean;
    playlist: boolean;
    offline: boolean;
  };
  playlist: {
    interval_seconds: string;
    views: string[];
  };
  auth: {
    enabled: boolean;
    session_duration: string;
    password_hash: string;
    policy_min_length: string;
    policy_max_length: string;
    policy_require_digit: boolean;
    policy_require_symbol: boolean;
  };
  plugins: {
    simulator: {
      enabled: boolean;
      update_interval_seconds: string;
      seed: string;
      scenario: string;
      scale_factor: string;
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
      default_ttl_seconds: string;
      metrics_catalog_path: string;
      metrics_catalogs: Array<{
        id: string;
        path: string;
        enabled: boolean;
      }>;
    };
    slurm: {
      enabled: boolean;
      metric: string;
      label_node: string;
      label_status: string;
      label_partition: string;
      mapping_path: string;
      roles: string[];
      include_unlabeled: boolean;
      status_map: {
        ok: string[];
        warn: string[];
        crit: string[];
        info: string[];
      };
      severity_colors: {
        ok: string;
        warn: string;
        crit: string;
        info: string;
      };
    };
  };
};

const buildDraftFromConfig = (config: AppConfig): ConfigDraft => ({
  app: {
    name: config.app?.name || 'Rackscope',
    description: config.app?.description || 'Datacenter Overview',
  },
  map: {
    default_view: config.map?.default_view || 'world',
    default_zoom: String(config.map?.default_zoom ?? 4),
    min_zoom: String(config.map?.min_zoom ?? 2),
    max_zoom: String(config.map?.max_zoom ?? 7),
    zoom_controls: config.map?.zoom_controls ?? true,
    center_lat: String(config.map?.center?.lat ?? 20),
    center_lon: String(config.map?.center?.lon ?? 0),
    style: localStorage.getItem('rackscope.map.style') || config.map?.style || 'minimal',
  },
  paths: {
    topology: config.paths?.topology || '',
    templates: config.paths?.templates || '',
    checks: config.paths?.checks || '',
    metrics: config.paths?.metrics || '',
  },
  refresh: {
    room_state_seconds: String(config.refresh?.room_state_seconds ?? 60),
    rack_state_seconds: String(config.refresh?.rack_state_seconds ?? 60),
  },
  cache: {
    ttl_seconds: String(config.cache?.ttl_seconds ?? 60),
    health_checks_ttl_seconds: String(config.cache?.health_checks_ttl_seconds ?? 30),
    metrics_ttl_seconds: String(config.cache?.metrics_ttl_seconds ?? 120),
  },
  telemetry: {
    prometheus_url: config.telemetry?.prometheus_url || '',
    identity_label: config.telemetry?.identity_label || 'instance',
    rack_label: config.telemetry?.rack_label || 'rack_id',
    chassis_label: config.telemetry?.chassis_label || 'chassis_id',
    job_regex: config.telemetry?.job_regex || '.*',
    prometheus_heartbeat_seconds: String(config.telemetry?.prometheus_heartbeat_seconds ?? 30),
    prometheus_latency_window: String(config.telemetry?.prometheus_latency_window ?? 20),
    debug_stats: config.telemetry?.debug_stats ?? false,
    basic_auth_user: config.telemetry?.basic_auth_user || '',
    basic_auth_password: config.telemetry?.basic_auth_password || '',
    tls_verify: config.telemetry?.tls_verify ?? true,
    tls_ca_file: config.telemetry?.tls_ca_file || '',
    tls_cert_file: config.telemetry?.tls_cert_file || '',
    tls_key_file: config.telemetry?.tls_key_file || '',
  },
  planner: {
    unknown_state: config.planner?.unknown_state || 'UNKNOWN',
    cache_ttl_seconds: String(config.planner?.cache_ttl_seconds ?? 60),
    max_ids_per_query: String(config.planner?.max_ids_per_query ?? 200),
  },
  features: {
    notifications: config.features?.notifications ?? true,
    notifications_max_visible: String(config.features?.notifications_max_visible ?? 10),
    toast_duration_seconds: String(config.features?.toast_duration_seconds ?? 15),
    toast_position: config.features?.toast_position || 'bottom-right',
    toast_stack_threshold: String(config.features?.toast_stack_threshold ?? 5),
    worldmap: config.features?.worldmap ?? true,
    aisle_dashboard: config.features?.aisle_dashboard ?? true,
    dev_tools: config.features?.dev_tools ?? false,
    playlist: config.features?.playlist ?? false,
    offline: config.features?.offline ?? false,
  },
  playlist: {
    interval_seconds: String(config.playlist?.interval_seconds ?? 30),
    views: config.playlist?.views ?? ['/views/worldmap', '/slurm/overview'],
  },
  auth: {
    enabled: config.auth?.enabled ?? false,
    session_duration: config.auth?.session_duration ?? '24h',
    password_hash: config.auth?.password_hash ?? '',
    policy_min_length: String(config.auth?.policy?.min_length ?? 6),
    policy_max_length: String(config.auth?.policy?.max_length ?? 128),
    policy_require_digit: config.auth?.policy?.require_digit ?? false,
    policy_require_symbol: config.auth?.policy?.require_symbol ?? false,
  },
  plugins: {
    simulator: {
      enabled: config.plugins?.simulator?.enabled ?? false,
      update_interval_seconds: String(config.plugins?.simulator?.update_interval_seconds ?? 20),
      seed: String(config.plugins?.simulator?.seed ?? ''),
      scenario: config.plugins?.simulator?.scenario || 'full-ok',
      scale_factor: String(config.plugins?.simulator?.scale_factor ?? 1.0),
      incident_rates: {
        node_micro_failure: String(
          config.plugins?.simulator?.incident_rates?.node_micro_failure ?? 0.001
        ),
        rack_macro_failure: String(
          config.plugins?.simulator?.incident_rates?.rack_macro_failure ?? 0.01
        ),
        aisle_cooling_failure: String(
          config.plugins?.simulator?.incident_rates?.aisle_cooling_failure ?? 0.005
        ),
      },
      incident_durations: {
        rack: String(config.plugins?.simulator?.incident_durations?.rack ?? 3),
        aisle: String(config.plugins?.simulator?.incident_durations?.aisle ?? 5),
      },
      overrides_path:
        config.plugins?.simulator?.overrides_path || 'config/plugins/simulator/overrides.yaml',
      default_ttl_seconds: String(config.plugins?.simulator?.default_ttl_seconds ?? 120),
      metrics_catalog_path:
        config.plugins?.simulator?.metrics_catalog_path ||
        'config/plugins/simulator/metrics_full.yaml',
      metrics_catalogs: config.plugins?.simulator?.metrics_catalogs || [],
    },
    slurm: {
      enabled: config.plugins?.slurm?.enabled ?? false,
      metric: config.plugins?.slurm?.metric || 'slurm_node_status',
      label_node: config.plugins?.slurm?.label_node || 'node',
      label_status: config.plugins?.slurm?.label_status || 'status',
      label_partition: config.plugins?.slurm?.label_partition || 'partition',
      mapping_path: config.plugins?.slurm?.mapping_path || '',
      roles: config.plugins?.slurm?.roles || [],
      include_unlabeled: config.plugins?.slurm?.include_unlabeled ?? false,
      status_map: {
        ok: config.plugins?.slurm?.status_map?.ok || [
          'idle',
          'allocated',
          'alloc',
          'completing',
          'comp',
        ],
        warn: config.plugins?.slurm?.status_map?.warn || [
          'mixed',
          'mix',
          'maint',
          'planned',
          'plnd',
          'reserved',
          'resv',
        ],
        crit: config.plugins?.slurm?.status_map?.crit || [
          'down',
          'drain',
          'drained',
          'draining',
          'drng',
          'fail',
          'failing',
          'failg',
          'error',
        ],
        info: config.plugins?.slurm?.status_map?.info || [],
      },
      severity_colors: {
        ok: config.plugins?.slurm?.severity_colors?.ok || '#22c55e',
        warn: config.plugins?.slurm?.severity_colors?.warn || '#f59e0b',
        crit: config.plugins?.slurm?.severity_colors?.crit || '#ef4444',
        info: config.plugins?.slurm?.severity_colors?.info || '#3b82f6',
      },
    },
  },
});

const buildConfigFromDraft = (draft: ConfigDraft): Partial<AppConfig> => ({
  app: {
    name: draft.app.name,
    description: draft.app.description,
  },
  map: {
    default_view: draft.map.default_view,
    default_zoom: parseInt(draft.map.default_zoom, 10) || 4,
    min_zoom: parseInt(draft.map.min_zoom, 10) || 2,
    max_zoom: parseInt(draft.map.max_zoom, 10) || 7,
    zoom_controls: draft.map.zoom_controls,
    style: draft.map.style,
    center: {
      lat: parseFloat(draft.map.center_lat) || 20,
      lon: parseFloat(draft.map.center_lon) || 0,
    },
  },
  paths: {
    topology: draft.paths.topology,
    templates: draft.paths.templates,
    checks: draft.paths.checks,
    metrics: draft.paths.metrics,
  },
  refresh: {
    room_state_seconds: parseInt(draft.refresh.room_state_seconds, 10) || 60,
    rack_state_seconds: parseInt(draft.refresh.rack_state_seconds, 10) || 60,
  },
  cache: {
    ttl_seconds: parseInt(draft.cache.ttl_seconds, 10) || 60,
    health_checks_ttl_seconds: parseInt(draft.cache.health_checks_ttl_seconds, 10) || 30,
    metrics_ttl_seconds: parseInt(draft.cache.metrics_ttl_seconds, 10) || 120,
  },
  telemetry: {
    prometheus_url: draft.telemetry.prometheus_url,
    identity_label: draft.telemetry.identity_label,
    rack_label: draft.telemetry.rack_label,
    chassis_label: draft.telemetry.chassis_label,
    job_regex: draft.telemetry.job_regex,
    prometheus_heartbeat_seconds: parseInt(draft.telemetry.prometheus_heartbeat_seconds, 10) || 30,
    prometheus_latency_window: parseInt(draft.telemetry.prometheus_latency_window, 10) || 20,
    debug_stats: draft.telemetry.debug_stats,
    basic_auth_user: draft.telemetry.basic_auth_user,
    basic_auth_password: draft.telemetry.basic_auth_password,
    tls_verify: draft.telemetry.tls_verify,
    tls_ca_file: draft.telemetry.tls_ca_file,
    tls_cert_file: draft.telemetry.tls_cert_file,
    tls_key_file: draft.telemetry.tls_key_file,
  },
  planner: {
    unknown_state: draft.planner.unknown_state,
    cache_ttl_seconds: parseInt(draft.planner.cache_ttl_seconds, 10) || 60,
    max_ids_per_query: parseInt(draft.planner.max_ids_per_query, 10) || 200,
  },
  features: {
    notifications: draft.features.notifications,
    notifications_max_visible: parseInt(draft.features.notifications_max_visible, 10) || 10,
    toast_duration_seconds: parseInt(draft.features.toast_duration_seconds, 10) || 15,
    toast_position: draft.features.toast_position,
    toast_stack_threshold: parseInt(draft.features.toast_stack_threshold, 10) || 5,
    worldmap: draft.features.worldmap,
    aisle_dashboard: draft.features.aisle_dashboard,
    dev_tools: draft.features.dev_tools,
    playlist: draft.features.playlist,
    offline: draft.features.offline,
  },
  playlist: {
    interval_seconds: parseInt(draft.playlist.interval_seconds, 10) || 30,
    views: draft.playlist.views,
  },
  auth: {
    enabled: draft.auth.enabled,
    session_duration: draft.auth.session_duration as '8h' | '24h' | 'unlimited',
    policy: {
      min_length: parseInt(draft.auth.policy_min_length, 10) || 6,
      max_length: parseInt(draft.auth.policy_max_length, 10) || 128,
      require_digit: draft.auth.policy_require_digit,
      require_symbol: draft.auth.policy_require_symbol,
    },
  },
  plugins: {
    simulator: {
      enabled: draft.plugins.simulator.enabled,
      update_interval_seconds: parseInt(draft.plugins.simulator.update_interval_seconds, 10) || 20,
      seed: draft.plugins.simulator.seed ? parseInt(draft.plugins.simulator.seed, 10) : null,
      scenario: draft.plugins.simulator.scenario,
      scale_factor: parseFloat(draft.plugins.simulator.scale_factor) || 1.0,
      incident_rates: {
        node_micro_failure:
          parseFloat(draft.plugins.simulator.incident_rates.node_micro_failure) || 0.001,
        rack_macro_failure:
          parseFloat(draft.plugins.simulator.incident_rates.rack_macro_failure) || 0.01,
        aisle_cooling_failure:
          parseFloat(draft.plugins.simulator.incident_rates.aisle_cooling_failure) || 0.005,
      },
      incident_durations: {
        rack: parseInt(draft.plugins.simulator.incident_durations.rack, 10) || 3,
        aisle: parseInt(draft.plugins.simulator.incident_durations.aisle, 10) || 5,
      },
      overrides_path: draft.plugins.simulator.overrides_path,
      default_ttl_seconds: parseInt(draft.plugins.simulator.default_ttl_seconds, 10) || 120,
      metrics_catalog_path: draft.plugins.simulator.metrics_catalog_path,
      metrics_catalogs: draft.plugins.simulator.metrics_catalogs,
    },
    slurm: {
      enabled: draft.plugins.slurm.enabled,
      metric: draft.plugins.slurm.metric,
      label_node: draft.plugins.slurm.label_node,
      label_status: draft.plugins.slurm.label_status,
      label_partition: draft.plugins.slurm.label_partition,
      mapping_path: draft.plugins.slurm.mapping_path,
      roles: draft.plugins.slurm.roles,
      include_unlabeled: draft.plugins.slurm.include_unlabeled,
      status_map: {
        ok: draft.plugins.slurm.status_map.ok,
        warn: draft.plugins.slurm.status_map.warn,
        crit: draft.plugins.slurm.status_map.crit,
        info: draft.plugins.slurm.status_map.info,
      },
      severity_colors: {
        ok: draft.plugins.slurm.severity_colors.ok,
        warn: draft.plugins.slurm.severity_colors.warn,
        crit: draft.plugins.slurm.severity_colors.crit,
        info: draft.plugins.slurm.severity_colors.info,
      },
    },
  },
});

export const useSettingsConfig = () => {
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Digest of the last saved/loaded config — used to detect unsaved changes
  const [savedDigest, setSavedDigest] = useState<string>('');

  const isDirty = draft !== null && savedDigest !== '' && JSON.stringify(draft) !== savedDigest;

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        const built = buildDraftFromConfig(config);
        setDraft(built);
        setSavedDigest(JSON.stringify(built));
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    if (!draft) return;

    setSaving(true);
    setSaved(false);

    try {
      const config = buildConfigFromDraft(draft);
      await api.updateConfig(config as AppConfig);
      setSaved(true);
      setSavedDigest(JSON.stringify(draft));

      // Trigger backend restart to reload plugin configuration
      try {
        await api.restartBackend();
      } catch (err) {
        console.warn('Failed to restart backend, reloading page anyway:', err);
      }

      // Reload page after 2 seconds to allow backend to restart
      // This refreshes the sidebar menu and applies plugin changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
      setSaving(false);
    }
  };

  return {
    draft,
    setDraft,
    loading,
    saving,
    saved,
    isDirty,
    saveConfig,
  };
};
