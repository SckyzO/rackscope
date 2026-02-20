import { Activity } from 'lucide-react';

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

const slurmStates = [
  {
    state: 'idle',
    label: 'Idle',
    color: '#10b981',
    bg: 'bg-green-50 dark:bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-500/30',
  },
  {
    state: 'allocated',
    label: 'Allocated',
    color: '#3b82f6',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30',
  },
  {
    state: 'down',
    label: 'Down',
    color: '#ef4444',
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
  },
  {
    state: 'draining',
    label: 'Draining',
    color: '#f59e0b',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  {
    state: 'drained',
    label: 'Drained',
    color: '#f97316',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-500/30',
  },
  {
    state: 'mixed',
    label: 'Mixed',
    color: '#8b5cf6',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-500/30',
  },
  {
    state: 'unknown',
    label: 'Unknown',
    color: '#6b7280',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
];

const partitions = [
  { name: 'compute', total: 200, allocated: 146, idle: 42, down: 12, state: 'UP' },
  { name: 'visu', total: 24, allocated: 18, idle: 6, down: 0, state: 'UP' },
  { name: 'login', total: 8, allocated: 2, idle: 6, down: 0, state: 'UP' },
];

const nodeGrid = [
  'idle',
  'allocated',
  'allocated',
  'idle',
  'allocated',
  'allocated',
  'allocated',
  'idle',
  'allocated',
  'allocated',
  'down',
  'allocated',
  'allocated',
  'idle',
  'allocated',
  'allocated',
  'allocated',
  'idle',
  'allocated',
  'allocated',
  'allocated',
  'draining',
  'allocated',
  'allocated',
  'idle',
  'allocated',
  'allocated',
  'allocated',
  'idle',
  'allocated',
  'allocated',
  'down',
  'allocated',
  'allocated',
  'idle',
  'allocated',
  'allocated',
  'allocated',
  'idle',
  'allocated',
];

const jobs = [
  {
    status: 'Pending',
    count: 23,
    color: '#f59e0b',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  {
    status: 'Running',
    count: 146,
    color: '#10b981',
    bg: 'bg-green-50 dark:bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
  },
  {
    status: 'Completing',
    count: 3,
    color: '#3b82f6',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  {
    status: 'Failed',
    count: 2,
    color: '#ef4444',
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
  },
];

export const SlurmPage = () => {
  const pct = 73;
  const circ = 2 * Math.PI * 65;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Slurm Integration</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          HPC workload manager monitoring components
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Node State Badges" desc="Slurm node state indicators">
          <div className="flex flex-wrap gap-2">
            {slurmStates.map(({ state, label, bg, text, border }) => (
              <span
                key={state}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${bg} ${text} ${border}`}
              >
                {label}
              </span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Cluster Utilization" desc="Aggregate node allocation gauge">
          <div className="flex flex-col items-center">
            <div className="relative h-40 w-40">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="65"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-200 dark:text-gray-800"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="65"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{pct}%</div>
                <div className="text-xs text-gray-400">Allocated</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
              {[
                { v: 146, l: 'Allocated', c: 'text-blue-600 dark:text-blue-400' },
                { v: 200, l: 'Total', c: 'text-gray-900 dark:text-white' },
                { v: 42, l: 'Idle', c: 'text-green-600 dark:text-green-400' },
                { v: 12, l: 'Down', c: 'text-red-600 dark:text-red-400' },
              ].map(({ v, l, c }) => (
                <div key={l}>
                  <div className={`text-xl font-bold ${c}`}>{v}</div>
                  <div className="text-xs text-gray-400">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Partition Status" desc="Per-partition node breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr className="text-left text-xs font-medium text-gray-400">
                  {['Partition', 'Total', 'Allocated', 'Idle', 'Down', 'State'].map((h) => (
                    <th key={h} className="pr-4 pb-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {partitions.map((p) => (
                  <tr key={p.name} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2 pr-4 font-mono font-semibold text-gray-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="py-2 pr-4 font-mono">{p.total}</td>
                    <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400">
                      {p.allocated}
                    </td>
                    <td className="py-2 pr-4 font-mono text-green-600 dark:text-green-400">
                      {p.idle}
                    </td>
                    <td className="py-2 pr-4 font-mono text-red-600 dark:text-red-400">{p.down}</td>
                    <td className="py-2">
                      <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-500/10 dark:text-green-400">
                        {p.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <SectionCard title="Node State Grid" desc="Dense visualization colored by Slurm state">
          <div className="grid grid-cols-8 gap-1.5">
            {nodeGrid.map((state, idx) => {
              const s = slurmStates.find((st) => st.state === state);
              return (
                <div
                  key={idx}
                  className="group relative aspect-square cursor-pointer rounded transition-all hover:scale-110 hover:shadow-lg"
                  style={{ backgroundColor: s?.color }}
                  title={`node${String(idx + 1).padStart(3, '0')}: ${state}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-[9px] font-bold text-white">{idx + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {slurmStates.slice(0, 4).map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded" style={{ backgroundColor: color }} />
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Job Queue Counters" desc="Real-time job status statistics">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {jobs.map((j) => (
            <div
              key={j.status}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 ${j.bg}`}
              style={{ borderColor: j.color }}
            >
              <Activity className="h-6 w-6" style={{ color: j.color }} />
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: j.color }}>
                  {j.count}
                </div>
                <div className={`mt-0.5 text-xs font-medium ${j.text}`}>{j.status}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
