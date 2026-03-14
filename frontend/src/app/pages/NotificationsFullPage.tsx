import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  XCircle,
  AlertTriangle,
  Filter,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
  Server,
  Cpu,
  Search,
  X,
} from 'lucide-react';
import { api } from '@src/services/api';
import type { ActiveAlert, SlurmNodeEntry } from '@src/types';
import { usePageTitle } from '../contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
} from './templates/EmptyPage';
import { RefreshButton, useAutoRefresh } from '../components/RefreshButton';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'crit' | 'warn' | 'infra' | 'slurm';

type UnifiedRow =
  | { kind: 'infra'; sev: string; data: ActiveAlert }
  | { kind: 'slurm'; sev: string; data: SlurmNodeEntry };

type SortDir = 'asc' | 'desc';
// ColumnFilterKey = columns that support dropdown filter (all except Name)
type ColumnFilterKey = 'severity' | 'type' | 'rack' | 'room' | 'location' | 'checks';
// SortKey = all sortable columns (Name added on top of filter keys)
type SortKey = ColumnFilterKey | 'name';
type ColumnFilters = Record<ColumnFilterKey, Set<string>>;

const FILTER_COLS: ColumnFilterKey[] = ['severity', 'type', 'rack', 'room', 'location', 'checks'];
const SEARCHABLE_THRESHOLD = 8;

