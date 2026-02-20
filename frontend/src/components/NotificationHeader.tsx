import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, X, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';

type AlertItem = {
  node_id: string;
  state: string;
  checks: { id: string; severity: string }[];
  site_id: string;
  site_name: string;
  room_id: string;
  room_name: string;
  rack_id: string;
  rack_name: string;
  device_id: string;
  device_name: string;
};

export const NotificationHeader = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AlertItem[]>([]);
  const [maxVisible, setMaxVisible] = useState(10);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        const nextValue = Number(config?.features?.notifications_max_visible ?? 10);
        if (active && Number.isFinite(nextValue)) {
          setMaxVisible(Math.max(1, nextValue));
        }
      } catch {
        // keep default
      }
    };
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const data = await api.getActiveAlerts();
        if (!mounted) return;
        setItems(Array.isArray(data?.alerts) ? data.alerts : []);
      } catch {
        // Keep silent for now; notifications are best-effort.
      }
    };

    poll();
    const interval = setInterval(poll, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const { critCount, warnCount, sortedItems } = useMemo(() => {
    const crit = items.filter((it) => it.state === 'CRIT').length;
    const warn = items.filter((it) => it.state === 'WARN').length;
    const sorted = [...items].sort((a, b) => {
      if (a.state === 'CRIT' && b.state !== 'CRIT') return -1;
      if (a.state !== 'CRIT' && b.state === 'CRIT') return 1;
      return 0;
    });
    return { critCount: crit, warnCount: warn, sortedItems: sorted };
  }, [items]);

  const count = items.length;
  const hasCritical = critCount > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`group relative flex h-9 items-center gap-2 overflow-hidden rounded-xl border px-3 transition-all ${
          hasCritical
            ? 'border-status-crit/40 bg-status-crit/10 hover:bg-status-crit/20'
            : count > 0
              ? 'border-status-warn/40 bg-status-warn/10 hover:bg-status-warn/20'
              : 'border-[var(--color-border)] bg-black/30 hover:bg-black/40'
        }`}
        title="Active device alerts"
      >
        {hasCritical && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-red-500/10 to-transparent"></div>
        )}
        <Bell
          className={`relative h-4 w-4 ${
            hasCritical
              ? 'text-status-crit'
              : count > 0
                ? 'text-status-warn'
                : 'text-gray-500 group-hover:text-[var(--color-accent)]'
          }`}
        />
        {count > 0 && (
          <div className="relative flex items-center gap-1 font-mono text-[10px] tabular-nums">
            {critCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-status-crit font-black">{critCount}</span>
                <span className="text-gray-600">CRIT</span>
              </span>
            )}
            {critCount > 0 && warnCount > 0 && <span className="text-gray-700">/</span>}
            {warnCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-status-warn font-black">{warnCount}</span>
                <span className="text-gray-600">WARN</span>
              </span>
            )}
          </div>
        )}
        {count === 0 && (
          <span className="relative font-mono text-[10px] tracking-widest text-gray-500 uppercase">
            No alerts
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>

          {/* Panel */}
          <div className="animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]/98 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/40 px-5 py-4">
              <div>
                <div className="font-mono text-[10px] tracking-[0.35em] text-gray-500 uppercase">
                  Monitoring
                </div>
                <h3 className="font-mono text-[13px] font-black tracking-tight text-gray-200 uppercase">
                  Active Alerts
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {count > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1 font-mono text-[10px] tabular-nums">
                    {critCount > 0 && (
                      <span className="text-status-crit font-black">{critCount}</span>
                    )}
                    {critCount > 0 && warnCount > 0 && <span className="text-gray-700">/</span>}
                    {warnCount > 0 && (
                      <span className="text-status-warn font-black">{warnCount}</span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] bg-black/30 text-gray-500 transition-colors hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className="custom-scrollbar overflow-auto"
              style={{ maxHeight: `${maxVisible * 72}px` }}
            >
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10">
                    <Bell className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="font-mono text-[11px] tracking-widest text-gray-500 uppercase">
                    All systems operational
                  </div>
                </div>
              )}
              {sortedItems.map((it) => (
                <Link
                  key={`${it.node_id}`}
                  to={`/rack/${it.rack_id}`}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3 border-b border-[var(--color-border)]/20 px-5 py-4 transition-all hover:bg-white/5"
                >
                  {/* Status Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      it.state === 'CRIT'
                        ? 'border-status-crit/30 bg-status-crit/10'
                        : 'border-status-warn/30 bg-status-warn/10'
                    }`}
                  >
                    <AlertTriangle
                      className={`h-5 w-5 ${it.state === 'CRIT' ? 'text-status-crit' : 'text-status-warn'}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="truncate text-[13px] font-bold text-gray-200 transition-colors group-hover:text-[var(--color-accent-primary)]">
                        {it.device_name}
                      </div>
                      <ArrowUpRight className="h-3 w-3 shrink-0 text-gray-600 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-accent-primary)] group-hover:opacity-100" />
                    </div>
                    <div className="mb-2 truncate font-mono text-[10px] tracking-[0.15em] text-gray-500 uppercase">
                      {it.site_name} / {it.room_name} / {it.rack_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-black tracking-widest uppercase ${
                          it.state === 'CRIT'
                            ? 'border-status-crit/40 bg-status-crit/10 text-status-crit'
                            : 'border-status-warn/40 bg-status-warn/10 text-status-warn'
                        }`}
                      >
                        {it.state}
                      </div>
                      <div className="truncate font-mono text-[10px] text-gray-600">
                        {it.node_id}
                      </div>
                    </div>
                  </div>

                  {/* Check Badge */}
                  <div className="shrink-0 rounded-lg border border-white/5 bg-black/30 px-2 py-1 font-mono text-[9px] tracking-[0.15em] text-gray-500 uppercase">
                    {it.checks.length} {it.checks.length === 1 ? 'check' : 'checks'}
                  </div>
                </Link>
              ))}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-[var(--color-border)]/40 px-5 py-3">
                <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase">
                  <span>Refreshes every 60s</span>
                  <span>{items.length} total</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
