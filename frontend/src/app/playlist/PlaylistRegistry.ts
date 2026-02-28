import type { ElementType } from 'react';
import {
  BarChart2,
  Globe,
  DoorOpen,
  Cpu,
  Activity,
  MapPin,
  List,
  AlertTriangle,
  Bell,
  Server,
} from 'lucide-react';
import type { RoomSummary } from '../../types';

// ── Icon registry ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, ElementType> = {
  BarChart2,
  Globe,
  DoorOpen,
  Cpu,
  Activity,
  MapPin,
  List,
  AlertTriangle,
  Bell,
  Server,
};

export const getIcon = (name: string): ElementType => ICON_MAP[name] ?? BarChart2;

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlaylistMode = 'normal' | 'focused' | 'kiosk';

export interface RegistryPage {
  id: string;
  title: string;
  iconName: string;
  route: string;
  dynamic?: 'rooms';
  requiresPlugin?: 'slurm';
  requiresFeature?: 'worldmap' | 'notifications';
}

export interface RegistryCategory {
  id: string;
  label: string;
  iconName: string;
  pages: RegistryPage[];
  requiresPlugin?: 'slurm';
}

export interface PlaylistQueueItem {
  id: string;
  title: string;
  route: string;
  iconName: string;
  duration: number; // seconds, 0 = use global
}

// ── Registry definition ───────────────────────────────────────────────────────

export const PLAYLIST_REGISTRY: RegistryCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    iconName: 'BarChart2',
    pages: [{ id: 'dashboard', title: 'Dashboard', iconName: 'BarChart2', route: '/cosmos' }],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    iconName: 'Server',
    pages: [
      {
        id: 'worldmap',
        title: 'World Map',
        iconName: 'Globe',
        route: '/views/worldmap',
        requiresFeature: 'worldmap',
      },
      {
        id: 'room-{id}',
        title: 'Room: {name}',
        iconName: 'DoorOpen',
        route: '/views/room/{id}',
        dynamic: 'rooms',
      },
    ],
  },
  {
    id: 'slurm',
    label: 'Slurm',
    iconName: 'Cpu',
    requiresPlugin: 'slurm',
    pages: [
      {
        id: 'slurm-overview',
        title: 'Slurm Overview',
        iconName: 'Activity',
        route: '/slurm/overview',
      },
      {
        id: 'slurm-wallboard-{id}',
        title: 'Wallboard: {name}',
        iconName: 'MapPin',
        route: '/slurm/wallboard/{id}',
        dynamic: 'rooms',
        requiresPlugin: 'slurm',
      },
      {
        id: 'slurm-nodes',
        title: 'Slurm Nodes',
        iconName: 'List',
        route: '/slurm/nodes',
      },
      {
        id: 'slurm-alerts',
        title: 'Slurm Alerts',
        iconName: 'AlertTriangle',
        route: '/slurm/alerts',
      },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    iconName: 'Bell',
    pages: [
      {
        id: 'notifications',
        title: 'Notifications',
        iconName: 'Bell',
        route: '/notifications',
        requiresFeature: 'notifications',
      },
    ],
  },
];

// ── expandRegistry ─────────────────────────────────────────────────────────────
//
// Expands dynamic 'rooms' entries into one item per room,
// and filters by requiresPlugin / requiresFeature.

interface ExpandOptions {
  rooms: RoomSummary[];
  features: { worldmap: boolean; notifications: boolean };
  pluginSlurm: boolean;
}

export interface ExpandedCategory {
  id: string;
  label: string;
  iconName: string;
  pages: PlaylistQueueItem[];
}

export const expandRegistry = (
  registry: RegistryCategory[],
  { rooms, features, pluginSlurm }: ExpandOptions
): ExpandedCategory[] => {
  return registry
    .filter((cat) => {
      if (cat.requiresPlugin === 'slurm' && !pluginSlurm) return false;
      return true;
    })
    .map((cat) => {
      const expanded: PlaylistQueueItem[] = [];

      for (const page of cat.pages) {
        // Filter by feature requirements
        if (page.requiresFeature === 'worldmap' && !features.worldmap) continue;
        if (page.requiresFeature === 'notifications' && !features.notifications) continue;
        // Filter by plugin requirements
        if (page.requiresPlugin === 'slurm' && !pluginSlurm) continue;

        if (page.dynamic === 'rooms') {
          // Expand into one item per room
          for (const room of rooms) {
            expanded.push({
              id: page.id.replace('{id}', room.id),
              title: page.title.replace('{name}', room.name).replace('{id}', room.id),
              route: page.route.replace('{id}', room.id),
              iconName: page.iconName,
              duration: 0,
            });
          }
        } else {
          expanded.push({
            id: page.id,
            title: page.title,
            route: page.route,
            iconName: page.iconName,
            duration: 0,
          });
        }
      }

      return { id: cat.id, label: cat.label, iconName: cat.iconName, pages: expanded };
    })
    .filter((cat) => cat.pages.length > 0);
};
