import { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { RoomSummary, SlurmPartitionSummary, SlurmSummary } from '../types';
import { api } from '../services/api';
import { useSlurmConfig } from '../hooks/useSlurmConfig';

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

  const severityApexOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'donut', background: 'transparent', toolbar: { show: false } },
      theme: { mode: 'dark' },
      colors: [severityColors.ok, severityColors.warn, severityColors.crit, '#6b7280'],
      labels: severityOrder,
      dataLabels: { enabled: false },
      legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
      tooltip: { theme: 'dark' },
      plotOptions: { pie: { donut: { size: '60%' } } },
    }),
    [severityColors]
  );

  const severityApexSeries = useMemo(() => {
    const data = summary?.by_severity || {};
    return severityOrder.map((key) => data[key] || 0);
  }, [summary]);

  const statusApexOptions: ApexOptions = useMemo(() => {
    const data = summary?.by_status || {};
    return {
      chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
      theme: { mode: 'dark' },
      colors: [severityColors.info],
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 3 } },
      dataLabels: { enabled: false },
      xaxis: { categories: Object.keys(data), labels: { style: { colors: '#9ca3af' } } },
      yaxis: { labels: { style: { colors: '#9ca3af' } } },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      legend: { show: false },
      tooltip: { theme: 'dark' },
    };
  }, [summary, severityColors]);

  const statusApexSeries = useMemo(() => {
    const data = summary?.by_status || {};
    return [{ name: 'Nodes', data: Object.values(data).map(Number) }];
  }, [summary]);

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
            <ReactApexChart
              options={severityApexOptions}
              series={severityApexSeries}
              type="donut"
              height={224}
            />
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-xl border p-6">
          <div className="mb-4 text-xs tracking-[0.2em] text-gray-500 uppercase">Status counts</div>
          <div className="h-56">
            <ReactApexChart
              options={statusApexOptions}
              series={statusApexSeries}
              type="bar"
              height={224}
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
