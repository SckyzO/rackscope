import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import type { SlurmPartitionSummary, RoomSummary } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard, LoadingState, EmptyState } from '../templates/EmptyPage';

const STATUS_COLOR: Record<string, string> = {
  idle: '#10b981', allocated: '#3b82f6', alloc: '#3b82f6', completing: '#3b82f6',
  down: '#ef4444', drain: '#f97316', drained: '#f97316', draining: '#f59e0b',
  mixed: '#8b5cf6', maint: '#6366f1', unknown: '#6b7280',
};
const statusColor = (s: string) => STATUS_COLOR[s.toLowerCase()] ?? '#6b7280';

export const SlurmPartitionsPage = () => {
  usePageTitle('Slurm Partitions');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [data, setData] = useState<SlurmPartitionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getRooms().then(setRooms).catch(() => { /* noop */ }); }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const d = await api.getSlurmPartitions(roomId || undefined);
        if (active) { setData(d); setLoading(false); }
      } catch { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [roomId]);

  const partEntries = Object.entries(data?.partitions ?? {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partitions"
        description={`${partEntries.length} partition${partEntries.length !== 1 ? 's' : ''}`}
        breadcrumb={
          <PageBreadcrumb items={[
            { label: 'Home', href: '/cosmos' },
            { label: 'Slurm', href: '/slurm/overview' },
            { label: 'Partitions' },
          ]} />
        }
        actions={
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <option value="">All rooms</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        }
      />

      <SectionCard title="Partition breakdown">
        {loading ? (
          <LoadingState message="Loading partitions…" />
        ) : partEntries.length === 0 ? (
          <EmptyState title="No partition data" description="No Slurm partition data available" />
        ) : (
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Partition', 'Total', 'Distribution', 'States'].map((h) => (
                    <th key={h} className="bg-gray-50 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {partEntries.map(([name, states]) => {
                  const total = Object.values(states).reduce((a, b) => a + b, 0);
                  const entries = Object.entries(states).filter(([, v]) => v > 0);
                  return (
                    <tr key={name} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-5 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-white">{name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{total}</td>
                      <td className="px-5 py-3">
                        <div className="flex h-5 w-64 overflow-hidden rounded-full">
                          {entries.map(([st, count]) => (
                            <div key={st} title={`${st}: ${count}`}
                              style={{ width: `${(count / total) * 100}%`, backgroundColor: statusColor(st) }}
                              className="h-full" />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {entries.map(([st, count]) => (
                            <span key={st} className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize text-white"
                              style={{ backgroundColor: statusColor(st) }}>{st} {count}</span>
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
      </SectionCard>
    </div>
  );
};
