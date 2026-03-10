import { useState, useEffect, useCallback } from 'react';
import { api } from '@src/services/api';
import type { SlurmPartitionSummary, RoomSummary } from '@src/types';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  EmptyState,
} from '../templates/EmptyPage';
import { RefreshButton, useAutoRefresh } from '@app/components/RefreshButton';
import { Dropdown } from '@app/components/ui/Dropdown';
import { useSlurmConfig } from '@src/hooks/useSlurmConfig';

export const SlurmPartitionsPage = () => {
  usePageTitle('Slurm Partitions');
  const { getStatusColor: statusColor } = useSlurmConfig();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [data, setData] = useState<SlurmPartitionSummary | null>(null);
  const [loading, setLoading] = useState(true);

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
      const d = await api.getSlurmPartitions(roomId || undefined);
      setData(d);
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
  const { autoRefreshMs, onIntervalChange } = useAutoRefresh(
    'slurm-partitions',
    handleQuietRefresh
  );

  const partEntries = Object.entries(data?.partitions ?? {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partitions"
        description={`${partEntries.length} partition${partEntries.length !== 1 ? 's' : ''}`}
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Slurm', href: '/slurm/overview' },
              { label: 'Partitions' },
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
                    <th
                      key={h}
                      className="bg-gray-50 px-5 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-800 dark:text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
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
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {total}
                      </td>
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
      </SectionCard>
    </div>
  );
};
