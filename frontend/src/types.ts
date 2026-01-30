export interface Device {
  id: string;
  name: string;
  template_id: string;
  u_position: number;
  instance: Record<number, string> | string;
  nodes?: Record<number, string> | string;
}

export interface Rack {
  id: string;
  name: string;
  template_id?: string;
  u_height: number;
  aisle_id?: string;
  devices: Device[];
}

export interface Aisle {
  id: string;
  name: string;
  racks: Rack[];
}

export interface RoomLayout {
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
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  layout?: RoomLayout | null;
  aisles: Aisle[];
  standalone_racks: Rack[];
}

export interface Site {
  id: string;
  name: string;
  description?: string | null;
  location?: {
    lat: number;
    lon: number;
    address?: string | null;
  } | null;
  rooms: Room[];
}

export interface RackSummary {
  id: string;
  name: string;
}

export interface AisleSummary {
  id: string;
  name: string;
  racks: RackSummary[];
}

export interface RoomSummary {
  id: string;
  name: string;
  site_id: string;
  aisles?: AisleSummary[];
}

// --- Catalog Types ---

export interface LayoutConfig {
  type: 'grid' | 'vertical';
  rows: number;
  cols: number;
  matrix: number[][];
}

export interface DeviceTemplate {
  id: string;
  name: string;
  type: string;
  role?: string | null;
  u_height: number;
  layout: LayoutConfig;
  rear_layout?: LayoutConfig;
  rear_components?: DeviceRearComponent[];
  checks?: string[];
}

export interface DeviceRearComponent {
  id: string;
  name: string;
  type: 'psu' | 'fan' | 'io' | 'hydraulics' | 'other';
  role?: string;
  checks?: string[];
}

export interface InfrastructureComponent {
  id: string;
  name: string;
  type: 'power' | 'cooling' | 'management' | 'network' | 'other';
  model?: string;
  role?: string;
  location: 'u-mount' | 'side-left' | 'side-right' | 'top' | 'bottom';
  u_position?: number;
  u_height?: number;
}

export interface RackTemplate {
  id: string;
  name: string;
  u_height: number;
  infrastructure: {
    components: InfrastructureComponent[];
    front_components?: InfrastructureComponent[];
    rear_components?: InfrastructureComponent[];
    side_components?: InfrastructureComponent[];
  };
  checks?: string[];
}

export interface Catalog {
  device_templates: DeviceTemplate[];
  rack_templates: RackTemplate[];
}

export interface CheckDefinition {
  id: string;
  name: string;
  scope: 'node' | 'chassis' | 'rack';
  expr: string;
  output?: 'bool' | 'numeric';
  selectors?: string[];
  rules?: Array<{
    op: '==' | '!=' | '>' | '>=' | '<' | '<=';
    value: number | string;
    severity: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
  }>;
  kind?: string;
}

export interface ChecksLibrary {
  checks: CheckDefinition[];
}

export interface PrometheusStats {
  last_ms?: number | null;
  avg_ms?: number | null;
  last_ts?: number | null;
  next_ts?: number | null;
  heartbeat_seconds?: number | null;
}

export interface TelemetryStats {
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
}

export interface GlobalStats {
  total_rooms: number;
  total_racks: number;
  active_alerts: number;
  crit_count: number;
  warn_count: number;
  status: string;
}

export interface AlertCheck {
  id: string;
  severity: string;
}

export interface ActiveAlert {
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
}

export interface RackNodeState {
  state?: string;
  temperature?: number;
  power?: number;
  alerts?: AlertCheck[];
}

export interface RackState {
  state?: string;
  metrics?: {
    temperature?: number;
    power?: number;
  };
  nodes?: Record<string, RackNodeState>;
}

export interface RoomState {
  room_id?: string;
  state?: string;
  racks?: Record<string, RackState | string>;
}

export interface SlurmNodeState {
  status: string;
  severity: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
  statuses: string[];
  partitions: string[];
}

export interface SlurmRoomNodes {
  room_id: string;
  nodes: Record<string, SlurmNodeState>;
}

export interface AppConfig {
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
    center?: {
      lat: number;
      lon: number;
    } | null;
  };
  paths: {
    topology?: string;
    templates?: string;
    checks?: string;
  };
  refresh: {
    room_state_seconds: number;
    rack_state_seconds: number;
  };
  cache: {
    ttl_seconds: number;
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
    playlist?: boolean;
    offline?: boolean;
    demo?: boolean;
  };
  simulator?: {
    update_interval_seconds?: number;
    seed?: number | null;
    scenario?: string | null;
    scale_factor?: number;
    default_ttl_seconds?: number;
    metrics_catalog_path?: string;
    metrics_catalogs?: Array<{
      id: string;
      path: string;
      enabled?: boolean;
    }>;
    incident_rates?: {
      node_micro_failure?: number;
      rack_macro_failure?: number;
      aisle_cooling_failure?: number;
    };
    incident_durations?: {
      rack?: number;
      aisle?: number;
    };
    overrides_path?: string;
  };
  slurm?: {
    metric?: string;
    label_node?: string;
    label_status?: string;
    label_partition?: string;
    roles?: string[];
    include_unlabeled?: boolean;
    status_map?: {
      ok?: string[];
      warn?: string[];
      crit?: string[];
    };
  };
}

export interface SimulatorScenario {
  name: string;
  description?: string | null;
}

export interface SimulatorOverride {
  id: string;
  instance?: string | null;
  rack_id?: string | null;
  metric: string;
  value: number;
  expires_at?: number | null;
}
