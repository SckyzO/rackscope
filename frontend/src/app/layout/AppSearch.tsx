import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Server,
  Cpu,
  DoorOpen,
  Globe,
  Settings,
  BarChart2,
  Activity,
  AlertTriangle,
  LayoutDashboard,
  Bell,
} from 'lucide-react';
import { api } from '@src/services/api';
import type { Site } from '@src/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = 'rack' | 'device' | 'room' | 'site' | 'page';

type SearchResult = {
  id: string;
  label: string;
  sublabel: string;
  category: Category;
  href: string;
  keywords?: string[]; // instance names, IDs, etc.
};

// ── Instance expansion (same as DevicePage) ────────────────────────────────────

function expandInstances(instance: unknown): string[] {
  if (!instance) return [];
  if (typeof instance === 'string') {
    const m = /^(.*)\[(\d+)-(\d+)\](.*)$/.exec(instance);
    if (m) {
      const [, prefix, start, end, suffix] = m;
      const w = Math.max(start.length, end.length);
      return Array.from(
        { length: parseInt(end) - parseInt(start) + 1 },
        (_, i) => `${prefix}${String(parseInt(start) + i).padStart(w, '0')}${suffix ?? ''}`
      );
    }
    return [instance];
  }
  if (Array.isArray(instance)) return instance as string[];
  if (typeof instance === 'object' && instance !== null)
    return Object.values(instance as Record<string, string>);
  return [];
}

// ── Static pages ──────────────────────────────────────────────────────────────

