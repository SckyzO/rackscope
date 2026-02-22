import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  ChevronRight,
  Server,
  Cpu,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ActiveAlert, SlurmNodeEntry } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  CRIT: '#ef4444',
  WARN: '#f59e0b',
};
const SEV_BG: Record<string, string> = {
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

type FilterType = 'all' | 'crit' | 'warn' | 'infra' | 'slurm';

// ── AlertRow — one infrastructure alert ───────────────────────────────────────

type AlertRowProps = {
  alert: ActiveAlert;
  onClick: () => void;
};

const AlertRow = ({ alert, onClick }: AlertRowProps) => (
  <button
    onClick={onClick}
    className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
    style={{ borderLeftWidth: 3, borderLeftColor: SEV_COLOR[alert.state] ?? '#6b7280' }}
  >
    {/* Severity icon */}
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${SEV_COLOR[alert.state] ?? '#6b7280'}18` }}
    >
      {alert.state === 'CRIT' ? (
        <XCircle className="h-4 w-4" style={{ color: SEV_COLOR.CRIT }} />
      ) : (
        <AlertTriangle className="h-4 w-4" style={{ color: SEV_COLOR.WARN }} />
      )}
    </div>

    {/* Content */}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {alert.node_id}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_BG[alert.state] ?? ''}`}
        >
          {alert.state}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {alert.device_name} · {alert.rack_name} · {alert.room_name}
      </p>
      {alert.checks.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {alert.checks.slice(0, 3).map((c, i) => (
            <span
              key={i}
              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {c.id}
            </span>
          ))}
          {alert.checks.length > 3 && (
            <span className="text-[10px] text-gray-400">+{alert.checks.length - 3} more</span>
          )}
        </div>
      )}
    </div>

    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
  </button>
);

// ── SlurmRow — one Slurm alert ────────────────────────────────────────────────

type SlurmRowProps = {
  node: SlurmNodeEntry;
  onClick: () => void;
};

const SlurmRow = ({ node, onClick }: SlurmRowProps) => (
  <button
    onClick={onClick}
    className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
    style={{ borderLeftWidth: 3, borderLeftColor: SEV_COLOR[node.severity] ?? '#6b7280' }}
  >
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${SEV_COLOR[node.severity] ?? '#6b7280'}18` }}
    >
      <Cpu className="h-4 w-4" style={{ color: SEV_COLOR[node.severity] ?? '#6b7280' }} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate font-mono text-sm font-semibold text-gray-900 dark:text-white">
          {node.node}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_BG[node.severity] ?? ''}`}
        >
          {node.severity}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500 capitalize dark:text-gray-400">
        {node.status} · {node.partitions.join(', ') || 'no partition'}
        {node.rack_name ? ` · ${node.rack_name}` : ''}
      </p>
    </div>
    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
  </button>
);

// ── Main page ─────────────────────────────────────────────────────────────────

export const NotificationsFullPage = () => {
  const navigate = useNavigate();
  const [infraAlerts, setInfraAlerts] = useState<ActiveAlert[]>([]);
  const [slurmAlerts, setSlurmAlerts] = useState<SlurmNodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [infraData, slurmData] = await Promise.all([
        api.getActiveAlerts(),
        api.getSlurmNodes(),
      ]);
      setInfraAlerts(infraData?.alerts ?? []);
      const slurmNodes = slurmData?.nodes ?? [];
      setSlurmAlerts(
        slurmNodes.filter((n: SlurmNodeEntry) => n.severity === 'CRIT' || n.severity === 'WARN')
      );
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, []);

  // Filtered data
  const filteredInfra = useMemo(() => {
    if (filter === 'slurm') return [];
    if (filter === 'crit') return infraAlerts.filter((a) => a.state === 'CRIT');
    if (filter === 'warn') return infraAlerts.filter((a) => a.state === 'WARN');
    return infraAlerts;
  }, [infraAlerts, filter]);

  const filteredSlurm = useMemo(() => {
    if (filter === 'infra') return [];
    if (filter === 'crit') return slurmAlerts.filter((n) => n.severity === 'CRIT');
    if (filter === 'warn') return slurmAlerts.filter((n) => n.severity === 'WARN');
    return slurmAlerts;
  }, [slurmAlerts, filter]);

  const totalCrit =
    infraAlerts.filter((a) => a.state === 'CRIT').length +
    slurmAlerts.filter((n) => n.severity === 'CRIT').length;
  const totalWarn =
    infraAlerts.filter((a) => a.state === 'WARN').length +
    slurmAlerts.filter((n) => n.severity === 'WARN').length;
  const total = infraAlerts.length + slurmAlerts.length;

  const affectedRacks = new Set([...infraAlerts.map((a) => a.rack_id)]).size;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Active alerts across your infrastructure
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total alerts', value: total, icon: Bell, color: 'text-gray-500' },
          { label: 'CRIT', value: totalCrit, icon: XCircle, color: 'text-red-500' },
          { label: 'WARN', value: totalWarn, icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'Affected racks', value: affectedRacks, icon: Server, color: 'text-brand-500' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        <Filter className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-400" />
        {(
          [
            { id: 'all', label: 'All', count: total },
            { id: 'crit', label: 'CRIT', count: totalCrit },
            { id: 'warn', label: 'WARN', count: totalWarn },
            { id: 'infra', label: 'Infrastructure', count: infraAlerts.length },
            { id: 'slurm', label: 'Slurm', count: slurmAlerts.length },
          ] as { id: FilterType; label: string; count: number }[]
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-brand-500 text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filter === f.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                }`}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert lists */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
        </div>
      ) : filteredInfra.length === 0 && filteredSlurm.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-gray-900">
          <Bell className="h-12 w-12 text-gray-200 dark:text-gray-800" />
          <p className="text-base font-semibold text-gray-500 dark:text-gray-400">No alerts</p>
          <p className="text-sm text-gray-400 dark:text-gray-600">
            {filter === 'all' ? 'All nodes are healthy' : `No ${filter.toUpperCase()} alerts`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Infrastructure alerts */}
          {filteredInfra.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Server className="text-brand-500 h-4 w-4" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Infrastructure
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                    {filteredInfra.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredInfra.map((alert, i) => (
                  <AlertRow
                    key={i}
                    alert={alert}
                    onClick={() => navigate(`/cosmos/views/rack/${alert.rack_id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Slurm alerts */}
          {filteredSlurm.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Slurm</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                    {filteredSlurm.length}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/cosmos/slurm/alerts')}
                  className="text-brand-500 text-xs hover:underline"
                >
                  View Slurm dashboard →
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredSlurm.map((node, i) => (
                  <SlurmRow
                    key={i}
                    node={node}
                    onClick={() =>
                      node.rack_id
                        ? navigate(`/cosmos/views/rack/${node.rack_id}`)
                        : navigate('/cosmos/slurm/alerts')
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
