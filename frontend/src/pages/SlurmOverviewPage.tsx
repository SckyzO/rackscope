import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import type { RoomSummary, SlurmPartitionSummary, SlurmSummary } from '../types';
import { api } from '../services/api';
import { useSlurmConfig } from '../hooks/useSlurmConfig';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const severityOrder = ['OK', 'WARN', 'CRIT', 'UNKNOWN'];

export const SlurmOverviewPage = () => {
  const { severityColors } = useSlurmConfig();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [summary, setSummary] = useState<SlurmSummary | null>(null);
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
    const roomId = roomFilter || undefined;
    Promise.all([api.getSlurmSummary(roomId), api.getSlurmPartitions(roomId)])
      .then(([summaryData, partitionsData]) => {
        if (!active) return;
        setSummary(summaryData as SlurmSummary);
        setPartitions(partitionsData as SlurmPartitionSummary);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [roomFilter]);

  const severityChart = useMemo(() => {
    const data = summary?.by_severity || {};
    return {
      labels: severityOrder,
      datasets: [
        {
          data: severityOrder.map((key) => data[key] || 0),
          backgroundColor: [
            severityColors.ok,
            severityColors.warn,
            severityColors.crit,
            '#6b7280', // UNKNOWN (gray)
          ],
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
        },
      ],
    };
  }, [summary, severityColors]);

  const statusChart = useMemo(() => {
    const data = summary?.by_status || {};
    const labels = Object.keys(data);
    return {
      labels,
      datasets: [
        {
          label: 'Nodes',
          data: labels.map((key) => data[key] || 0),
          backgroundColor: severityColors.info,
        },
      ],
    };
  }, [summary, severityColors]);

  const topPartitions = useMemo(() => {
    if (!partitions?.partitions) return [];
    return Object.entries(partitions.partitions)
      .map(([partition, states]) => ({
        partition,
        total: Object.values(states).reduce((acc, val) => acc + val, 0),
        states,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [partitions]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-[var(--color-accent)] uppercase">
            Slurm
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text-base)]">Cluster Overview</h1>
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
          <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Total nodes</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--color-text-base)]">
            {summary?.total_nodes ?? 0}
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Critical</div>
          <div className="text-status-crit mt-2 text-3xl font-semibold">
            {summary?.by_severity?.CRIT ?? 0}
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">Warning</div>
          <div className="text-status-warn mt-2 text-3xl font-semibold">
            {summary?.by_severity?.WARN ?? 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="mb-4 text-xs tracking-[0.2em] text-gray-500 uppercase">
            Severity distribution
          </div>
          <div className="h-56">
            <Doughnut
              data={severityChart}
              options={{ plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="mb-4 text-xs tracking-[0.2em] text-gray-500 uppercase">Status counts</div>
          <div className="h-56">
            <Bar
              data={statusChart}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
        <div className="mb-4 text-xs tracking-[0.2em] text-gray-500 uppercase">Top partitions</div>
        <div className="grid gap-3 md:grid-cols-3">
          {topPartitions.map((entry) => (
            <div
              key={entry.partition}
              className="rounded-lg border border-[var(--color-border)] bg-black/20 p-3 text-xs text-gray-300"
            >
              <div className="flex items-center justify-between text-sm text-gray-200">
                <span>{entry.partition}</span>
                <span className="text-gray-400">{entry.total}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400">
                {Object.entries(entry.states).map(([state, count]) => (
                  <span key={state}>
                    {state}:{count}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {topPartitions.length === 0 && (
            <div className="text-xs text-gray-500">No partition data.</div>
          )}
        </div>
      </div>
    </div>
  );
};