const PAGES: SearchResult[] = [
  {
    id: 'worldmap',
    label: 'World Map',
    sublabel: 'Monitoring',
    category: 'page',
    href: '/views/worldmap',
  },
  {
    id: 'cluster-overview',
    label: 'Cluster Overview',
    sublabel: 'Infrastructure',
    category: 'page',
    href: '/views/cluster',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    sublabel: 'Monitoring',
    category: 'page',
    href: '/notifications',
  },
  {
    id: 'slurm-overview',
    label: 'Slurm Overview',
    sublabel: 'Slurm',
    category: 'page',
    href: '/slurm/overview',
  },
  {
    id: 'slurm-nodes',
    label: 'Slurm Nodes',
    sublabel: 'Slurm',
    category: 'page',
    href: '/slurm/nodes',
  },
  {
    id: 'slurm-alerts',
    label: 'Slurm Alerts',
    sublabel: 'Slurm',
    category: 'page',
    href: '/slurm/alerts',
  },
  {
    id: 'slurm-partitions',
    label: 'Slurm Partitions',
    sublabel: 'Slurm',
    category: 'page',
    href: '/slurm/partitions',
  },
  {
    id: 'datacenter',
    label: 'Datacenter Editor',
    sublabel: 'Editors',
    category: 'page',
    href: '/editors/datacenter',
  },
  {
    id: 'rack-editor',
    label: 'Rack Editor',
    sublabel: 'Editors',
    category: 'page',
    href: '/editors/rack',
  },
  {
    id: 'templates',
    label: 'Templates Editor',
    sublabel: 'Editors',
    category: 'page',
    href: '/editors/templates',
  },
  {
    id: 'checks',
    label: 'Checks Library',
    sublabel: 'Editors',
    category: 'page',
    href: '/editors/checks',
  },
  {
    id: 'settings',
    label: 'Settings',
    sublabel: 'Configuration',
    category: 'page',
    href: '/settings',
  },
  {
    id: 'settings-plugins',
    label: 'Settings — Plugins',
    sublabel: 'Configuration',
    category: 'page',
    href: '/settings#plugins',
  },
  {
    id: 'health',
    label: 'Health Status',
    sublabel: 'Rackscope',
    category: 'page',
    href: '/rackscope/health',
  },
  {
    id: 'alerts',
    label: 'Alert Feed',
    sublabel: 'Rackscope',
    category: 'page',
    href: '/rackscope/alerts',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<Category, string> = {
  rack: 'Racks',
  device: 'Devices',
  room: 'Rooms',
  site: 'Sites',
  page: 'Pages',
};

const CATEGORY_ORDER: Category[] = ['rack', 'device', 'room', 'site', 'page'];

function buildIndex(sites: Site[]): SearchResult[] {
  const results: SearchResult[] = [];
  for (const site of sites) {
    results.push({
      id: `site-${site.id}`,
      label: site.name,
      sublabel: site.id,
      category: 'site',
      href: '/views/worldmap',
    });
    for (const room of site.rooms ?? []) {
      results.push({
        id: `room-${room.id}`,
        label: room.name,
        sublabel: site.name,
        category: 'room',
        href: `/views/room/${room.id}`,
      });
      for (const aisle of room.aisles ?? []) {
        for (const rack of aisle.racks ?? []) {
          results.push({
            id: `rack-${rack.id}`,
            label: rack.name || rack.id,
            sublabel: `${room.name} · ${aisle.name}`,
            category: 'rack',
            href: `/views/rack/${rack.id}`,
          });
          for (const device of rack.devices ?? []) {
            const instances = expandInstances(device.instance ?? device.nodes);
            results.push({
              id: `device-${rack.id}-${device.id}`,
              label: device.name || device.id,
              sublabel: `${rack.name || rack.id} · ${room.name}`,
              category: 'device',
              href: `/views/device/${rack.id}/${device.id}`,
              keywords: [device.id, ...instances],
            });
          }
        }
      }
      for (const rack of room.standalone_racks ?? []) {
        results.push({
          id: `rack-${rack.id}`,
          label: rack.name || rack.id,
          sublabel: `${room.name} · Standalone`,
          category: 'rack',
          href: `/views/rack/${rack.id}`,
        });
      }
    }
  }
  return results;
}

function filterResults(index: SearchResult[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const all = [...index, ...PAGES].filter(
    (r) =>
      r.label.toLowerCase().includes(q) ||
      r.sublabel.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.keywords?.some((k) => k.toLowerCase().includes(q))
  );
  // Group by category, max 5 per group
  const groups: Partial<Record<Category, SearchResult[]>> = {};
  for (const r of all) {
    groups[r.category] ??= [];
    if ((groups[r.category]!).length < 5)
      (groups[r.category]!).push(r);
  }
  return CATEGORY_ORDER.flatMap((cat) => groups[cat] ?? []);
}

const RESULT_ICON: Record<Category, React.ElementType> = {
  rack: Server,
  device: Cpu,
  room: DoorOpen,
  site: Globe,
  page: LayoutDashboard,
};

// ── AppSearch component ────────────────────────────────────────────────────

export const AppSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<SearchResult[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = filterResults(index, query);

  // Lazy-load data on first focus
  const loadData = useCallback(async () => {
    if (loaded) return;
    try {
      const sites = await api.getSites();
      setIndex(buildIndex(Array.isArray(sites) ? sites : []));
      setLoaded(true);
    } catch {
      /* ignore */
    }
  }, [loaded]);

  // Ctrl+K / Cmd+K — open search from anywhere
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        void loadData();
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [loadData]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      setActiveIdx(-1);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      const r = results[activeIdx];
      void navigate(r.href);
      setOpen(false);
      setQuery('');
      setActiveIdx(-1);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (r: SearchResult) => {
    void navigate(r.href);
    setOpen(false);
    setQuery('');
    setActiveIdx(-1);
  };

  // Group results for display
  const grouped: { category: Category; items: SearchResult[] }[] = [];
  let currentCat: Category | null = null;
  for (const r of results) {
    if (r.category !== currentCat) {
      grouped.push({ category: r.category, items: [] });
      currentCat = r.category;
    }
    grouped[grouped.length - 1].items.push(r);
  }

  // Compute flat index for keyboard nav
  const flatIdx = (cat: Category, idxInGroup: number): number => {
    let flat = 0;
    for (const g of grouped) {
      if (g.category === cat) return flat + idxInGroup;
      flat += g.items.length;
    }
    return flat;
  };

  return (
    <div ref={containerRef} className="relative mx-4 hidden max-w-xl flex-1 lg:block">
      {/* Input */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search rooms, racks, devices... (Ctrl+K)"
          className="focus:border-brand-500 dark:focus:border-brand-500 h-10 w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-8 pl-10 text-sm text-gray-700 placeholder:text-gray-400 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:bg-gray-800"
          onFocus={() => {
            setOpen(true);
            void loadData();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(-1);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setActiveIdx(-1);
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim() && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          {results.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-6 text-center text-sm text-gray-400">
              <Search className="mx-auto h-5 w-5" />
              <span>
                No results for{' '}
                <strong className="text-gray-700 dark:text-gray-300">"{query}"</strong>
              </span>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto py-2">
              {grouped.map(({ category, items }) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="mt-2 mb-1 flex items-center gap-2 px-4 first:mt-1">
                    <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                      {CATEGORY_LABEL[category]}
                    </span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400 dark:bg-gray-800">
                      {items.length}
                    </span>
                  </div>
                  {/* Items */}
                  {items.map((r, i) => {
                    const Icon = RESULT_ICON[r.category];
                    const idx = flatIdx(category, i);
                    const isActive = idx === activeIdx;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-brand-50 dark:bg-brand-500/10'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isActive ? 'bg-brand-500/15' : 'bg-gray-100 dark:bg-gray-800'
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${isActive ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400'}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-800 dark:text-gray-200'}`}
                          >
                            {r.label}
                          </p>
                          <p className="truncate text-xs text-gray-400 dark:text-gray-600">
                            {r.sublabel}
                          </p>
                        </div>
                        {isActive && (
                          <kbd className="shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-400 dark:border-gray-700 dark:bg-gray-800">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          {/* Footer hint */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 dark:border-gray-800">
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 dark:border-gray-700 dark:bg-gray-800">
                  ↑↓
                </kbd>{' '}
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 dark:border-gray-700 dark:bg-gray-800">
                  ↵
                </kbd>{' '}
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 dark:border-gray-700 dark:bg-gray-800">
                  esc
                </kbd>{' '}
                close
              </span>
            </div>
            <span className="text-[10px] text-gray-300 dark:text-gray-700">
              {results.length} results
            </span>
          </div>
        </div>
      )}

      {/* Hint when focused but empty */}
      {open && !query.trim() && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="px-4 py-3">
            <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
              Quick access
            </p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { icon: Globe, label: 'World Map', href: '/views/worldmap' },
                { icon: Bell, label: 'Notifications', href: '/notifications' },
                { icon: Activity, label: 'Slurm Overview', href: '/slurm/overview' },
                { icon: AlertTriangle, label: 'Slurm Alerts', href: '/slurm/alerts' },
                { icon: Settings, label: 'Settings', href: '/settings' },
                { icon: BarChart2, label: 'Health Status', href: '/rackscope/health' },
              ].map(({ icon: Icon, label, href }) => (
                <button
                  key={href}
                  onClick={() => {
                    void navigate(href);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
