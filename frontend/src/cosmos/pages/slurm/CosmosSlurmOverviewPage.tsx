import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, XCircle, Server } from 'lucide-react';
import { api } from '../../../services/api';
import type { SlurmSummary, SlurmPartitionSummary, RoomSummary } from '../../../types';

const SEV_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

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
const sevColor = (s: string) => SEV_COLOR[s] ?? SEV_COLOR.UNKNOWN;

export const CosmosSlurmOverviewPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState<string>('');
  const [summary, setSummary] = useState<SlurmSummary | null>(null);
  const [partitions, setPartitions] = useState<SlurmPartitionSummary | null>(null);
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
        const [s, p] = await Promise.all([
          api.getSlurmSummary(roomId || undefined),
          api.getSlurmPartitions(roomId || undefined),
        ]);
        if (active) {
          setSummary(s);
          setPartitions(p);
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

  const totalNodes = summary?.total_nodes ?? 0;
  const crit = summary?.by_severity?.CRIT ?? 0;
  const warn = summary?.by_severity?.WARN ?? 0;
  const allocated = (summary?.by_status?.allocated ?? 0) + (summary?.by_status?.alloc ?? 0);
  const allocPct = totalNodes > 0 ? Math.round((allocated / totalNodes) * 100) : 0;

  const byStatus = summary?.by_status ?? {};
  const statusEntries = Object.entries(byStatus).filter(([, v]) => v > 0);
  const bySev = summary?.by_severity ?? {};
  const sevEntries = Object.entries(bySev).filter(([, v]) => v > 0);
  const partEntries = Object.entries(partitions?.partitions ?? {}).slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Slurm Overview</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cluster-wide status</p>
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
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Nodes', value: totalNodes, icon: Server, color: 'text-brand-500' },
              { label: 'CRIT', value: crit, icon: XCircle, color: 'text-red-500' },
              { label: 'WARN', value: warn, icon: AlertTriangle, color: 'text-amber-500' },
              { label: 'Allocated', value: `${allocPct}%`, icon: Activity, color: 'text-blue-500' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Severity bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Severity distribution
            </h3>
            <div className="flex h-8 w-full overflow-hidden rounded-lg">
              {sevEntries.map(([sev, count]) => (
                <div
                  key={sev}
                  title={`${sev}: ${count}`}
                  className="h-full transition-all"
                  style={{
                    width: `${(count / totalNodes) * 100}%`,
                    backgroundColor: sevColor(sev),
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {sevEntries.map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: sevColor(sev) }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{sev}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Status distribution
            </h3>
            <div className="flex h-8 w-full overflow-hidden rounded-lg">
              {statusEntries.map(([st, count]) => (
                <div
                  key={st}
                  title={`${st}: ${count}`}
                  className="h-full transition-all"
                  style={{
                    width: `${(count / totalNodes) * 100}%`,
                    backgroundColor: statusColor(st),
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {statusEntries.map(([st, count]) => (
                <div key={st} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: statusColor(st) }}
                  />
                  <span className="text-xs text-gray-500 capitalize dark:text-gray-400">{st}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Partitions */}
          {partEntries.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Partitions
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {partEntries.map(([name, states]) => {
                  const total = Object.values(states).reduce((a, b) => a + b, 0);
                  const alloc = (states.allocated ?? 0) + (states.alloc ?? 0);
                  return (
                    <div
                      key={name}
                      className="rounded-xl border border-gray-100 p-3 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                          {name}
                        </span>
                        <span className="text-xs text-gray-400">{total} nodes</span>
                      </div>
                      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        {Object.entries(states)
                          .filter(([, v]) => v > 0)
                          .map(([st, count]) => (
                            <div
                              key={st}
                              style={{
                                width: `${(count / total) * 100}%`,
                                backgroundColor: statusColor(st),
                              }}
                              className="h-full"
                            />
                          ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
                        <span>{total > 0 ? Math.round((alloc / total) * 100) : 0}% alloc</span>
                        <span>{states.idle ?? 0} idle</span>
                        {(states.down ?? 0) > 0 && (
                          <span className="text-red-500">{states.down} down</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
