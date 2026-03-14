export type Device = {
  id: string;
  name: string;
  template_id: string;
  u_position: number;
  instance: Record<number, string> | string | string[];
  nodes?: Record<number, string> | string | string[];
  labels?: Record<string, string>;
};

export type Rack = {
  id: string;
  name: string;
  template_id?: string;
  u_height: number;
  aisle_id?: string;
  devices: Device[];
};

export type Aisle = {
  id: string;
  name: string;
  racks: Rack[];
};

export type RoomLayout = {
  shape?: 'rectangle' | 'polygon';
  size?: {
    width?: number;
    height?: number;
  };
  orientation?: {
    north?: 'top' | 'right' | 'bottom' | 'left';
  };
  grid?: {
    enabled?: boolean;
    cell?: number;
  };
  door?: {
    side?: 'north' | 'south' | 'east' | 'west';
    label?: string | null;
    position?: number;
  };
};

export type Room = {
  id: string;
  name: string;
  description?: string;
  layout?: RoomLayout | null;
  aisles: Aisle[];
  standalone_racks: Rack[];
};

export type Site = {
  id: string;
  name: string;
  description?: string | null;
  location?: {
    lat: number;
    lon: number;
    address?: string | null;
  } | null;
  rooms: Room[];
};

export type RackSummary = {
  id: string;
  name: string;
};

export type AisleSummary = {
  id: string;
  name: string;
  racks: RackSummary[];
};

export type RoomSummary = {
  id: string;
  name: string;
  site_id: string;
  aisles?: AisleSummary[];
  standalone_racks?: RackSummary[];
};

export type DeviceContext = {
  device: Device;
  template?: DeviceTemplate | null;
  rack: Rack;
  room: { id: string; name: string };
  site: { id: string; name: string; description?: string };
  aisle?: { id: string; name: string } | null;
};

// ── Catalog ───────────────────────────────────────────────────────────────────

export type LayoutConfig = {
  type: 'grid' | 'vertical';
  rows: number;
  cols: number;
  matrix: number[][];
};

export type DeviceTemplate = {
  id: string;
  name: string;
  type: string;
  storage_type?: string | null;
  role?: string | null;
  u_height: number;
  layout?: LayoutConfig;
  disk_layout?: LayoutConfig;
  rear_layout?: LayoutConfig;
  rear_components?: DeviceRearComponent[];
  checks?: string[];
  metrics?: string[];
  display_thresholds?: {
    temperature?: { warn?: number; crit?: number };
    power?: { warn?: number; crit?: number };
  };
};

export type DeviceRearComponent = {
  id: string;
  name: string;
  type: 'psu' | 'fan' | 'io' | 'hydraulics' | 'other';
  role?: string;
  checks?: string[];
};

export type InfrastructureComponent = {
  id: string;
  name: string;
  type: 'power' | 'cooling' | 'management' | 'network' | 'other';
  model?: string;
  role?: string;
  location: 'u-mount' | 'side-left' | 'side-right' | 'top' | 'bottom';
  u_position?: number;
  u_height?: number;
  checks?: string[];
};

export type RackComponentTemplate = {
  id: string;
  name: string;
  type: string;
  model?: string;
  role?: string;
  location: 'side' | 'u-mount' | 'front' | 'rear';
  side?: 'left' | 'right';
  u_position?: number;
  u_height: number;
  checks?: string[];
  metrics?: string[];
};

export type RackComponentRef = {
  template_id: string;
  u_position: number;
  u_height?: number;
  side?: 'left' | 'right';
};

export type RackTemplate = {
  id: string;
  name: string;
  u_height: number;
  infrastructure: {
    components: InfrastructureComponent[];
    front_components?: InfrastructureComponent[];
    rear_components?: InfrastructureComponent[];
    side_components?: InfrastructureComponent[];
    rack_components?: RackComponentRef[];
  };
  checks?: string[];
  metrics?: string[];
};

export type Catalog = {
  device_templates: DeviceTemplate[];
  rack_templates: RackTemplate[];
  rack_component_templates: RackComponentTemplate[];
};

