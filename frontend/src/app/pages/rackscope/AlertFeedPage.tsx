import { AlertTriangle, XCircle, Clock, Server, CheckCircle } from 'lucide-react';

const SectionCard = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

const alerts = [
  {
    severity: 'CRIT',
    device: 'r01-01-c01',
    check: 'node_up',
    time: '2m ago',
    color: '#ef4444',
    icon: XCircle,
  },
  {
    severity: 'WARN',
    device: 'r01-02',
    check: 'ipmi_temp_warn',
    time: '5m ago',
    color: '#f59e0b',
    icon: AlertTriangle,
  },
  {
    severity: 'CRIT',
    device: 'r02-03-c12',
    check: 'node_up',
    time: '8m ago',
    color: '#ef4444',
    icon: XCircle,
  },
  {
    severity: 'WARN',
    device: 'pdu-a',
    check: 'pdu_power_high',
    time: '12m ago',
    color: '#f59e0b',
    icon: AlertTriangle,
  },
  {
    severity: 'CRIT',
    device: 'r01-05-c03',
    check: 'memory_ecc',
    time: '15m ago',
    color: '#ef4444',
    icon: XCircle,
  },
  {
    severity: 'WARN',
    device: 'r03-01',
    check: 'rack_temp_warn',
    time: '18m ago',
    color: '#f59e0b',
    icon: AlertTriangle,
  },
  {
    severity: 'WARN',
    device: 'switch-01',
    check: 'port_error_rate',
    time: '22m ago',
    color: '#f59e0b',
    icon: AlertTriangle,
  },
  {
    severity: 'CRIT',
    device: 'r02-01-c05',
    check: 'disk_failure',
    time: '25m ago',
    color: '#ef4444',
    icon: XCircle,
  },
];

const checks = [
  { id: 'node_up', status: 'CRIT', value: '0 (expected 1)', color: '#ef4444' },
  { id: 'ipmi_temp_warn', status: 'WARN', value: '78°C (threshold: 75°C)', color: '#f59e0b' },
  { id: 'memory_ecc', status: 'OK', value: '0 errors', color: '#10b981' },
  { id: 'disk_smart', status: 'OK', value: 'Healthy', color: '#10b981' },
  { id: 'pdu_power_high', status: 'WARN', value: '5.8kW (threshold: 5.5kW)', color: '#f59e0b' },
  { id: 'fan_speed', status: 'UNKNOWN', value: 'No data', color: '#6b7280' },
];

export const AlertFeedPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alert Feed</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Infrastructure alert monitoring and notification components
      </p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Live Alert Feed" desc="Real-time scrollable alert stream">
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {alerts.map((a, i) => {
            const Icon = a.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900/50"
                style={{ borderLeftWidth: 3, borderLeftColor: a.color }}
              >
                <Icon className="h-5 w-5 shrink-0" style={{ color: a.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: a.color }}
                    >
                      {a.severity}
                    </span>
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {a.device}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{a.check} failed</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{a.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard title="Alert Card" desc="Expanded alert with full context">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <XCircle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    CRIT
                  </span>
                  <span className="font-mono text-lg font-bold text-red-900 dark:text-red-200">
                    r01-01-c01
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <Server className="h-4 w-4" />
                  <span>Server · Rack r01-01 · Room A · Site DC1</span>
                </div>
              </div>
              <div className="rounded-lg bg-white/50 p-3 dark:bg-gray-900/50">
                <div className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  Check
                </div>
                <div className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  node_up
                </div>
                <div className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">Expected:</span> 1 <span className="mx-2">·</span>{' '}
                  <span className="font-semibold">Got:</span> 0
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                Since 5 minutes ago
              </div>
              <div className="flex gap-2 pt-1">
                <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Acknowledge
                </button>
                <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  View Rack
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Check Result Rows" desc="Compact check results display">
        <div className="space-y-2">
          {checks.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {c.id}
                </span>
                <span
                  className="rounded px-2 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.status}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{c.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Alert Count Badges" desc="Aggregate alert statistics">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Total',
              value: 12,
              border: '#6b7280',
              bg: 'bg-gray-100 dark:bg-gray-800',
              text: 'text-gray-700 dark:text-gray-200',
            },
            {
              label: 'CRIT',
              value: 3,
              border: '#ef4444',
              bg: 'bg-red-50 dark:bg-red-500/10',
              text: 'text-red-600 dark:text-red-400',
            },
            {
              label: 'WARN',
              value: 9,
              border: '#f59e0b',
              bg: 'bg-amber-50 dark:bg-amber-500/10',
              text: 'text-amber-600 dark:text-amber-400',
            },
            {
              label: 'By Rack',
              value: 4,
              border: '#465fff',
              bg: 'bg-brand-50 dark:bg-brand-500/10',
              text: 'text-brand-600 dark:text-brand-400',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border-2 p-4 ${s.bg}`}
              style={{ borderColor: s.border }}
            >
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className={`mt-1 text-xs font-medium ${s.text}`}>{s.label}</div>
            </div>
          ))}
          <div className="border-success-200 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10 col-span-2 flex items-center gap-3 rounded-xl border-2 p-4">
            <CheckCircle className="text-success-500 h-5 w-5" />
            <div>
              <div className="text-success-600 dark:text-success-400 text-xl font-bold">2</div>
              <div className="text-success-600 dark:text-success-400 text-xs font-medium">
                Acknowledged
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
);
