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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-panel)]/80 border border-[var(--color-border)] shadow-lg hover:bg-[var(--color-bg-panel)] transition-colors"
        title="Recent WARN/CRIT transitions"
      >
        <Bell className="w-4 h-4 text-[var(--color-accent-primary)]" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Alerts</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${count > 0 ? 'bg-status-warn/20 text-status-warn' : 'bg-white/5 text-gray-500'}`}>
          {count}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]/20 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            Active Device Alerts
          </div>
          <div className="max-h-64 overflow-auto custom-scrollbar">
            {items.length === 0 && (
              <div className="p-4 text-[11px] text-gray-500 font-mono">No active alerts.</div>
            )}
            {items.map((it) => (
              <div key={`${it.node_id}`} className="px-4 py-3 border-b border-[var(--color-border)]/10 flex items-center gap-3">
                <AlertTriangle className={`w-4 h-4 ${it.state === 'CRIT' ? 'text-status-crit' : 'text-status-warn'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-[var(--color-text-base)] truncate">{it.device_name}</div>
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                    {it.site_name} / {it.room_name} / {it.rack_name}
                  </div>
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                    {it.node_id} · {it.state}
                  </div>
                </div>
                <div className="text-[9px] font-mono text-gray-500">
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
