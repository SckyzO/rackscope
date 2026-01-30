import { useEffect, useMemo, useState } from 'react';
import type { RoomSummary, SlurmNodeEntry } from '../types';
import { api } from '../services/api';

const severityStyles: Record<string, string> = {
  WARN: 'text-status-warn bg-status-warn/10 border-status-warn/30',
  CRIT: 'text-status-crit bg-status-crit/10 border-status-crit/30',
};

export const SlurmAlertsPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomFilter, setRoomFilter] = useState('');
  const [alerts, setAlerts] = useState<SlurmNodeEntry[]>([]);

  useEffect(() => {
    let active = true;
    api
      .getRooms()
      .then((data) => {
        if (active) setRooms(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .getSlurmNodes(roomFilter || undefined)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.nodes) ? data.nodes : [];
        setAlerts(list.filter((node) => node.severity === 'CRIT' || node.severity === 'WARN'));
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [roomFilter]);

  const totals = useMemo(() => {
    return alerts.reduce(
      (acc, node) => {
        acc[node.severity] = (acc[node.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [alerts]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-[var(--color-accent)] uppercase">
            Slurm
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text-base)]">Active Alerts</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Room filter</span>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-1 text-xs text-gray-200"
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Total</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--color-text-base)]">
            {alerts.length}
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Critical</div>
          <div className="text-status-crit mt-2 text-3xl font-semibold">{totals.CRIT || 0}</div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Warning</div>
          <div className="text-status-warn mt-2 text-3xl font-semibold">{totals.WARN || 0}</div>
        </div>
      </div>

      <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
        <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Alert list</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="text-[10px] text-gray-500 uppercase">
              <tr>
                <th className="py-2">Node</th>
                <th className="py-2">Status</th>
                <th className="py-2">Severity</th>
                <th className="py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((node) => (
                <tr key={node.node} className="border-t border-[var(--color-border)]/30">
                  <td className="py-2 font-medium text-gray-200">{node.node}</td>
                  <td className="py-2 text-gray-200 capitalize">{node.status}</td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                        severityStyles[node.severity] || severityStyles.WARN
                      }`}
                    >
                      {node.severity}
                    </span>
                  </td>
                  <td className="py-2 text-[10px] text-gray-400">
                    {[
                      node.site_name || node.site_id,
                      node.room_name || node.room_id,
                      node.rack_name || node.rack_id,
                    ]
                      .filter(Boolean)
                      .join(' / ') || '--'}
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={4}>
                    No active Slurm alerts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
