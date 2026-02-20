import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../../services/api';
import type { SlurmNodeEntry, RoomSummary } from '../../../types';

const SEV_CLS: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_COLOR: Record<string, string> = {
  idle: '#10b981',
  allocated: '#3b82f6',
  alloc: '#3b82f6',
  down: '#ef4444',
  drain: '#f97316',
  drained: '#f97316',
  draining: '#f59e0b',
  mixed: '#8b5cf6',
  unknown: '#6b7280',
};

export const CosmosSlurmNodesPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [nodes, setNodes] = useState<SlurmNodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');

  useEffect(() => {
    api
      .getRooms()
      .then(setRooms)
      .catch(() => {});
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
    load();
    return () => {
      active = false;
    };
  }, [roomId]);

  const filtered = useMemo(() => {
    return nodes.filter((n) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        n.node.toLowerCase().includes(q) ||
        n.status.toLowerCase().includes(q) ||
        (n.room_name ?? '').toLowerCase().includes(q) ||
        (n.rack_name ?? '').toLowerCase().includes(q) ||
        n.partitions.some((p) => p.toLowerCase().includes(q));
      const matchSev = !sevFilter || n.severity === sevFilter;
      return matchSearch && matchSev;
    });
  }, [nodes, search, sevFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Node List</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{filtered.length} nodes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            />
          </div>
          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="">All severities</option>
            {['CRIT', 'WARN', 'OK', 'UNKNOWN'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-gray-400">No nodes found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Node', 'Status', 'Severity', 'Partitions', 'Location'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((n) => (
                  <tr key={n.node} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-900 dark:text-white">
                      {n.node}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[11px] font-medium text-white capitalize"
                        style={{
                          backgroundColor: STATUS_COLOR[n.status.toLowerCase()] ?? '#6b7280',
                        }}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${SEV_CLS[n.severity] ?? SEV_CLS.UNKNOWN}`}
                      >
                        {n.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {n.partitions.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {[n.room_name, n.rack_name, n.device_name].filter(Boolean).join(' › ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
