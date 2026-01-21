export interface Rack {
  id: string;
  name: string;
  u_height: number;
  aisle_id?: string;
  x?: number;
  y?: number;
  rotation: number;
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
