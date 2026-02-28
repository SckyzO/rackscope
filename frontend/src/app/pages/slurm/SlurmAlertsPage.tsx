import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import type { SlurmNodeEntry, RoomSummary } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  EmptyState,
} from '../templates/EmptyPage';

const STATUS_COLOR: Record<string, string> = {
  down: '#ef4444',
  drain: '#f97316',
  drained: '#f97316',
  draining: '#f59e0b',
  mixed: '#8b5cf6',
  fail: '#ef4444',
  unknown: '#6b7280',
};
const statusColor = (s: string) => STATUS_COLOR[s.toLowerCase()] ?? '#6b7280';

const SevBadge = ({ sev }: { sev: string }) => {
  if (sev === 'CRIT')
    return (
      <span className="bg-error-50 text-error-500 dark:bg-error-500/15 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
        <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
        CRIT
      </span>
    );
  return (
    <span className="bg-warning-50 text-warning-500 dark:bg-warning-500/15 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
      <span className="bg-warning-500 h-1.5 w-1.5 rounded-full" />
      WARN
    </span>
  );
};

export const SlurmAlertsPage = () => {
  usePageTitle('Slurm Alerts');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [allNodes, setAllNodes] = useState<SlurmNodeEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
          setAllNodes(data?.nodes ?? []);
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

  const alerts = allNodes.filter((n) => n.severity === 'CRIT' || n.severity === 'WARN');
  const crits = alerts.filter((n) => n.severity === 'CRIT');
  const warns = alerts.filter((n) => n.severity === 'WARN');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Slurm Alerts"
        description="Critical and warning nodes only"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'Slurm', href: '/slurm/overview' },
              { label: 'Alerts' },
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total alerts',
            value: alerts.length,
            icon: AlertTriangle,
            bg: 'bg-gray-100 dark:bg-gray-800',
            color: 'text-gray-600 dark:text-gray-400',
          },
          {
            label: 'Critical',
            value: crits.length,
            icon: XCircle,
            bg: 'bg-red-50 dark:bg-red-500/10',
            color: 'text-red-500',
          },
          {
            label: 'Warning',
            value: warns.length,
            icon: AlertTriangle,
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            color: 'text-amber-500',
          },
        ].map((s) => (
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

      {/* Table */}
      <SectionCard title="Alert nodes" desc="Sorted by severity — CRIT first, then WARN">
        {loading ? (
          <LoadingState message="Loading alerts…" />
        ) : alerts.length === 0 ? (
          <EmptyState title="No alerts" description="All nodes are healthy" />
        ) : (
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Severity', 'Node', 'Status', 'Partitions', 'Rack', 'Room'].map((h) => (
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
                {[...crits, ...warns].map((n) => (
                  <tr key={n.node} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <SevBadge sev={n.severity} />
                    </td>
                    <td className="truncate px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {n.node}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 font-mono text-xs font-medium text-white capitalize"
                        style={{ backgroundColor: statusColor(n.status) }}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {n.partitions.join(', ') || '—'}
                    </td>
                    <td className="truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {n.rack_name ?? '—'}
                    </td>
                    <td className="truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {n.room_name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