const emptyFilters = (): ColumnFilters => ({
  severity: new Set(),
  type: new Set(),
  rack: new Set(),
  room: new Set(),
  location: new Set(),
  checks: new Set(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a sortable / comparable string value from a row for a given column. */
function getRowValue(col: SortKey, row: UnifiedRow): string {
  if (row.kind === 'infra') {
    const a = row.data;
    switch (col) {
      case 'severity':
        return row.sev;
      case 'name':
        return a.node_id ?? '';
      case 'type':
        return 'Infrastructure';
      case 'rack':
        return a.rack_name ?? '';
      case 'room':
        return a.room_name ?? '';
      case 'location':
        return a.device_name ?? '';
      case 'checks':
        return String(a.checks.length);
    }
  } else {
    const n = row.data;
    switch (col) {
      case 'severity':
        return row.sev;
      case 'name':
        return n.node ?? '';
      case 'type':
        return 'Slurm';
      case 'rack':
        return n.rack_name ?? '';
      case 'room':
        return '';
      case 'location':
        return n.status ?? '';
      case 'checks':
        return '0';
    }
  }
  return '';
}

// ── Pagination helper ─────────────────────────────────────────────────────────

const FALLBACK_ROW_H = 72;
const FALLBACK_THEAD_H = 41;
const SAFETY = 8;

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current <= 3) return [0, 1, 2, 3, '...', total - 1];
  if (current >= total - 4) return [0, '...', total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

// ── ColumnFilterDropdown ──────────────────────────────────────────────────────

const ColumnFilterDropdown = ({
  values,
  selected,
  searchable,
  onToggle,
  onClear,
}: {
  values: string[];
  selected: Set<string>;
  searchable: boolean;
  onToggle: (val: string) => void;
  onClear: () => void;
}) => {
  const [query, setQuery] = useState('');
  const visible = query
    ? values.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    : values;

  return (
    <div className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {searchable && (
        <div className="border-b border-gray-100 p-2 dark:border-gray-800">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="focus:border-brand-400 h-7 w-full rounded-lg border border-gray-200 px-2.5 text-xs placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
      )}
      <div className="max-h-52 overflow-y-auto py-1">
        {visible.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">No results</p>
        ) : (
          visible.map((val) => (
            <label
              key={val}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.has(val)}
                onChange={() => onToggle(val)}
                className="accent-brand-500 h-3.5 w-3.5 cursor-pointer rounded"
              />
              <span className="truncate text-gray-700 dark:text-gray-300">{val}</span>
            </label>
          ))
        )}
      </div>
      {selected.size > 0 && (
        <div className="border-t border-gray-100 p-2 dark:border-gray-800">
          <button
            onClick={onClear}
            className="w-full rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          >
            Clear ({selected.size} selected)
          </button>
        </div>
      )}
    </div>
  );
};

// ── ColumnHeader ──────────────────────────────────────────────────────────────

const ColumnHeader = ({
  col,
  label,
  filterKey,
  sortKey,
  sortDir,
  onSort,
  filterCount = 0,
  isOpen = false,
  onFilterToggle,
  uniqueVals = [],
  selectedVals,
  onToggle,
  onClear,
}: {
  col: SortKey;
  label: string;
  filterKey?: ColumnFilterKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  filterCount?: number;
  isOpen?: boolean;
  onFilterToggle?: (col: ColumnFilterKey) => void;
  uniqueVals?: string[];
  selectedVals?: Set<string>;
  onToggle?: (col: ColumnFilterKey, val: string) => void;
  onClear?: (col: ColumnFilterKey) => void;
}) => {
  const active = sortKey === col;
  const SortIcon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th
      data-col-header={col}
      className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-400"
      style={{ position: 'relative', overflow: 'visible' }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSort(col)}
          className={`flex items-center gap-0.5 tracking-wider uppercase transition-colors hover:text-gray-900 dark:hover:text-gray-100 ${
            active ? 'text-brand-500 dark:text-brand-400' : ''
          }`}
        >
          {label}
          <SortIcon className={`h-3.5 w-3.5 ${active ? '' : 'opacity-40'}`} />
        </button>

        {filterKey && onFilterToggle && (
          <button
            onClick={() => onFilterToggle(filterKey)}
            className={`relative ml-0.5 flex items-center rounded p-0.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
              filterCount > 0
                ? 'text-brand-500 dark:text-brand-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            {filterCount > 0 && (
              <span className="bg-brand-500 absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] leading-none font-bold text-white">
                {filterCount > 9 ? '9+' : filterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {isOpen && filterKey && selectedVals && onToggle && onClear && (
        <ColumnFilterDropdown
          values={uniqueVals}
          selected={selectedVals}
          searchable={uniqueVals.length > SEARCHABLE_THRESHOLD}
          onToggle={(val) => onToggle(filterKey, val)}
          onClear={() => onClear(filterKey)}
        />
      )}
    </th>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const NotificationsFullPage = () => {
  usePageTitle('Notifications');
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [infraAlerts, setInfraAlerts] = useState<ActiveAlert[]>([]);
  const [slurmAlerts, setSlurmAlerts] = useState<SlurmNodeEntry[]>([]);
  const [slurmEnabled, setSlurmEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // ── Quick filter / search / pagination ──────────────────────────────────────
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const tableAreaRef = useRef<HTMLDivElement>(null);

  // ── Sort ────────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Column filters ──────────────────────────────────────────────────────────
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(emptyFilters);
  const [openDropdown, setOpenDropdown] = useState<ColumnFilterKey | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      setError(false);
      const [infraData, slurmData] = await Promise.all([
        api.getActiveAlerts(),
        api.getSlurmNodes().catch(() => null),
      ]);
      setInfraAlerts(infraData?.alerts ?? []);
      if (slurmData !== null && Array.isArray(slurmData?.nodes)) {
        setSlurmEnabled(true);
        const nodes: SlurmNodeEntry[] = slurmData.nodes;
        setSlurmAlerts(nodes.filter((n) => n.severity === 'CRIT' || n.severity === 'WARN'));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('notifications', loadData);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ── ResizeObserver — dynamic perPage ────────────────────────────────────────
  useEffect(() => {
    if (!tableAreaRef.current) return;
    const calc = () => {
      const container = tableAreaRef.current;
      if (!container) return;
      const available = container.getBoundingClientRect().height;
      const firstRow = container.querySelector('tbody tr');
      const thead = container.querySelector('thead');
      const rowH = firstRow ? firstRow.getBoundingClientRect().height : FALLBACK_ROW_H;
      const theadH = thead ? thead.getBoundingClientRect().height : FALLBACK_THEAD_H;
      setPerPage(Math.max(5, Math.floor((available - theadH - SAFETY) / rowH)));
    };
    const obs = new ResizeObserver(calc);
    obs.observe(tableAreaRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!tableAreaRef.current || loading) return;
    const container = tableAreaRef.current;
    const available = container.getBoundingClientRect().height;
    const firstRow = container.querySelector('tbody tr');
    const thead = container.querySelector('thead');
    const rowH = firstRow ? firstRow.getBoundingClientRect().height : FALLBACK_ROW_H;
    const theadH = thead ? thead.getBoundingClientRect().height : FALLBACK_THEAD_H;
    setPerPage(Math.max(5, Math.floor((available - theadH - SAFETY) / rowH)));
  }, [loading]);

  // ── Reset page when any filter/sort changes ─────────────────────────────────
  useEffect(() => {
    setPage(0);
  }, [filter, search, sortKey, columnFilters]);

  // ── Close dropdown on outside click or Escape ───────────────────────────────
  useEffect(() => {
    if (!openDropdown) return;
    const onMouse = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-col-header]')) setOpenDropdown(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [openDropdown]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalCrit =
    infraAlerts.filter((a) => a.state === 'CRIT').length +
    slurmAlerts.filter((n) => n.severity === 'CRIT').length;
  const totalWarn =
    infraAlerts.filter((a) => a.state === 'WARN').length +
    slurmAlerts.filter((n) => n.severity === 'WARN').length;
  const total = infraAlerts.length + slurmAlerts.length;
  const affectedRacks = new Set(infraAlerts.map((a) => a.rack_id).filter(Boolean)).size;

  // ── Unified rows ─────────────────────────────────────────────────────────────
  const allRows = useMemo<UnifiedRow[]>(
    () => [
      ...infraAlerts.map((d): UnifiedRow => ({ kind: 'infra', sev: d.state, data: d })),
      ...slurmAlerts.map((d): UnifiedRow => ({ kind: 'slurm', sev: d.severity, data: d })),
    ],
    [infraAlerts, slurmAlerts]
  );

  // ── Unique values per filterable column (from allRows, not filtered) ─────────
  const uniqueValues = useMemo<Record<ColumnFilterKey, string[]>>(() => {
    const result = {} as Record<ColumnFilterKey, string[]>;
    for (const col of FILTER_COLS) {
      if (col === 'checks') {
        // Special: flatten individual check IDs
        const vals = new Set<string>();
        for (const row of allRows) {
          if (row.kind === 'infra') row.data.checks.forEach((c) => vals.add(c.id));
        }
        result.checks = Array.from(vals).sort();
      } else {
        const vals = new Set<string>();
        for (const row of allRows) {
          const v = getRowValue(col, row);
          if (v) vals.add(v);
        }
        result[col] = Array.from(vals).sort();
      }
    }
    return result;
  }, [allRows]);

  // ── Quick filter + search ────────────────────────────────────────────────────
  const filteredRows = useMemo<UnifiedRow[]>(() => {
    let rows = allRows;
    if (filter === 'crit') rows = rows.filter((r) => r.sev === 'CRIT');
    else if (filter === 'warn') rows = rows.filter((r) => r.sev === 'WARN');
    else if (filter === 'infra') rows = rows.filter((r) => r.kind === 'infra');
    else if (filter === 'slurm') rows = rows.filter((r) => r.kind === 'slurm');

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        if (r.kind === 'infra') {
          const a = r.data;
          return (
            a.node_id?.toLowerCase().includes(q) ||
            a.device_name?.toLowerCase().includes(q) ||
            a.rack_name?.toLowerCase().includes(q) ||
            a.room_name?.toLowerCase().includes(q)
          );
        } else {
          const n = r.data;
          return (
            n.node?.toLowerCase().includes(q) ||
            n.status?.toLowerCase().includes(q) ||
            (n.rack_name?.toLowerCase().includes(q) ??
              n.partitions?.some((p) => p.toLowerCase().includes(q)))
          );
        }
      });
    }
    return rows;
  }, [allRows, filter, search]);

  // ── Column filters ───────────────────────────────────────────────────────────
  const columnFilteredRows = useMemo<UnifiedRow[]>(() => {
    let rows = filteredRows;
    // Standard columns: exact match
    for (const col of ['severity', 'type', 'rack', 'room', 'location'] as ColumnFilterKey[]) {
      const selected = columnFilters[col];
      if (selected.size === 0) continue;
      rows = rows.filter((r) => selected.has(getRowValue(col, r)));
    }
    // Checks: row matches if any of its check IDs is in the selected set
    if (columnFilters.checks.size > 0) {
      rows = rows.filter(
        (r) => r.kind === 'infra' && r.data.checks.some((c) => columnFilters.checks.has(c.id))
      );
    }
    return rows;
  }, [filteredRows, columnFilters]);

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sortedRows = useMemo<UnifiedRow[]>(() => {
    const SEV: Record<string, number> = { CRIT: 2, WARN: 1 };
    const arr = [...columnFilteredRows];
    arr.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'severity') {
        cmp = (SEV[getRowValue('severity', a)] ?? 0) - (SEV[getRowValue('severity', b)] ?? 0);
      } else if (sortKey === 'checks') {
        cmp = Number(getRowValue('checks', a)) - Number(getRowValue('checks', b));
      } else {
        cmp = getRowValue(sortKey, a).localeCompare(getRowValue(sortKey, b));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [columnFilteredRows, sortKey, sortDir]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = showAll
    ? sortedRows
    : sortedRows.slice(safePage * perPage, (safePage + 1) * perPage);
  const pageNums = buildPages(safePage, totalPages);
  const firstEntry = sortedRows.length === 0 ? 0 : safePage * perPage + 1;
  const lastEntry = Math.min((safePage + 1) * perPage, sortedRows.length);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col: SortKey) => {
      if (sortKey === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortKey(col);
        setSortDir('asc');
      }
      setOpenDropdown(null);
    },
    [sortKey]
  );

  const handleFilterToggle = useCallback((col: ColumnFilterKey) => {
    setOpenDropdown((prev) => (prev === col ? null : col));
  }, []);

  const toggleColumnFilter = useCallback((col: ColumnFilterKey, val: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      const s = new Set(next[col]);
      if (s.has(val)) s.delete(val);
      else s.add(val);
      next[col] = s;
      return next;
    });
  }, []);

  const clearColumnFilter = useCallback((col: ColumnFilterKey) => {
    setColumnFilters((prev) => ({ ...prev, [col]: new Set() }));
  }, []);

  const clearAllColumnFilters = useCallback(() => {
    setColumnFilters(emptyFilters());
  }, []);

  // ── Active filter chips ───────────────────────────────────────────────────────
  const activeFilters = FILTER_COLS.filter((col) => columnFilters[col].size > 0);
  const hasActiveColumnFilters = activeFilters.length > 0;

  // Label for chips
  const chipLabel = (col: ColumnFilterKey) => {
    const vals = Array.from(columnFilters[col]);
    const preview = vals.slice(0, 2).join(', ');
    return vals.length > 2 ? `${preview} +${vals.length - 2}` : preview;
  };

  // ── Quick filter tabs ─────────────────────────────────────────────────────────
  const filters = [
    { id: 'all' as FilterType, label: 'All', count: total },
    { id: 'crit' as FilterType, label: 'Critical', count: totalCrit },
    { id: 'warn' as FilterType, label: 'Warning', count: totalWarn },
    { id: 'infra' as FilterType, label: 'Infrastructure', count: infraAlerts.length },
    ...(slurmEnabled
      ? [{ id: 'slurm' as FilterType, label: 'Slurm', count: slurmAlerts.length }]
      : []),
  ];

  // ── Shared column header props ────────────────────────────────────────────────
  const colShared = {
    sortKey,
    sortDir,
    onSort: handleSort,
    onFilterToggle: handleFilterToggle,
    onToggle: toggleColumnFilter,
    onClear: clearColumnFilter,
  };
  const fp = (key: ColumnFilterKey) => ({
    filterKey: key,
    filterCount: columnFilters[key].size,
    isOpen: openDropdown === key,
    uniqueVals: uniqueValues[key] ?? [],
    selectedVals: columnFilters[key],
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <PageHeader
          title="Notifications"
          breadcrumb={
            <PageBreadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: 'Monitoring' },
                { label: 'Notifications' },
              ]}
            />
          }
          actions={
            <RefreshButton
              refreshing={refreshing}
              autoRefreshMs={autoRefreshMs}
              onRefresh={() => void loadData()}
              onIntervalChange={onIntervalChange}
            />
          }
        />
      </div>

      {/* Stats */}
      <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
        {(
          [
            {
              label: 'Total alerts',
              value: total,
              icon: Bell,
              bg: 'bg-gray-100 dark:bg-gray-800',
              color: 'text-gray-600 dark:text-gray-400',
            },
            {
              label: 'Critical',
              value: totalCrit,
              icon: XCircle,
              bg: 'bg-red-50 dark:bg-red-500/10',
              color: 'text-red-500',
            },
            {
              label: 'Warning',
              value: totalWarn,
              icon: AlertTriangle,
              bg: 'bg-amber-50 dark:bg-amber-500/10',
              color: 'text-amber-500',
            },
            {
              label: 'Affected racks',
              value: affectedRacks,
              icon: Server,
              bg: 'bg-brand-50 dark:bg-brand-500/10',
              color: 'text-brand-500',
            },
          ] as const
        ).map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.bg}`}
            >
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts…"
              className="focus:border-brand-500 h-9 w-full rounded-lg border border-gray-200 pr-4 pl-9 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Quick filters */}
          <div className="flex h-9 items-center gap-0.5 rounded-lg border border-gray-200 px-1.5 dark:border-gray-700">
            <Filter className="mr-1 h-3.5 w-3.5 shrink-0 text-gray-400" />
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
                  filter === f.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-px text-[10px] leading-none font-bold ${
                      filter === f.id
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Show all toggle */}
          <button
            onClick={() => setShowAll((v) => !v)}
            className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${
              showAll
                ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700/50 dark:bg-brand-500/10 dark:text-brand-400'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
          >
            <div
              className={`relative h-4 w-7 rounded-full transition-colors ${showAll ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0 h-3 w-3 rounded-full bg-white shadow transition-transform ${showAll ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
              />
            </div>
            Show all
          </button>
        </div>

        {/* Active column filter chips */}
        {hasActiveColumnFilters && (
          <div className="bg-brand-50/50 dark:bg-brand-500/5 flex shrink-0 flex-wrap items-center gap-1.5 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
            <span className="text-xs text-gray-400">Active filters:</span>
            {activeFilters.map((col) => (
              <span
                key={col}
                className="border-brand-200 text-brand-600 dark:border-brand-700/50 dark:text-brand-400 flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs font-medium dark:bg-gray-900"
              >
                <span className="font-semibold capitalize">{col}</span>
                <span className="text-brand-400">·</span>
                <span className="max-w-[180px] truncate">{chipLabel(col)}</span>
                <button
                  onClick={() => clearColumnFilter(col)}
                  className="hover:text-brand-800 dark:hover:text-brand-200 ml-0.5 rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllColumnFilters}
              className="ml-1 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table */}
        <div ref={tableAreaRef} className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingState message="Loading alerts…" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <ErrorState message="Failed to load alerts." onRetry={() => void loadData()} />
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No alerts"
                description={
                  search
                    ? `No results for "${search}"`
                    : hasActiveColumnFilters
                      ? 'No alerts match the active column filters'
                      : filter === 'all'
                        ? 'All nodes are healthy'
                        : `No ${filter.toUpperCase()} alerts`
                }
              />
            </div>
          ) : (
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead className="sticky top-0 z-10" style={{ overflow: 'visible' }}>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <ColumnHeader
                    col="severity"
                    label="Severity"
                    {...colShared}
                    {...fp('severity')}
                  />
                  <ColumnHeader col="name" label="Name" {...colShared} />
                  <ColumnHeader col="type" label="Type" {...colShared} {...fp('type')} />
                  <ColumnHeader
                    col="location"
                    label="Location"
                    {...colShared}
                    {...fp('location')}
                  />
                  <ColumnHeader col="rack" label="Rack" {...colShared} {...fp('rack')} />
                  <ColumnHeader col="room" label="Room" {...colShared} {...fp('room')} />
                  <ColumnHeader col="checks" label="Checks" {...colShared} {...fp('checks')} />
                  <th className="bg-gray-50 px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageRows.map((row) => {
                  if (row.kind === 'infra') {
                    const a = row.data;
                    return (
                      <tr key={`infra-${a.node_id}`} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3.5">
                          <StatusBadge status={row.sev as 'CRIT' | 'WARN'} size="md" />
                        </td>
                        <td className="truncate px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white">
                          {a.node_id}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <Server className="text-brand-500 h-3.5 w-3.5 shrink-0" />
                            Infrastructure
                          </span>
                        </td>
                        <td className="truncate px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                          {a.device_name ?? '—'}
                        </td>
                        <td className="truncate px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                          {a.rack_name ?? '—'}
                        </td>
                        <td className="truncate px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                          {a.room_name ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          {a.checks.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {a.checks.slice(0, 2).map((c) => (
                                <span
                                  key={c.id}
                                  className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                >
                                  {c.id}
                                </span>
                              ))}
                              {a.checks.length > 2 && (
                                <span className="text-[10px] text-gray-400">
                                  +{a.checks.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-gray-700">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => navigate(`/views/rack/${a.rack_id}`)}
                            className="hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-700/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors dark:border-gray-700 dark:text-gray-400"
                          >
                            View rack <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  } else {
                    const n = row.data;
                    return (
                      <tr key={`slurm-${n.node}`} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3.5">
                          <StatusBadge status={row.sev as 'CRIT' | 'WARN'} size="md" />
                        </td>
                        <td className="truncate px-4 py-3.5 font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {n.node}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <Cpu className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                            Slurm
                          </span>
                        </td>
                        <td className="truncate px-4 py-3.5 text-sm text-gray-600 capitalize dark:text-gray-300">
                          {n.status}
                          {n.partitions.length > 0 && ` · ${n.partitions.join(', ')}`}
                        </td>
                        <td className="truncate px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                          {n.rack_name ?? '—'}
                        </td>
                        <td className="truncate px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                          —
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] text-gray-300 dark:text-gray-700">—</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() =>
                              n.rack_id
                                ? navigate(`/views/rack/${n.rack_id}`)
                                : navigate('/slurm/alerts')
                            }
                            className="hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-700/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors dark:border-gray-700 dark:text-gray-400"
                          >
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && sortedRows.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showAll ? (
                <>
                  Showing all{' '}
                  <b className="text-gray-700 dark:text-gray-200">{sortedRows.length}</b> results
                </>
              ) : (
                <>
                  Showing{' '}
                  <b className="text-gray-700 dark:text-gray-200">
                    {firstEntry}–{lastEntry}
                  </b>{' '}
                  of <b className="text-gray-700 dark:text-gray-200">{sortedRows.length}</b> results
                </>
              )}
            </p>

            {!showAll && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <div className="flex items-center gap-1">
                  {pageNums.map((p, i) =>
                    p === '...' ? (
                      <span
                        key={`e-${i}`} // eslint-disable-line react/no-array-index-key
                        className="flex h-9 w-9 items-center justify-center text-sm text-gray-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          p === safePage
                            ? 'bg-brand-500 text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                        }`}
                      >
                        {p + 1}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage === totalPages - 1}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
