import { useEffect, useState } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
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

  const count = items.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-panel)]/80 px-3 py-1.5 shadow-lg transition-colors hover:bg-[var(--color-bg-panel)]"
        title="Recent WARN/CRIT transitions"
      >
        <Bell className="h-4 w-4 text-[var(--color-accent-primary)]" />
        <span className="font-mono text-[10px] tracking-widest text-gray-400 uppercase">
          Alerts
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${count > 0 ? 'bg-status-warn/20 text-status-warn' : 'bg-white/5 text-gray-500'}`}
        >
          {count}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-[var(--color-border)]/20 px-4 py-3 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
            Active Device Alerts
          </div>
          <div
            className="custom-scrollbar overflow-auto"
            style={{ maxHeight: `${maxVisible * 56}px` }}
          >
            {items.length === 0 && (
              <div className="p-4 font-mono text-[11px] text-gray-500">No active alerts.</div>
            )}
            {items.map((it) => (
              <div
                key={`${it.node_id}`}
                className="flex items-center gap-3 border-b border-[var(--color-border)]/10 px-4 py-3"
              >
                <AlertTriangle
                  className={`h-4 w-4 ${it.state === 'CRIT' ? 'text-status-crit' : 'text-status-warn'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold text-[var(--color-text-base)]">
                    {it.device_name}
                  </div>
                  <div className="font-mono text-[9px] tracking-widest text-gray-500 uppercase">
                    {it.site_name} / {it.room_name} / {it.rack_name}
                  </div>
                  <div className="font-mono text-[9px] tracking-widest text-gray-500 uppercase">
                    {it.node_id} · {it.state}
                  </div>
                </div>
                <div className="font-mono text-[9px] text-gray-500">
                  {it.checks[0]?.id || 'ALERT'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
