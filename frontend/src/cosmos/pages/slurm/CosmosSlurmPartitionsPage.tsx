import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import type { SlurmPartitionSummary, RoomSummary } from '../../../types';

const STATUS_COLOR: Record<string, string> = {
  idle: '#10b981',
  allocated: '#3b82f6',
  alloc: '#3b82f6',
  completing: '#3b82f6',
  down: '#ef4444',
  drain: '#f97316',
  drained: '#f97316',
  draining: '#f59e0b',
  mixed: '#8b5cf6',
  maint: '#8b5cf6',
  unknown: '#6b7280',
};

const statusColor = (s: string) => STATUS_COLOR[s.toLowerCase()] ?? '#6b7280';

export const CosmosSlurmPartitionsPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [data, setData] = useState<SlurmPartitionSummary | null>(null);
  const [loading, setLoading] = useState(true);

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
        const d = await api.getSlurmPartitions(roomId || undefined);
        if (active) {
          setData(d);
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

  const partEntries = Object.entries(data?.partitions ?? {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Partitions</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {partEntries.length} partitions
          </p>
        </div>
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

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
        </div>
      ) : partEntries.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-gray-400">No partition data</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Partition
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Total
                </th>
                <th className="w-64 px-5 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Distribution
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  States
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {partEntries.map(([name, states]) => {
                const total = Object.values(states).reduce((a, b) => a + b, 0);
                const entries = Object.entries(states).filter(([, v]) => v > 0);
                return (
                  <tr key={name} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-5 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {name}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{total}</td>
                    <td className="px-5 py-3">
                      <div className="flex h-5 w-64 overflow-hidden rounded-full">
                        {entries.map(([st, count]) => (
                          <div
                            key={st}
                            title={`${st}: ${count}`}
                            style={{
                              width: `${(count / total) * 100}%`,
                              backgroundColor: statusColor(st),
                            }}
                            className="h-full"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {entries.map(([st, count]) => (
                          <span
                            key={st}
                            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white capitalize"
                            style={{ backgroundColor: statusColor(st) }}
                          >
                            {st} {count}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
