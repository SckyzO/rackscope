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

export interface RoomSummary {
  id: string;
  name: string;
  site_id: string;
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
  u_height: number;
  layout: LayoutConfig;
}