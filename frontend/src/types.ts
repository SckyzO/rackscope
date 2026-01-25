export interface Device {
  id: string;
  name: string;
  template_id: string;
  u_position: number;
  nodes: Record<number, string> | string;
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
  };
}
