import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  XCircle,
  AlertTriangle,
  Filter,
  ChevronRight,
  ChevronLeft,
  Server,
  Cpu,
  Search,
} from 'lucide-react';
import { api } from '@src/services/api';
import type { ActiveAlert, SlurmNodeEntry } from '@src/types';
import { usePageTitle } from '../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, LoadingState, EmptyState } from './templates/EmptyPage';
import { RefreshButton, useAutoRefresh } from '../components/RefreshButton';

// ── Constants ─────────────────────────────────────────────────────────────────

/// Severity badge — classes identiques à BadgesPage (ref: /ui/badges, Light with Left Icon)
const SeverityBadge = ({ sev }: { sev: string }) => {
  if (sev === 'CRIT')
    return (
      <span className="bg-error-50 text-error-500 dark:bg-error-500/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
        <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
        Critical
      </span>
    );
  if (sev === 'WARN')
    return (
      <span className="bg-warning-50 text-warning-500 dark:bg-warning-500/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
        <span className="bg-warning-500 h-1.5 w-1.5 rounded-full" />
        Warning
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      {sev}
    </span>
  );
};

type FilterType = 'all' | 'crit' | 'warn' | 'infra' | 'slurm';

type UnifiedRow =
  | { kind: 'infra'; sev: string; data: ActiveAlert }
  | { kind: 'slurm'; sev: string; data: SlurmNodeEntry };

