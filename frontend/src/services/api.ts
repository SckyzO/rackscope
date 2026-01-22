import type { Site, Room, RoomSummary, DeviceTemplate, Rack } from '../types';

export const api = {
  getSites: async (): Promise<Site[]> => {
    const res = await fetch('/api/sites');
    return res.json();
  },
  getCatalog: async (): Promise<{ device_templates: DeviceTemplate[], rack_templates: any[] }> => {
    const res = await fetch('/api/catalog');
    return res.json();
  },
  getRack: async (rackId: string): Promise<Rack> => {
    const res = await fetch(`/api/racks/${rackId}`);
    if (!res.ok) throw new Error('Rack not found');
    return res.json();
  },
  getRooms: async (): Promise<RoomSummary[]> => {
    const res = await fetch('/api/rooms');
    return res.json();
  },
  getRoomLayout: async (roomId: string): Promise<Room> => {
    const res = await fetch(`/api/rooms/${roomId}/layout`);
    if (!res.ok) throw new Error('Room not found');
    return res.json();
  },
  getRoomState: async (roomId: string) => {
    const res = await fetch(`/api/rooms/${roomId}/state`);
    return res.json();
  },
  getRackState: async (rackId: string) => {
    const res = await fetch(`/api/racks/${rackId}/state`);
    return res.json();
  }
};
