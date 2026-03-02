import { useState, useEffect, useRef, useCallback } from 'react';
import ReactGridLayout, { type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useNavigate } from 'react-router-dom';
import {
  GripVertical,
  Check,
  Undo2,
  PanelRight,
  Plus,
  Copy,
  Trash2,
  Pencil,
  X,
  SlidersHorizontal,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  ActiveAlert,
  Site,
  SlurmSummary,
  PrometheusStats,
  RoomState,
  DeviceTemplate,
  CheckDefinition,
} from '../../types';
// Importing from '../dashboard' triggers all registerWidget() side effects.
import {
  getAllWidgets,
  getWidget,
  type WidgetType,
  type WidgetConfig,
  type Dashboard,
  type DashboardData,
  type RoomWithState,
  ROW_PX,
  DEFAULT_WIDGETS,
  DASHBOARDS_STORAGE_KEY,
  ACTIVE_DASHBOARD_STORAGE_KEY,
  DASHBOARDS_STORAGE_VERSION_KEY,
  DASHBOARDS_STORAGE_VERSION,
} from '../dashboard';

// ── react-grid-layout helpers ─────────────────────────────────────────────────

/**
 * Convert WidgetConfig[] to the Layout[] shape expected by react-grid-layout.
 * The `i` field is the widget id — RGL uses it as the React key and for position tracking.
 */
const toRglLayout = (widgets: WidgetConfig[]): Layout[] =>
  widgets.map(({ id, x, y, w, h, minW, minH }) => ({
    i: id,
    x,
    y,
    w,
    h,
    ...(minW !== undefined && { minW }),
    ...(minH !== undefined && { minH }),
  }));

/**
 * Merge position updates from react-grid-layout back into the WidgetConfig array.
 * Called on every drag/resize; persists to localStorage via saveWidgets.
 */
const applyRglLayout = (widgets: WidgetConfig[], newLayout: Layout[]): WidgetConfig[] => {
  const pos = Object.fromEntries(newLayout.map((l) => [l.i, l]));
  return widgets.map((w) => {
    const l = pos[w.id];
    if (!l) return w;
    return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
  });
};

// ── Widget renderer ───────────────────────────────────────────────────────────

type WidgetRendererProps = {
  widget: WidgetConfig;
  data: DashboardData;
  navigate: (path: string) => void;
};

const WidgetContent = ({ widget, data, navigate }: WidgetRendererProps) => {
  const reg = getWidget(widget.type);
  if (!reg) return null;
  const Component = reg.component;
  return <Component widget={widget} data={data} navigate={navigate} />;
};

// ── Widget picker panel ───────────────────────────────────────────────────────

type WidgetPickerProps = {
  widgets: WidgetConfig[];
  slurmEnabled: boolean;
  onAdd: (type: WidgetType) => void;
  onReset: () => void;
  onClose: () => void;
  open: boolean;
};