// Fallback heights — the ResizeObserver measures real values from the DOM
const FALLBACK_ROW_H = 72; // measured: badge (py-1+text-xs) in td py-3.5
const FALLBACK_THEAD_H = 41; // measured: th py-3 + text-xs
const SAFETY = 8; // sub-pixel safety buffer

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current <= 3) return [0, 1, 2, 3, '...', total - 1];
  if (current >= total - 4) return [0, '...', total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const NotificationsFullPage = () => {
  usePageTitle('Notifications');
  const navigate = useNavigate();

  const [infraAlerts, setInfraAlerts] = useState<ActiveAlert[]>([]);
  const [slurmAlerts, setSlurmAlerts] = useState<SlurmNodeEntry[]>([]);
  const [slurmEnabled, setSlurmEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  // Dynamic rows — ResizeObserver calculates how many rows fit without scrolling
  const [perPage, setPerPage] = useState(10);
  const tableAreaRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [infraData, slurmData] = await Promise.all([
        api.getActiveAlerts(),
        api.getSlurmNodes().catch(() => null),
      ]);
      setInfraAlerts(infraData?.alerts ?? []);
      // Only enable Slurm if the response is valid (not a 404 served from stale cache)
      if (slurmData !== null && Array.isArray(slurmData?.nodes)) {
        setSlurmEnabled(true);
        const nodes: SlurmNodeEntry[] = slurmData.nodes;
        setSlurmAlerts(nodes.filter((n) => n.severity === 'CRIT' || n.severity === 'WARN'));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('notifications', loadData);

  // Initial load
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ResizeObserver — measures real heights from the DOM, recalculates perPage
  useEffect(() => {
    if (!tableAreaRef.current) return;
    const calc = () => {
      const container = tableAreaRef.current;
      if (!container) return;
      const available = container.getBoundingClientRect().height;
      // Real measurement from the DOM (fallback if not yet rendered)
      const firstRow = container.querySelector('tbody tr');
      const thead = container.querySelector('thead');
      const rowH = firstRow ? firstRow.getBoundingClientRect().height : FALLBACK_ROW_H;
      const theadH = thead ? thead.getBoundingClientRect().height : FALLBACK_THEAD_H;
      const rows = Math.max(5, Math.floor((available - theadH - SAFETY) / rowH));
      setPerPage(rows);
    };
    const obs = new ResizeObserver(calc);
    obs.observe(tableAreaRef.current);
    return () => obs.disconnect();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  // Recalculate perPage once real rows are rendered (data loaded)
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

  // Stats
  const totalCrit =
    infraAlerts.filter((a) => a.state === 'CRIT').length +
    slurmAlerts.filter((n) => n.severity === 'CRIT').length;
  const totalWarn =
    infraAlerts.filter((a) => a.state === 'WARN').length +
    slurmAlerts.filter((n) => n.severity === 'WARN').length;
  const total = infraAlerts.length + slurmAlerts.length;
  const affectedRacks = new Set(infraAlerts.map((a) => a.rack_id).filter(Boolean)).size;

  // Unified rows
  const allRows = useMemo<UnifiedRow[]>(
    () => [
      ...infraAlerts.map((d): UnifiedRow => ({ kind: 'infra', sev: d.state, data: d })),
      ...slurmAlerts.map((d): UnifiedRow => ({ kind: 'slurm', sev: d.severity, data: d })),
    ],
    [infraAlerts, slurmAlerts]
  );

  // Filter + search
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
            n.rack_name?.toLowerCase().includes(q) ||
            n.partitions?.some((p) => p.toLowerCase().includes(q))
          );
        }
      });
    }
    return rows;
  }, [allRows, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = showAll
    ? filteredRows
    : filteredRows.slice(safePage * perPage, (safePage + 1) * perPage);
  const pageNums = buildPages(safePage, totalPages);
  const firstEntry = filteredRows.length === 0 ? 0 : safePage * perPage + 1;
  const lastEntry = Math.min((safePage + 1) * perPage, filteredRows.length);

  const filters = [
    { id: 'all' as FilterType, label: 'All', count: total },
    { id: 'crit' as FilterType, label: 'Critical', count: totalCrit },
    { id: 'warn' as FilterType, label: 'Warning', count: totalWarn },
    { id: 'infra' as FilterType, label: 'Infrastructure', count: infraAlerts.length },
    ...(slurmEnabled
      ? [{ id: 'slurm' as FilterType, label: 'Slurm', count: slurmAlerts.length }]
      : []),
  ];

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

      {/* Table card — fills remaining height */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Toolbar — all elements h-9 (36px) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          {/* Search — h-9 */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts…"
              className="focus:border-brand-500 h-9 w-full rounded-lg border border-gray-200 pr-4 pl-9 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Filters — h-9, même bordure + arrondi que la search */}
          <div className="flex h-9 items-center gap-0.5 rounded-lg border border-gray-200 px-1.5 dark:border-gray-700">
            <Filter className="mr-1 h-3.5 w-3.5 shrink-0 text-gray-400" />
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
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

          {/* Désactiver pagination — h-9, même style box */}
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
            Show all notifications
          </button>
        </div>

        {/* Table area — hauteur mesurée, perPage calculé dynamiquement */}
        <div ref={tableAreaRef} className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingState message="Loading alerts…" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No alerts"
                description={
                  search
                    ? `No results for "${search}"`
                    : filter === 'all'
                      ? 'All nodes are healthy'
                      : `No ${filter.toUpperCase()} alerts`
                }
              />
            </div>
          ) : (
            <table className="w-full table-fixed">
              {/* Proportional widths — stable from 700px to 4K */}
              <colgroup>
                <col style={{ width: '10%' }} /> {/* Severity  */}
                <col style={{ width: '12%' }} /> {/* Name      */}
                <col style={{ width: '10%' }} /> {/* Type      */}
                <col style={{ width: '20%' }} /> {/* Location  */}
                <col style={{ width: '13%' }} /> {/* Rack      */}
                <col style={{ width: '11%' }} /> {/* Room      */}
                <col style={{ width: '16%' }} /> {/* Checks    */}
                <col style={{ width: '8%' }} /> {/* Action    */}
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Severity', 'Name', 'Type', 'Location', 'Rack', 'Room', 'Checks'].map((h) => (
                    <th
                      key={h}
                      className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="bg-gray-50 px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageRows.map((row, i) => {
                  if (row.kind === 'infra') {
                    const a = row.data;
                    return (
                      <tr key={`i-${i}`} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3.5">
                          <SeverityBadge sev={row.sev} />
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
                              {a.checks.slice(0, 2).map((c, j) => (
                                <span
                                  key={j}
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
                      <tr key={`s-${i}`} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3.5">
                          <SeverityBadge sev={row.sev} />
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
        {!loading && filteredRows.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showAll ? (
                <>
                  Showing all{' '}
                  <b className="text-gray-700 dark:text-gray-200">{filteredRows.length}</b> results
                </>
              ) : (
                <>
                  Showing{' '}
                  <b className="text-gray-700 dark:text-gray-200">
                    {firstEntry}–{lastEntry}
                  </b>{' '}
                  of <b className="text-gray-700 dark:text-gray-200">{filteredRows.length}</b>{' '}
                  results
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
                        key={`e-${i}`}
                        className="flex h-9 w-9 items-center justify-center text-sm text-gray-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          p === safePage
                            ? 'bg-brand-500 text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                        }`}
                      >
                        {(p as number) + 1}
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