export type CheckDefinition = {
  id: string;
  name: string;
  scope: 'node' | 'chassis' | 'rack';
  expr: string;
  output?: 'bool' | 'numeric';
  selectors?: string[];
  rules?: {
    op: '==' | '!=' | '>' | '>=' | '<' | '<=';
    value: number | string;
    severity: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
  }[];
  kind?: string;
  for?: string | null;
};

export type ChecksLibrary = {
  checks: CheckDefinition[];
};

export type PrometheusStats = {
  last_ms?: number | null;
  avg_ms?: number | null;
  last_ts?: number | null;
  next_ts?: number | null;
  heartbeat_seconds?: number | null;
};

export type TelemetryStats = {
  query_count: number;
  cache_hits: number;
  cache_misses: number;
  in_flight: number;
  last_batch?: {
    total_ids: number;
    query_count: number;
    max_ids_per_query: number;
    ts: number;
  } | null;
  last_ms?: number | null;
  avg_ms?: number | null;
  last_ts?: number | null;
};

export type GlobalStats = {
  total_rooms: number;
  total_racks: number;
  active_alerts: number;
  crit_count: number;
  warn_count: number;
  status: string;
};

export type AlertCheck = {
  id: string;
  name?: string;
  severity: string;
};

export type ActiveAlert = {
  node_id: string;
  state: string;
  checks: AlertCheck[];
  site_id: string;
  site_name: string;
  room_id: string;
  room_name: string;
  rack_id: string;
  rack_name: string;
  device_id: string;
  device_name: string;
};

export type RackNodeState = {
  state?: string;
  temperature?: number;
  power?: number;
  checks?: AlertCheck[];
  alerts?: AlertCheck[];
};

export type RackState = {
  state?: string;
  /** Node health counts returned by GET /api/rooms/{id}/state */
  node_total?: number;
  node_crit?: number;
  node_warn?: number;
  checks?: AlertCheck[];
  alerts?: AlertCheck[];
  metrics?: {
    temperature?: number;
    power?: number;
  };
  infra_metrics?: {
    components?: Record<
      string,
      {
        activepower_watt?: number;
        activeenergy_wh?: number;
        apparentpower_va?: number;
        current_amp?: number;
        inlet_rating_amp?: number;
      }
    >;
    pdu?: Record<
      string,
      {
        activepower_watt?: number;
        activeenergy_wh?: number;
        apparentpower_va?: number;
        current_amp?: number;
        inlet_rating_amp?: number;
      }
    >;
  };
  nodes?: Record<string, RackNodeState>;
};

export type RoomState = {
  room_id?: string;
  state?: string;
  racks?: Record<string, RackState | string>;
};

export type SlurmNodeState = {
  status: string;
  severity: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
  statuses: string[];
  partitions: string[];
};

export type SlurmRoomNodes = {
  room_id: string;
  nodes: Record<string, SlurmNodeState>;
};

export type SlurmSummary = {
  room_id?: string | null;
  total_nodes: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
};

export type SlurmPartitionSummary = {
  room_id?: string | null;
  partitions: Record<string, Record<string, number>>;
};

export type SlurmNodeEntry = {
  node: string;
  status: string;
  severity: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
  statuses: string[];
  partitions: string[];
  site_id?: string;
  site_name?: string;
  room_id?: string;
  room_name?: string;
  rack_id?: string;
  rack_name?: string;
  device_id?: string;
  device_name?: string;
};