const WidgetPicker = ({
  widgets,
  slurmEnabled,
  onAdd,
  onReset,
  onClose,
  open,
}: WidgetPickerProps) => {
  const allDefs = getAllWidgets();
  const available = allDefs.filter((def) => !def.requiresSlurm || slurmEnabled);
  const addedTypes = new Set(widgets.map((w) => w.type));

  const groups = [
    { label: 'Stats', defs: available.filter((d) => d.group === 'Stats') },
    { label: 'Charts', defs: available.filter((d) => d.group === 'Charts') },
    { label: 'Monitoring', defs: available.filter((d) => d.group === 'Monitoring') },
    { label: 'Overview', defs: available.filter((d) => d.group === 'Overview') },
    { label: 'Catalog', defs: available.filter((d) => d.group === 'Catalog') },
    { label: 'Stats Row (legacy)', defs: available.filter((d) => d.group === 'Legacy') },
  ].filter((g) => g.defs.length > 0);

  return (
    <div
      className={`fixed top-[72px] right-0 z-40 flex h-[calc(100vh-72px)] w-[400px] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-950 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Widget Library</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {addedTypes.size} / {available.length} widgets active
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 dark:border-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Widget list grouped */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.defs.map((def) => {
                  const isAdded = addedTypes.has(def.type);
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.type}
                      onClick={() => !isAdded && onAdd(def.type)}
                      disabled={isAdded}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        isAdded
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-900/50'
                          : 'hover:border-brand-500/50 hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isAdded ? 'bg-gray-100 dark:bg-gray-800' : 'bg-brand-50 dark:bg-brand-500/10'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${isAdded ? 'text-gray-400' : 'text-brand-500'}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {def.title}
                        </p>
                        <p className="truncate text-xs text-gray-400">{def.description}</p>
                      </div>
                      {isAdded ? (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400 dark:bg-gray-800">
                          Added
                        </span>
                      ) : (
                        <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/10 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                          + Add
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100 p-4 dark:border-gray-800">
        <button
          onClick={onReset}
          className="hover:border-brand-500/50 hover:text-brand-500 w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-400 transition-colors dark:border-gray-700"
        >
          ↺ Reset to default layout
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const navigate = useNavigate();

  // ── Data state ────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, string>>({});
  const [slurm, setSlurm] = useState<SlurmSummary | null>(null);
  const [slurmEnabled, setSlurmEnabled] = useState(false);
  const [promStats, setPromStats] = useState<PrometheusStats | null>(null);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [rackTemplateCount, setRackTemplateCount] = useState(0);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Alert filter state ────────────────────────────────────────────────────
  const [alertLimit, setAlertLimit] = useState<number>(() => {
    const stored = localStorage.getItem('rackscope.dash.alert-limit');
    return stored ? Number(stored) : 5;
  });
  const [alertPage, setAlertPage] = useState(0);
  const [alertStateFilter, setAlertStateFilter] = useState<string>('all');
  const [alertRoomFilter, setAlertRoomFilter] = useState<string>('all');

  // ── Settings panel state ──────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const stored = localStorage.getItem('rackscope.dash.refresh');
    return stored ? Number(stored) : 30;
  });
  const [defaultAlertLimit, setDefaultAlertLimit] = useState<number>(() => {
    const stored = localStorage.getItem('rackscope.dash.alert-limit');
    return stored ? Number(stored) : 5;
  });

  // ── Dashboard layout state ────────────────────────────────────────────────
  const [dashboards, setDashboards] = useState<Dashboard[]>(() => {
    try {
      const version = localStorage.getItem(DASHBOARDS_STORAGE_VERSION_KEY);
      const stored = localStorage.getItem(DASHBOARDS_STORAGE_KEY);
      if (stored && version === DASHBOARDS_STORAGE_VERSION)
        return JSON.parse(stored) as Dashboard[];
    } catch {
      /* ignore */
    }
    return [{ id: 'default', name: 'Overview', widgets: DEFAULT_WIDGETS }];
  });
  const [activeDashboardId, setActiveDashboardId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_DASHBOARD_STORAGE_KEY) ?? 'default';
  });
  // Kept in sync so the ResizeObserver callback always reads the current dashboard
  // id without capturing a stale closure over activeDashboardId.
  const activeDashboardIdRef = useRef(activeDashboardId);

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) ?? dashboards[0];
  const widgets = activeDashboard?.widgets ?? DEFAULT_WIDGETS;

  useEffect(() => {
    activeDashboardIdRef.current = activeDashboardId;
  }, [activeDashboardId]);

  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Snapshot taken when entering edit mode — used by Discard to roll back
  const widgetSnapshot = useRef<WidgetConfig[]>([]);
  // In-progress layout changes during edit mode — NOT persisted until Save is clicked.
  const [pendingLayout, setPendingLayout] = useState<WidgetConfig[] | null>(null);
  // Effective widgets: pending (unsaved edits) > saved (from localStorage)
  const displayWidgets = editMode && pendingLayout !== null ? pendingLayout : widgets;
  // Rename state for dashboard tabs
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // react-grid-layout needs explicit pixel width; a ResizeObserver keeps it current.
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    obs.observe(el);
    setGridWidth(el.getBoundingClientRect().width);
    return () => obs.disconnect();
  }, []);

  // ── Widget + dashboard operations ─────────────────────────────────────────
  const persistDashboards = (next: Dashboard[]) => {
    localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(DASHBOARDS_STORAGE_VERSION_KEY, DASHBOARDS_STORAGE_VERSION);
  };

  const saveWidgets = useCallback(
    (newWidgets: WidgetConfig[]) => {
      const next = dashboards.map((d) =>
        d.id === activeDashboardId ? { ...d, widgets: newWidgets } : d
      );
      setDashboards(next);
      persistDashboards(next);
    },
    [dashboards, activeDashboardId]
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      // Only capture layout changes when in edit mode. Changes are NOT persisted
      // to localStorage until the user explicitly clicks Save.
      if (!editMode) return;
      setPendingLayout(applyRglLayout(displayWidgets, newLayout));
    },
    [editMode, displayWidgets]
  );

  const removeWidget = (id: string) => {
    const current = displayWidgets;
    if (editMode) {
      setPendingLayout(current.filter((w) => w.id !== id));
    } else {
      saveWidgets(current.filter((w) => w.id !== id));
    }
  };

  const addWidget = (type: WidgetType) => {
    const def = getWidget(type);
    if (!def) return;
    const current = displayWidgets;
    const maxY = current.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type,
      x: 0,
      y: maxY,
      w: def.defaultW,
      h: def.defaultH,
      minH: def.defaultH > 1 ? 2 : 1,
    };
    if (editMode) {
      setPendingLayout([...current, newWidget]);
    } else {
      saveWidgets([...current, newWidget]);
    }
  };

  const resetLayout = () => {
    if (editMode) {
      setPendingLayout(DEFAULT_WIDGETS);
    } else {
      saveWidgets(DEFAULT_WIDGETS);
    }
  };

  const switchDashboard = (id: string) => {
    setActiveDashboardId(id);
    localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, id);
    setEditMode(false);
    setPickerOpen(false);
  };

  const createDashboard = () => {
    const id = `dash-${Date.now()}`;
    const name = `Dashboard ${dashboards.length + 1}`;
    const next = [...dashboards, { id, name, widgets: [] }];
    setDashboards(next);
    persistDashboards(next);
    setActiveDashboardId(id);
    localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, id);
    setEditMode(false);
    setPickerOpen(false);
    setRenamingId(id);
    setRenameValue(name);
  };

  const deleteDashboard = (id: string) => {
    if (dashboards.length <= 1) return;
    const next = dashboards.filter((d) => d.id !== id);
    setDashboards(next);
    persistDashboards(next);
    if (activeDashboardId === id) {
      const newActive = next[0].id;
      setActiveDashboardId(newActive);
      localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, newActive);
    }
  };

  const duplicateDashboard = (id: string) => {
    const src = dashboards.find((d) => d.id === id);
    if (!src) return;
    const newId = `dash-${Date.now()}`;
    const next = [
      ...dashboards,
      { id: newId, name: `${src.name} (copy)`, widgets: src.widgets.map((w) => ({ ...w })) },
    ];
    setDashboards(next);
    persistDashboards(next);
    setActiveDashboardId(newId);
    localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, newId);
  };

  const renameDashboard = (id: string, name: string) => {
    const next = dashboards.map((d) => (d.id === id ? { ...d, name } : d));
    setDashboards(next);
    persistDashboards(next);
  };

  const finishRename = () => {
    if (renamingId && renameValue.trim()) renameDashboard(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [alertsData, sitesData, configData, promData, catalogData, checksData] =
        await Promise.all([
          api.getActiveAlerts(),
          api.getSites(),
          api.getConfig(),
          api.getPrometheusStats().catch(() => null),
          api.getCatalog().catch(() => null),
          api.getChecks().catch(() => null),
        ]);
      setAlerts(alertsData?.alerts ?? []);
      const siteList = Array.isArray(sitesData) ? sitesData : [];
      setSites(siteList);
      setPromStats(promData);
      setDeviceTemplates(catalogData?.device_templates ?? []);
      setRackTemplateCount(catalogData?.rack_templates?.length ?? 0);
      setChecks(checksData?.checks ?? []);

      const slEnabled = Boolean(configData?.plugins?.slurm?.enabled);
      setSlurmEnabled(slEnabled);
      if (slEnabled) {
        const slurmData = await api.getSlurmSummary().catch(() => null);
        setSlurm(slurmData);
      }

      const roomIds: string[] = siteList.flatMap((s: Site) => (s.rooms ?? []).map((r) => r.id));
      const stateEntries = await Promise.all(
        roomIds.map((id) =>
          api
            .getRoomState(id)
            .then((s: RoomState) => [id, s?.state ?? 'UNKNOWN'] as [string, string])
            .catch(() => [id, 'UNKNOWN'] as [string, string])
        )
      );
      setRoomStates(Object.fromEntries(stateEntries));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAll();
    const t = setInterval(() => void loadAll(true), refreshInterval * 1000);
    return () => clearInterval(t);
  }, [refreshInterval]);

  // ── Prometheus countdown ticker ───────────────────────────────────────────
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalRooms = sites.reduce((n, s) => n + (s.rooms?.length ?? 0), 0);
  const totalRacks = sites.reduce(
    (n, s) =>
      n +
      (s.rooms ?? []).reduce(
        (rn, r) =>
          rn +
          (r.aisles ?? []).reduce((an, a) => an + (a.racks?.length ?? 0), 0) +
          (r.standalone_racks?.length ?? 0),
        0
      ),
    0
  );
  const totalDevices = sites.reduce(
    (n, s) =>
      n +
      (s.rooms ?? []).reduce(
        (rn, r) =>
          rn +
          (r.aisles ?? []).reduce(
            (an, a) =>
              an + (a.racks ?? []).reduce((dn, rack) => dn + (rack.devices?.length ?? 0), 0),
            0
          ),
        0
      ),
    0
  );

  const critCount = alerts.filter((a) => a.state === 'CRIT').length;
  const warnCount = alerts.filter((a) => a.state === 'WARN').length;
  const healthScore =
    totalDevices > 0
      ? Math.round(((totalDevices - critCount - warnCount) / totalDevices) * 100)
      : 100;

  const donutSlices = [
    { label: 'CRIT', count: critCount, color: '#ef4444' },
    { label: 'WARN', count: warnCount, color: '#f59e0b' },
    { label: 'OK', count: Math.max(0, totalDevices - critCount - warnCount), color: '#10b981' },
  ].filter((s) => s.count > 0);

  const allRooms: RoomWithState[] = sites.flatMap((s) =>
    (s.rooms ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      siteName: s.name,
      state: roomStates[r.id] ?? 'UNKNOWN',
    }))
  );

  const devsByType = deviceTemplates.reduce<Record<string, number>>((acc, t) => {
    acc[t.type ?? 'other'] = (acc[t.type ?? 'other'] ?? 0) + 1;
    return acc;
  }, {});
  const checksByScope = checks.reduce<Record<string, number>>((acc, c) => {
    acc[c.scope ?? 'unknown'] = (acc[c.scope ?? 'unknown'] ?? 0) + 1;
    return acc;
  }, {});

  // ── Filtered alerts ───────────────────────────────────────────────────────
  const filteredAlertsAll = alerts
    .filter((a) => alertStateFilter === 'all' || a.state === alertStateFilter)
    .filter((a) => alertRoomFilter === 'all' || a.room_id === alertRoomFilter)
    .sort((a, b) => (a.state === 'CRIT' ? -1 : 1) - (b.state === 'CRIT' ? -1 : 1));
  const totalAlertPages = Math.max(1, Math.ceil(filteredAlertsAll.length / alertLimit));
  const safeAlertPage = Math.min(alertPage, totalAlertPages - 1);
  const filteredAlerts = filteredAlertsAll.slice(
    safeAlertPage * alertLimit,
    (safeAlertPage + 1) * alertLimit
  );

  // ── Prometheus countdown ──────────────────────────────────────────────────
  const promConnected = Boolean(promStats?.last_ts);
  const promNextMs = promStats?.next_ts ? promStats.next_ts - now : null;
  const promNextSec = promNextMs && promNextMs > 0 ? Math.ceil(promNextMs / 1000) : 0;

  // ── Shared data object passed to all widgets ──────────────────────────────
  const dashboardData: DashboardData = {
    alerts,
    sites,
    roomStates,
    slurm,
    slurmEnabled,
    promStats,
    deviceTemplates,
    rackTemplateCount,
    checks,
    critCount,
    warnCount,
    totalDevices,
    totalRacks,
    totalRooms,
    healthScore,
    allRooms,
    donutSlices,
    alertLimit,
    setAlertLimit,
    alertPage,
    setAlertPage,
    alertStateFilter,
    setAlertStateFilter,
    alertRoomFilter,
    setAlertRoomFilter,
    filteredAlerts,
    filteredAlertsAll,
    totalAlertPages,
    safeAlertPage,
    promNextSec,
    promConnected,
    devsByType,
    checksByScope,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {/* Dashboard tabs */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {dashboards.map((d) => {
              const isActive = d.id === activeDashboardId;
              if (renamingId === d.id) {
                return (
                  <form
                    key={d.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      finishRename();
                    }}
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={finishRename}
                      className="border-brand-400 h-8 w-36 rounded-lg border bg-white px-2 text-sm focus:outline-none dark:bg-gray-800 dark:text-white"
                    />
                  </form>
                );
              }
              return (
                <div
                  key={d.id}
                  className={`group flex h-8 items-center gap-1 rounded-lg px-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200'
                  }`}
                >
                  <button
                    className="max-w-[120px] truncate font-medium"
                    onClick={() => switchDashboard(d.id)}
                  >
                    {d.name}
                  </button>
                  {isActive && (
                    <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        title="Rename"
                        onClick={() => {
                          setRenamingId(d.id);
                          setRenameValue(d.name);
                        }}
                        className="rounded p-0.5 hover:bg-white/20"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        title="Duplicate"
                        onClick={() => duplicateDashboard(d.id)}
                        className="rounded p-0.5 hover:bg-white/20"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      {dashboards.length > 1 && (
                        <button
                          title="Delete"
                          onClick={() => deleteDashboard(d.id)}
                          className="rounded p-0.5 hover:bg-red-500/30"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
            <button
              onClick={createDashboard}
              title="New dashboard"
              className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  pickerOpen
                    ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700/50 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                <PanelRight className="h-4 w-4" />
                Widgets
              </button>
              <button
                onClick={() => {
                  // Discard: clear pending layout without persisting — reverts to saved state
                  setPendingLayout(null);
                  setEditMode(false);
                  setPickerOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <Undo2 className="h-4 w-4" />
                Discard
              </button>
              <button
                onClick={() => {
                  // Save: persist pending layout (or current if no changes) to localStorage
                  saveWidgets(pendingLayout ?? widgets);
                  setPendingLayout(null);
                  setEditMode(false);
                  setPickerOpen(false);
                }}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white transition-colors"
              >
                <Check className="h-4 w-4" />
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                widgetSnapshot.current = widgets;
                setPendingLayout(null); // start with no pending changes
                setEditMode(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <LayoutDashboard className="h-4 w-4" />
              Edit layout
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => void loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Grid — powered by react-grid-layout ─────────────────────────────── */}
      <div ref={gridContainerRef} className={editMode && pickerOpen ? 'pr-[420px]' : ''}>
        {loading ? (
          /* Loading skeleton */
          <div className="grid grid-cols-12 gap-5" style={{ gridAutoRows: `${ROW_PX}px` }}>
            {[12, 4, 4, 4, 8, 4].map((_, i) => (
              <div
                key={i}
                className="col-span-4 h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : (
          <ReactGridLayout
            layout={toRglLayout(displayWidgets)}
            onLayoutChange={handleLayoutChange}
            width={gridWidth}
            cols={12}
            rowHeight={ROW_PX}
            margin={[20, 20]}
            containerPadding={[0, 0]}
            isDraggable={editMode}
            isResizable={editMode}
            draggableHandle=".rgl-drag-handle"
            resizeHandles={['se', 's', 'e']}
            useCSSTransforms
          >
            {displayWidgets.map((widget) => (
              <div
                key={widget.id}
                className={`group relative ${editMode ? 'ring-brand-500/20 rounded-2xl ring-1 ring-offset-1 ring-offset-transparent' : ''}`}
              >
                {/* Edit mode top bar (drag handle + remove) */}
                {editMode && (
                  <div className="rgl-drag-handle bg-brand-500/15 border-brand-500/20 absolute inset-x-0 top-0 z-20 flex h-7 cursor-grab items-center justify-between rounded-t-2xl border-b px-3 active:cursor-grabbing">
                    <GripVertical className="text-brand-500 h-4 w-4" />
                    <div className="flex items-center gap-1">
                      <span className="bg-brand-500/20 text-brand-500 rounded px-1.5 py-0.5 font-mono text-[10px]">
                        {widget.w}/{widget.h}
                      </span>
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWidget(widget.id);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded border border-red-300 bg-white text-[11px] text-red-500 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900"
                        title="Remove widget"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Widget content — pointer-events-none in edit mode so RGL handles all mouse events */}
                <div className={`h-full ${editMode ? 'pointer-events-none select-none' : ''}`}>
                  <WidgetContent widget={widget} data={dashboardData} navigate={navigate} />
                </div>
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>

      {/* Widget picker panel — independent from edit mode, toggled via "Widgets" button */}
      {editMode && (
        <WidgetPicker
          widgets={widgets}
          slurmEnabled={slurmEnabled}
          onAdd={addWidget}
          onReset={resetLayout}
          onClose={() => setPickerOpen(false)}
          open={pickerOpen}
        />
      )}

      {/* Settings panel */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSettingsOpen(false)} />
          <div className="fixed top-[72px] right-0 z-50 h-[calc(100vh-72px)] w-80 border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Dashboard Settings
              </h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Refresh interval
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 30, 60, 120].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setRefreshInterval(s);
                        localStorage.setItem('rackscope.dash.refresh', String(s));
                      }}
                      className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                        refreshInterval === s
                          ? 'bg-brand-500 text-white'
                          : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {s >= 60 ? `${s / 60}m` : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Default alert count
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 20, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setDefaultAlertLimit(n);
                        setAlertLimit(n);
                        localStorage.setItem('rackscope.dash.alert-limit', String(n));
                      }}
                      className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                        defaultAlertLimit === n
                          ? 'bg-brand-500 text-white'
                          : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
