import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter } from 'lucide-react';
import { api } from '../../../services/api';
import type { SlurmNodeEntry, RoomSummary } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, LoadingState, EmptyState } from '../templates/EmptyPage';

// ── Status badge — inline style (many status values) ──────────────────────────

const STATUS_COLOR: Record<string, string> = {
  idle: '#10b981',
  allocated: '#3b82f6',
  alloc: '#3b82f6',
  completing: '#3b82f6',
  comp: '#3b82f6',
  down: '#ef4444',
  drain: '#f97316',
  drained: '#f97316',
  draining: '#f59e0b',
  mixed: '#8b5cf6',
  mix: '#8b5cf6',
  maint: '#6366f1',
  unknown: '#6b7280',
};

const statusColor = (s: string) => STATUS_COLOR[s.toLowerCase()] ?? '#6b7280';

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getSlurmNodes(roomId || undefined);
        if (active) {
          setNodes(data?.nodes ?? []);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [roomId]);

  // Reset page on filter change (queueMicrotask avoids synchronous setState in effect)
  useEffect(() => {
    queueMicrotask(() => setPage(0));
  }, [search, sevFilter, statusFilter, roomId]);

  // Dynamic statuses and severities present in data
  const availableStatuses = useMemo(
    () => [...new Set(nodes.map((n) => n.status.toLowerCase()))].sort(),
    [nodes]
  );
  const availableSevs = useMemo(() => {
    const order = ['CRIT', 'WARN', 'OK', 'UNKNOWN'];
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
    // Use queueMicrotask to avoid synchronous setState in effect
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
                { label: 'Home', href: '/cosmos' },
                { label: 'Slurm', href: '/slurm/overview' },
                { label: 'Nodes' },
              ]}
            />
          }
          actions={
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="">All rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          }
        />
      </div>

      {/* Table card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes…"
              className="focus:border-brand-500 h-9 w-full rounded-lg border border-gray-200 pr-4 pl-9 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Severity filter — dynamic */}
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

          {/* Status filter — dynamic, only present statuses */}
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

        {/* Table */}
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

        {/* Pagination */}
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
                      key={`e-${i}`}
                      className="flex h-9 w-9 items-center justify-center text-sm text-gray-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === safePage ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'}`}
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
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
