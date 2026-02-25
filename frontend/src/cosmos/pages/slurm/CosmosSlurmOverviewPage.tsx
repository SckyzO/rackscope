import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, XCircle, Server } from 'lucide-react';
import { api } from '../../../services/api';
import type { SlurmSummary, SlurmPartitionSummary, RoomSummary } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard, LoadingState } from '../templates/EmptyPage';

const SEV_COLOR: Record<string, string> = {
  OK: '#22c55e', WARN: '#f59e0b', CRIT: '#ef4444', UNKNOWN: '#6b7280',
};
const STATUS_COLOR: Record<string, string> = {
  idle: '#10b981', allocated: '#3b82f6', alloc: '#3b82f6', completing: '#3b82f6',
  down: '#ef4444', drain: '#f97316', drained: '#f97316', draining: '#f59e0b',
  mixed: '#8b5cf6', maint: '#6366f1', unknown: '#6b7280',
};
const statusColor = (s: string) => STATUS_COLOR[s.toLowerCase()] ?? '#6b7280';
const sevColor = (s: string) => SEV_COLOR[s] ?? SEV_COLOR.UNKNOWN;

export const CosmosSlurmOverviewPage = () => {
  usePageTitle('Slurm Overview');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [summary, setSummary] = useState<SlurmSummary | null>(null);
  const [partitions, setPartitions] = useState<SlurmPartitionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getRooms().then(setRooms).catch(() => {}); }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([
          api.getSlurmSummary(roomId || undefined),
          api.getSlurmPartitions(roomId || undefined),
        ]);
        if (active) { setSummary(s); setPartitions(p); setLoading(false); }
      } catch { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [roomId]);

  const totalNodes = summary?.total_nodes ?? 0;
  const crit = summary?.by_severity?.CRIT ?? 0;
  const warn = summary?.by_severity?.WARN ?? 0;
  const allocated = (summary?.by_status?.allocated ?? 0) + (summary?.by_status?.alloc ?? 0);
  const allocPct = totalNodes > 0 ? Math.round((allocated / totalNodes) * 100) : 0;
  const statusEntries = Object.entries(summary?.by_status ?? {}).filter(([, v]) => v > 0);
  const sevEntries = Object.entries(summary?.by_severity ?? {}).filter(([, v]) => v > 0);
  const partEntries = Object.entries(partitions?.partitions ?? {}).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Slurm Overview"
        description="Cluster-wide status"
        breadcrumb={
          <PageBreadcrumb items={[
            { label: 'Home', href: '/cosmos' },
            { label: 'Slurm', href: '/cosmos/slurm/overview' },
            { label: 'Overview' },
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

      {loading ? (
        <SectionCard title="Loading"><LoadingState message="Loading cluster data…" /></SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Nodes', value: totalNodes, icon: Server, bg: 'bg-brand-50 dark:bg-brand-500/10', color: 'text-brand-500' },
              { label: 'Critical', value: crit, icon: XCircle, bg: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-500' },
              { label: 'Warning', value: warn, icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-500/10', color: 'text-amber-500' },
              { label: 'Allocated', value: `${allocPct}%`, icon: Activity, bg: 'bg-blue-50 dark:bg-blue-500/10', color: 'text-blue-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <SectionCard title="Severity distribution">
            <div className="flex h-8 w-full overflow-hidden rounded-lg">
              {sevEntries.map(([sev, count]) => (
                <div key={sev} title={`${sev}: ${count}`} className="h-full"
                  style={{ width: `${(count / totalNodes) * 100}%`, backgroundColor: sevColor(sev) }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {sevEntries.map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sevColor(sev) }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{sev}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Status distribution">
            <div className="flex h-8 w-full overflow-hidden rounded-lg">
              {statusEntries.map(([st, count]) => (
                <div key={st} title={`${st}: ${count}`} className="h-full"
                  style={{ width: `${(count / totalNodes) * 100}%`, backgroundColor: statusColor(st) }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {statusEntries.map(([st, count]) => (
                <div key={st} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor(st) }} />
                  <span className="text-xs capitalize text-gray-500 dark:text-gray-400">{st}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {partEntries.length > 0 && (
            <SectionCard title="Partitions" desc={`${partEntries.length} partitions`}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {partEntries.map(([name, states]) => {
                  const total = Object.values(states).reduce((a, b) => a + b, 0);
                  const alloc = (states.allocated ?? 0) + (states.alloc ?? 0);
                  return (
                    <div key={name} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{name}</span>
                        <span className="text-xs text-gray-400">{total} nodes</span>
                      </div>
                      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        {Object.entries(states).filter(([, v]) => v > 0).map(([st, count]) => (
                          <div key={st} style={{ width: `${(count / total) * 100}%`, backgroundColor: statusColor(st) }} className="h-full" />
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
                        <span>{total > 0 ? Math.round((alloc / total) * 100) : 0}% alloc</span>
                        <span>{states.idle ?? 0} idle</span>
                        {(states.down ?? 0) > 0 && <span className="text-red-500">{states.down} down</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
};
