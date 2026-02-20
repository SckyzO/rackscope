import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

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

const healthStates = [
  {
    state: 'OK',
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-500/30',
    color: '#10b981',
  },
  {
    state: 'WARN',
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
    color: '#f59e0b',
  },
  {
    state: 'CRIT',
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
    color: '#ef4444',
  },
  {
    state: 'UNKNOWN',
    icon: HelpCircle,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    color: '#6b7280',
  },
];

const nodeStates = [
  'OK',
  'OK',
  'OK',
  'WARN',
  'OK',
  'OK',
  'OK',
  'CRIT',
  'OK',
  'OK',
  'OK',
  'WARN',
  'OK',
  'OK',
  'OK',
  'OK',
  'UNKNOWN',
  'OK',
  'OK',
  'OK',
  'OK',
  'OK',
  'OK',
  'OK',
  'WARN',
  'OK',
  'OK',
  'OK',
  'OK',
  'OK',
  'CRIT',
  'OK',
  'OK',
  'WARN',
  'OK',
  'OK',
  'OK',
  'OK',
  'OK',
  'OK',
];

export const HealthStatusPage = () => {
  const summary = { OK: 30, WARN: 5, CRIT: 2, UNKNOWN: 3 };
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Health Status</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Physical infrastructure health state indicators
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Health Badges" desc="State indicators with icon and label">
          <div className="flex flex-wrap gap-3">
            {healthStates.map(({ state, icon: Icon, bg, text, border }) => (
              <span
                key={state}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${bg} ${text} ${border}`}
              >
                <Icon className="h-4 w-4" />
                {state}
              </span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Status Indicator Lights" desc="Animated pulsing status dots">
          <div className="flex flex-wrap gap-6">
            {healthStates.map(({ state, color }) => (
              <div key={state} className="flex items-center gap-3">
                <div className="relative">
                  <span
                    className="block h-3 w-3 animate-pulse rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {state !== 'UNKNOWN' && (
                    <span
                      className="absolute inset-0 h-3 w-3 animate-ping rounded-full opacity-75"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {state}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title="Health Summary Bar"
          desc="Stacked horizontal bar showing count per state"
        >
          <div className="space-y-3">
            <div className="flex h-8 overflow-hidden rounded-lg">
              {Object.entries(summary).map(([state, count]) => {
                const pct = (count / total) * 100;
                const s = healthStates.find((h) => h.state === state);
                return (
                  <div
                    key={state}
                    title={`${state}: ${count}`}
                    className="flex items-center justify-center transition-all hover:opacity-90"
                    style={{ width: `${pct}%`, backgroundColor: s?.color }}
                  >
                    {count > 1 && <span className="text-xs font-bold text-white">{count}</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4">
              {Object.entries(summary).map(([state, count]) => {
                const s = healthStates.find((h) => h.state === state);
                return (
                  <div key={state} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded" style={{ backgroundColor: s?.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {state}: <span className="font-semibold">{count}</span>
                    </span>
                  </div>
                );
              })}
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Total: {total}
              </span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Health Dots — Sizes" desc="Compact dot indicators in 3 sizes">
          <div className="space-y-4">
            {['Small', 'Medium', 'Large'].map((size, si) => (
              <div key={size}>
                <p className="mb-2 text-xs font-medium text-gray-400">{size}</p>
                <div className="flex gap-4">
                  {healthStates.map(({ state, color }) => (
                    <div key={state} className="flex items-center gap-1.5">
                      <span
                        className="rounded-full"
                        style={{
                          backgroundColor: color,
                          width: `${(si + 1) * 8}px`,
                          height: `${(si + 1) * 8}px`,
                        }}
                      />
                      <span
                        className={`text-gray-700 dark:text-gray-300`}
                        style={{ fontSize: `${10 + si * 2}px` }}
                      >
                        {state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Node Status Grid" desc="Dense grid — hover to see node details">
        <div className="grid grid-cols-10 gap-1.5">
          {nodeStates.map((state, idx) => {
            const s = healthStates.find((h) => h.state === state);
            return (
              <div
                key={idx}
                className="group relative aspect-square cursor-pointer rounded transition-all hover:scale-110 hover:shadow-lg"
                style={{ backgroundColor: s?.color }}
                title={`compute${String(idx + 1).padStart(3, '0')}: ${state}`}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-[8px] font-bold text-white">{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">40 compute nodes — click to navigate</p>
      </SectionCard>
    </div>
  );
};
