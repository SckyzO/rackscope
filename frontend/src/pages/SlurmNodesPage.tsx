import { useEffect, useMemo, useState } from 'react';
import type { RoomSummary, SlurmNodeEntry } from '../types';
import { api } from '../services/api';

const severityStyles: Record<string, string> = {
  OK: 'text-status-ok bg-status-ok/10 border-status-ok/30',
  WARN: 'text-status-warn bg-status-warn/10 border-status-warn/30',
  CRIT: 'text-status-crit bg-status-crit/10 border-status-crit/30',
  UNKNOWN: 'text-gray-400 bg-white/5 border-white/10',
};

export const SlurmNodesPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomFilter, setRoomFilter] = useState('');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [nodes, setNodes] = useState<SlurmNodeEntry[]>([]);

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
        setNodes(Array.isArray(data?.nodes) ? data.nodes : []);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [roomFilter]);

  const filteredNodes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return nodes.filter((node) => {
      if (severityFilter && node.severity !== severityFilter) return false;
      if (!needle) return true;
      const haystack = [
        node.node,
        node.room_name,
        node.room_id,
        node.rack_name,
        node.rack_id,
        node.device_name,
        node.device_id,
        node.site_name,
        node.site_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [nodes, search, severityFilter]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-[var(--color-accent)] uppercase">
            Slurm
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text-base)]">Node List</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span>Room</span>
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
          <div className="flex items-center gap-2">
            <span>Severity</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-1 text-xs text-gray-200"
            >
              <option value="">All</option>
              <option value="CRIT">CRIT</option>
              <option value="WARN">WARN</option>
              <option value="OK">OK</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search node, rack, room..."
            className="min-w-[180px] rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-1 text-xs text-gray-200"
          />
        </div>
      </div>

      <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
        <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Nodes</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="text-[10px] text-gray-500 uppercase">
              <tr>
                <th className="py-2">Node</th>
                <th className="py-2">Status</th>
                <th className="py-2">Severity</th>
                <th className="py-2">Partitions</th>
                <th className="py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map((node) => (
                <tr key={node.node} className="border-t border-[var(--color-border)]/30">
                  <td className="py-2 font-medium text-gray-200">{node.node}</td>
                  <td className="py-2 text-gray-200 capitalize">{node.status || 'unknown'}</td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                        severityStyles[node.severity] || severityStyles.UNKNOWN
                      }`}
                    >
                      {node.severity}
                    </span>
                  </td>
                  <td className="py-2 text-[10px] text-gray-400">
                    {node.partitions?.length ? node.partitions.join(', ') : '--'}
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
              {filteredNodes.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={5}>
                    No nodes match this filter.
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
