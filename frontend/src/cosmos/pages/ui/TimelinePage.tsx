const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5"><h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}</div>
    {children}
  </div>
);

const events = [
  { color: '#465fff', title: 'Project created', desc: 'Rackscope infrastructure monitoring project initialized.', time: '2 hours ago', user: 'Alex J.', initials: 'AJ', uColor: 'bg-brand-500' },
  { color: '#12b76a', title: 'Team member joined', desc: 'Sarah Williams joined the team as infrastructure engineer.', time: '4 hours ago', user: 'Sarah W.', initials: 'SW', uColor: 'bg-success-500' },
  { color: '#f59e0b', title: 'Configuration updated', desc: 'New storage array E-Series added to topology config.', time: '1 day ago', user: 'Michael C.', initials: 'MC', uColor: 'bg-warning-500' },
  { color: '#ef4444', title: 'Alert triggered', desc: 'CRIT alert on node r01-01-c01 — node_up check failed.', time: '2 days ago', user: 'System', initials: 'SY', uColor: 'bg-error-500' },
  { color: '#6b7280', title: 'Task completed', desc: 'Phase 7 frontend rebuild milestone completed.', time: '3 days ago', user: 'Emily D.', initials: 'ED', uColor: 'bg-gray-500' },
];

export const TimelinePage = () => (
  <div className="space-y-6">
    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Timeline</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Activity feeds and chronological event display</p></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Basic Timeline" desc="Events with colored dots and timestamps">
        <div className="relative space-y-0">
          <div className="absolute left-3.5 top-2 h-[calc(100%-16px)] w-0.5 bg-gray-200 dark:bg-gray-800" />
          {events.map((ev, i) => (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white dark:border-gray-900 dark:bg-gray-900">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ev.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{ev.title}</p>
                  <span className="shrink-0 text-xs text-gray-400">{ev.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Timeline with Avatars" desc="Events with user avatar and name">
        <div className="relative space-y-0">
          <div className="absolute left-4 top-2 h-[calc(100%-16px)] w-0.5 bg-gray-200 dark:bg-gray-800" />
          {events.map((ev, i) => (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ev.uColor}`}>
                {ev.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{ev.user}</p>
                  <span className="shrink-0 text-xs text-gray-400">{ev.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Compact Timeline" desc="Minimal horizontal dot timeline">
        <div className="relative">
          <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-gray-200 dark:bg-gray-800" />
          <div className="relative flex justify-between">
            {events.map((ev, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="relative z-10 h-7 w-7 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center" style={{ backgroundColor: ev.color }}>
                  <span className="text-[9px] font-bold text-white">{i + 1}</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center max-w-[60px] leading-tight">{ev.time.split(' ').slice(0, 2).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Card Timeline" desc="Events as bordered cards">
        <div className="space-y-3">
          {events.slice(0, 3).map((ev, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800" style={{ borderLeftWidth: 3, borderLeftColor: ev.color }}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ev.uColor}`}>{ev.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{ev.title}</span>
                  <span className="text-xs text-gray-400">{ev.time}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  </div>
);
