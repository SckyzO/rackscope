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
  x?: number;
  y?: number;
  rotation: number;
  devices: Device[];
}

export interface Aisle {
  id: string;
  name: string;
  racks: Rack[];
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  aisles: Aisle[];
  standalone_racks: Rack[];
}

export interface Site {
  id: string;
  name: string;
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
  u_height: number;
  layout: LayoutConfig;
  rear_layout?: LayoutConfig;
  rear_components?: DeviceRearComponent[];
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
}

export interface AppConfig {
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
}

export interface SimulatorScenario {
  name: string;
  description?: string | null;
}
