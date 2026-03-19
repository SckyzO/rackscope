import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Filter } from 'lucide-react';
import { api } from '@src/services/api';
import type { SlurmNodeEntry, RoomSummary } from '@src/types';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, LoadingState, EmptyState } from '../templates/EmptyPage';
import { RefreshButton, useAutoRefresh } from '@app/components/RefreshButton';
import { SearchInput } from '@app/components/forms/SearchInput';
import { Dropdown } from '@app/components/ui/Dropdown';
import { useSlurmConfig } from '@src/hooks/useSlurmConfig';

// ── Severity badge — hardcoded classes (avoids Firefox color-mix issue) ────────

const SeverityBadge = ({ sev }: { sev: string }) => {
  if (sev === 'CRIT')
    return (
      <span className="bg-error-50 text-error-500 dark:bg-error-500/15 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
        CRIT
      </span>
    );
  if (sev === 'WARN')
    return (
      <span className="bg-warning-50 text-warning-500 dark:bg-warning-500/15 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="bg-warning-500 h-1.5 w-1.5 rounded-full" />
        WARN
      </span>
    );
  if (sev === 'OK')
    return (
      <span className="bg-success-50 text-success-500 dark:bg-success-500/15 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="bg-success-500 h-1.5 w-1.5 rounded-full" />
        OK
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      {sev}
    </span>
  );
};

