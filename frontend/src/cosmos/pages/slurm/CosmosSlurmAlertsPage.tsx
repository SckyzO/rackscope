import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import type { SlurmNodeEntry, RoomSummary } from '../../../types';

const SEV_CLS: Record<string, string> = {
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const STATUS_COLOR: Record<string, string> = {
  down: '#ef4444',
  drain: '#f97316',
  drained: '#f97316',
  draining: '#f59e0b',
  mixed: '#8b5cf6',
  fail: '#ef4444',
  unknown: '#6b7280',
};

export const CosmosSlurmAlertsPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomId, setRoomId] = useState('');
  const [allNodes, setAllNodes] = useState<SlurmNodeEntry[]>([]);
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
        const data = await api.getSlurmNodes(roomId || undefined);
        if (active) {
          setAllNodes(data?.nodes ?? []);
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

  const alerts = allNodes.filter((n) => n.severity === 'CRIT' || n.severity === 'WARN');
  const crits = alerts.filter((n) => n.severity === 'CRIT');
  const warns = alerts.filter((n) => n.severity === 'WARN');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alerts</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">CRIT and WARN nodes only</p>
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

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total alerts', value: alerts.length, color: 'text-gray-900 dark:text-white' },
          { label: 'CRIT', value: crits.length, icon: XCircle, color: 'text-red-500' },
          { label: 'WARN', value: warns.length, icon: AlertTriangle, color: 'text-amber-500' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            {s.icon && <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />}
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Alert nodes</h3>
        </div>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
            <XCircle className="h-8 w-8 text-green-400" />
            <span className="text-sm">No alerts — all nodes healthy</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Severity', 'Node', 'Status', 'Partitions', 'Location'].map((h) => (
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
                {[...crits, ...warns].map((n) => (
                  <tr key={n.node} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${SEV_CLS[n.severity] ?? ''}`}
                      >
                        {n.severity}
                      </span>
                    </td>
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
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {n.partitions.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {[n.room_name, n.rack_name].filter(Boolean).join(' › ')}
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
