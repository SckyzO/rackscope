import { useEffect, useMemo, useState } from 'react';
import type { RoomSummary, SlurmPartitionSummary } from '../types';
import { api } from '../services/api';

export const SlurmPartitionsPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [partitions, setPartitions] = useState<SlurmPartitionSummary | null>(null);

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
      .getSlurmPartitions(roomFilter || undefined)
      .then((data) => {
        if (active) setPartitions(data as SlurmPartitionSummary);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [roomFilter]);

  const rows = useMemo(() => {
    if (!partitions?.partitions) return [];
    return Object.entries(partitions.partitions).map(([partition, states]) => ({
      partition,
      states,
      total: Object.values(states).reduce((acc, val) => acc + val, 0),
    }));
  }, [partitions]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-[var(--color-accent)] uppercase">
            Slurm
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text-base)]">
            Partition Overview
          </h1>
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

      <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
        <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Partitions</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="text-[10px] text-gray-500 uppercase">
              <tr>
                <th className="py-2">Partition</th>
                <th className="py-2">Total</th>
                <th className="py-2">States</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.partition} className="border-t border-[var(--color-border)]/30">
                  <td className="py-2 font-medium text-gray-200">{row.partition}</td>
                  <td className="py-2">{row.total}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(row.states).map(([state, count]) => (
                        <span key={state} className="rounded bg-black/30 px-2 py-1 text-[10px]">
                          {state}:{count}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={3}>
                    No partition data available.
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