export type AppConfig = {
  app?: {
    name?: string;
    description?: string | null;
  };
  map?: {
    default_view?: 'world' | 'continent' | 'country' | 'city' | null;
    default_zoom?: number | null;
    min_zoom?: number | null;
    max_zoom?: number | null;
    zoom_controls?: boolean;
    style?: string;
    center?: {
      lat: number;
      lon: number;
    } | null;
  };
  paths: {
    topology?: string;
    templates?: string;
    checks?: string;
    metrics?: string;
  };
  refresh: {
    room_state_seconds: number;
    rack_state_seconds: number;
  };
  cache: {
    ttl_seconds: number;
    health_checks_ttl_seconds?: number;
    metrics_ttl_seconds?: number;
    service_ttl_seconds?: number;
  };
  telemetry: {
    prometheus_url?: string | null;
    identity_label?: string;
    rack_label?: string;
    chassis_label?: string;
    job_regex?: string;
    prometheus_heartbeat_seconds?: number;
    prometheus_latency_window?: number;
    debug_stats?: boolean;
    basic_auth_user?: string | null;
    basic_auth_password?: string | null;
    tls_verify?: boolean;
    tls_ca_file?: string | null;
    tls_cert_file?: string | null;
    tls_key_file?: string | null;
  };
  planner?: {
    unknown_state?: string;
    cache_ttl_seconds?: number;
    max_ids_per_query?: number;
  };
  features?: {
    notifications?: boolean;
    notifications_max_visible?: number;
    toast_duration_seconds?: number;
    toast_position?: string;
    toast_stack_threshold?: number;
    aisle_dashboard?: boolean;
    playlist?: boolean;
    offline?: boolean;
    worldmap?: boolean;
    show_logs?: boolean;
    dev_tools?: boolean;
    wizard?: boolean;
  };
  playlist?: {
    interval_seconds?: number;
    views?: string[];
  };
  plugins?: {
    simulator?: {
      enabled?: boolean;
      update_interval_seconds?: number;
      seed?: number | null;
      incident_mode?: string;
      changes_per_hour?: number;
      custom_incidents?: {
        devices_crit?: number;
        devices_warn?: number;
        racks_crit?: number;
        aisles_hot?: number;
      };
      overrides_path?: string;
      default_ttl_seconds?: number;
      metrics_catalog_path?: string;
      metrics_catalogs?: {
        id: string;
        path: string;
        enabled?: boolean;
      }[];
      slurm_alloc_percent?: number;
      slurm_random_statuses?: Record<string, number>;
      slurm_random_match?: string[];
    };
    slurm?: {
      enabled?: boolean;
      metric?: string;
      label_node?: string;
      label_status?: string;
      label_partition?: string;
      roles?: string[];
      include_unlabeled?: boolean;
      mapping_path?: string | null;
      status_map?: {
        ok?: string[];
        warn?: string[];
        crit?: string[];
        info?: string[];
      };
      severity_colors?: {
        ok?: string;
        warn?: string;
        crit?: string;
        info?: string;
      };
    };
    [key: string]:
      | {
          enabled?: boolean;
          [key: string]: unknown;
        }
      | undefined;
  };
  simulator?: {
    enabled?: boolean;
    update_interval_seconds?: number;
    seed?: number | null;
    incident_mode?: string;
    changes_per_hour?: number;
    custom_incidents?: {
      devices_crit?: number;
      devices_warn?: number;
      racks_crit?: number;
      aisles_hot?: number;
    };
    overrides_path?: string;
    default_ttl_seconds?: number;
    metrics_catalog_path?: string;
    metrics_catalogs?: {
      id: string;
      path: string;
      enabled?: boolean;
    }[];
  };
  slurm?: {
    metric?: string;
    label_node?: string;
    label_status?: string;
    label_partition?: string;
    roles?: string[];
    include_unlabeled?: boolean;
    mapping_path?: string | null;
    status_map?: {
      ok?: string[];
      warn?: string[];
      crit?: string[];
    };
  };
  auth?: {
    enabled?: boolean;
    username?: string;
    password_hash?: string;
    secret_key?: string;
    session_duration?: '8h' | '24h' | 'unlimited';
    policy?: {
      min_length?: number;
      max_length?: number;
      require_digit?: boolean;
      require_symbol?: boolean;
    };
    trusted_networks?: string[];
  };
};

export type SimulatorOverride = {
  id: string;
  instance?: string | null;
  rack_id?: string | null;
  metric: string;
  value: number;
  expires_at?: number | null;
};

export type MenuItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
};

export type MenuSection = {
  id: string;
  label: string;
  icon: string;
  items: MenuItem[];
  order: number;
};

export type PluginsMenuResponse = {
  sections: MenuSection[];
};
