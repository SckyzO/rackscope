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
  };
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
    playlist: boolean;
    offline: boolean;
    demo: boolean;
  };
  plugins: {
    simulator: {
      enabled: boolean;
      update_interval_seconds: string;
      seed: string;
    };
    slurm: {
      enabled: boolean;
      metric: string;
      label_node: string;
      label_status: string;
      label_partition: string;
      mapping_path: string;
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
  },
  paths: {
    topology: config.paths?.topology || '',
    templates: config.paths?.templates || '',
    checks: config.paths?.checks || '',
  },
  refresh: {
    room_state_seconds: String(config.refresh?.room_state_seconds ?? 60),
    rack_state_seconds: String(config.refresh?.rack_state_seconds ?? 60),
  },
  cache: {
    ttl_seconds: String(config.cache?.ttl_seconds ?? 60),
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
    max_ids_per_query: String(config.planner?.max_ids_per_query ?? 300),
  },
  features: {
    notifications: config.features?.notifications ?? false,
    notifications_max_visible: String(config.features?.notifications_max_visible ?? 10),
    playlist: config.features?.playlist ?? false,
    offline: config.features?.offline ?? false,
    demo: config.features?.demo ?? false,
  },
  plugins: {
    simulator: {
      enabled: config.plugins?.simulator?.enabled ?? false,
      update_interval_seconds: String(config.plugins?.simulator?.update_interval_seconds ?? 20),
      seed: String(config.plugins?.simulator?.seed ?? ''),
    },
    slurm: {
      enabled: config.plugins?.slurm?.enabled ?? false,
      metric: config.plugins?.slurm?.metric || 'slurm_node_status',
      label_node: config.plugins?.slurm?.label_node || 'node',
      label_status: config.plugins?.slurm?.label_status || 'status',
      label_partition: config.plugins?.slurm?.label_partition || 'partition',
      mapping_path: config.plugins?.slurm?.mapping_path || '',
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
    center: {
      lat: parseFloat(draft.map.center_lat) || 20,
      lon: parseFloat(draft.map.center_lon) || 0,
    },
  },
  paths: {
    topology: draft.paths.topology,
    templates: draft.paths.templates,
    checks: draft.paths.checks,
  },
  refresh: {
    room_state_seconds: parseInt(draft.refresh.room_state_seconds, 10) || 60,
    rack_state_seconds: parseInt(draft.refresh.rack_state_seconds, 10) || 60,
  },
  cache: {
    ttl_seconds: parseInt(draft.cache.ttl_seconds, 10) || 60,
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
    max_ids_per_query: parseInt(draft.planner.max_ids_per_query, 10) || 300,
  },
  features: {
    notifications: draft.features.notifications,
    notifications_max_visible: parseInt(draft.features.notifications_max_visible, 10) || 10,
    playlist: draft.features.playlist,
    offline: draft.features.offline,
    demo: draft.features.demo,
  },
  plugins: {
    simulator: {
      enabled: draft.plugins.simulator.enabled,
      update_interval_seconds: parseInt(draft.plugins.simulator.update_interval_seconds, 10) || 20,
      seed: draft.plugins.simulator.seed ? parseInt(draft.plugins.simulator.seed, 10) : null,
    },
    slurm: {
      enabled: draft.plugins.slurm.enabled,
      metric: draft.plugins.slurm.metric,
      label_node: draft.plugins.slurm.label_node,
      label_status: draft.plugins.slurm.label_status,
      label_partition: draft.plugins.slurm.label_partition,
      mapping_path: draft.plugins.slurm.mapping_path,
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

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        setDraft(buildDraftFromConfig(config));
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
    saveConfig,
  };
};