// ── Dynamic rows constants ─────────────────────────────────────────────────────
// Fallback values used before the ResizeObserver measures the actual DOM elements.
// ROW_H / THEAD_H are typical pixel heights; SAFETY is a small buffer to avoid
// showing a partial last row.
const ROW_H = 46;
const THEAD_H = 41;
const SAFETY = 8;

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current <= 3) return [0, 1, 2, 3, '...', total - 1];
  if (current >= total - 4) return [0, '...', total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const SlurmNodesPage = () => {
  usePageTitle('Slurm Nodes');
  const { getStatusColor: statusColor } = useSlurmConfig();

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [nodes, setNodes] = useState<SlurmNodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const tableAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getRooms()
      .then(setRooms)
      .catch(() => {
        /* noop */
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSlurmNodes(roomId || undefined);
      setNodes(data?.nodes ?? []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    let active = true;
    void load().then(() => {
      if (!active) {
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [load]);

  const handleQuietRefresh = useCallback(() => void load(), [load]);
  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('slurm-nodes', handleQuietRefresh);

  // Reset page on filter change (queueMicrotask avoids synchronous setState in effect)
  useEffect(() => {
    queueMicrotask(() => setPage(0));
  }, [search, sevFilter, statusFilter, roomId]);

  const availableStatuses = useMemo(
    () => [...new Set(nodes.map((n) => n.status.toLowerCase()))].sort(),
    [nodes]
  );
  const availableSevs = useMemo(() => {
    const order = ['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const;
    const present = new Set(nodes.map((n) => n.severity));
    return order.filter((s) => present.has(s));
  }, [nodes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return nodes.filter((n) => {
      if (
        q &&
        !n.node.toLowerCase().includes(q) &&
        !n.status.toLowerCase().includes(q) &&
        !(n.room_name ?? '').toLowerCase().includes(q) &&
        !(n.rack_name ?? '').toLowerCase().includes(q) &&
        !n.partitions.some((p) => p.toLowerCase().includes(q))
      )
        return false;
      if (sevFilter && n.severity !== sevFilter) return false;
      if (statusFilter && n.status.toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [nodes, search, sevFilter, statusFilter]);

  // ResizeObserver — dynamic perPage
  useEffect(() => {
    if (!tableAreaRef.current) return;
    const calc = () => {
      const container = tableAreaRef.current;
      if (!container) return;
      const available = container.getBoundingClientRect().height;
      const firstRow = container.querySelector('tbody tr');
      const thead = container.querySelector('thead');
      const rowH = firstRow ? firstRow.getBoundingClientRect().height : ROW_H;
      const theadH = thead ? thead.getBoundingClientRect().height : THEAD_H;
      setPerPage(Math.max(5, Math.floor((available - theadH - SAFETY) / rowH)));
    };
    const obs = new ResizeObserver(calc);
    obs.observe(tableAreaRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!tableAreaRef.current || loading) return;
    const container = tableAreaRef.current;
    queueMicrotask(() => {
      const available = container.getBoundingClientRect().height;
      const firstRow = container.querySelector('tbody tr');
      const thead = container.querySelector('thead');
      const rowH = firstRow ? firstRow.getBoundingClientRect().height : ROW_H;
      const theadH = thead ? thead.getBoundingClientRect().height : THEAD_H;
      setPerPage(Math.max(5, Math.floor((available - theadH - SAFETY) / rowH)));
    });
  }, [loading]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  const pageNums = buildPages(safePage, totalPages);
  const firstEntry = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const lastEntry = Math.min((safePage + 1) * perPage, filtered.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Node List"
          breadcrumb={
            <PageBreadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: 'Slurm', href: '/slurm/overview' },
                { label: 'Nodes' },
              ]}
            />
          }
          actions={
            <div className="flex items-center gap-2">
              <Dropdown
                value={roomId}
                onChange={setRoomId}
                options={[
                  { value: '', label: 'All rooms' },
                  ...rooms.map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
              <RefreshButton
                onRefresh={load}
                loading={loading}
                autoRefreshMs={autoRefreshMs}
                onIntervalChange={onIntervalChange}
              />
            </div>
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <div className="min-w-[200px] flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search nodes…" />
          </div>

          {availableSevs.length > 0 && (
            <div className="flex h-9 items-center gap-0.5 rounded-lg border border-gray-200 px-1.5 dark:border-gray-700">
              <Filter className="mr-1 h-3.5 w-3.5 shrink-0 text-gray-400" />
              <button
                onClick={() => setSevFilter('')}
                className={`flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${!sevFilter ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`}
              >
                All
              </button>
              {availableSevs.map((s) => (
                <button
                  key={s}
                  onClick={() => setSevFilter(sevFilter === s ? '' : s)}
                  className={`flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${sevFilter === s ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {availableStatuses.length > 0 && (
            <div className="flex h-9 items-center gap-0.5 rounded-lg border border-gray-200 px-1.5 dark:border-gray-700">
              <button
                onClick={() => setStatusFilter('')}
                className={`flex h-7 items-center rounded-md px-2.5 text-xs font-medium capitalize transition-colors ${!statusFilter ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`}
              >
                All status
              </button>
              {availableStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                  className={`flex h-7 items-center rounded-md px-2 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`}
                  style={statusFilter === s ? { backgroundColor: statusColor(s) } : {}}
                >
                  <span
                    className="mr-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: statusColor(s) }}
                  />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={tableAreaRef} className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingState message="Loading nodes…" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No nodes found"
                description={
                  search ? `No results for "${search}"` : 'No nodes match the selected filters'
                }
              />
            </div>
          ) : (
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Node', 'Status', 'Severity', 'Partitions', 'Rack', 'Room'].map((h) => (
                    <th
                      key={h}
                      className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageRows.map((n) => (
                  <tr key={n.node} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="truncate px-4 py-2.5 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {n.node}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 font-mono text-xs font-medium text-white capitalize"
                        style={{ backgroundColor: statusColor(n.status) }}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <SeverityBadge sev={n.severity} />
                    </td>
                    <td className="truncate px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                      {n.partitions.join(', ') || '—'}
                    </td>
                    <td className="truncate px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                      {n.rack_name ?? '—'}
                    </td>
                    <td className="truncate px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                      {n.room_name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{' '}
              <b className="text-gray-700 dark:text-gray-200">
                {firstEntry}–{lastEntry}
              </b>{' '}
              of <b className="text-gray-700 dark:text-gray-200">{filtered.length}</b> nodes
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                ← Previous
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
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === safePage ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'}`}
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
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
