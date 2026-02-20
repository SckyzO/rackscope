import { ChevronRight, Building2, Cpu, Network, HardDrive, Zap, Thermometer, Box, Server } from 'lucide-react';

const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

const deviceTypes = [
  { type: 'Server', icon: Cpu, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-500/10' },
  { type: 'Switch', icon: Network, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10' },
  { type: 'Storage', icon: HardDrive, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
  { type: 'PDU', icon: Zap, color: 'text-error-500', bg: 'bg-error-50 dark:bg-error-500/10' },
  { type: 'Cooling', icon: Thermometer, color: 'text-brand-400', bg: 'bg-brand-50 dark:bg-brand-400/10' },
  { type: 'Generic', icon: Box, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
];

const racks = [
  { id: 'r01-01', health: 'OK', u: '32/42', temp: '42°C', power: '3.2kW', color: '#10b981' },
  { id: 'r01-02', health: 'WARN', u: '38/42', temp: '68°C', power: '5.1kW', color: '#f59e0b' },
  { id: 'r01-03', health: 'CRIT', u: '40/42', temp: '82°C', power: '6.8kW', color: '#ef4444' },
  { id: 'r01-04', health: 'OK', u: '28/42', temp: '38°C', power: '2.8kW', color: '#10b981' },
  { id: 'r01-05', health: 'UNKNOWN', u: '30/42', temp: '—', power: '—', color: '#6b7280' },
  { id: 'r01-06', health: 'OK', u: '35/42', temp: '45°C', power: '3.9kW', color: '#10b981' },
  { id: 'r01-07', health: 'WARN', u: '37/42', temp: '72°C', power: '5.5kW', color: '#f59e0b' },
  { id: 'r01-08', health: 'OK', u: '33/42', temp: '41°C', power: '3.5kW', color: '#10b981' },
];

export const InfrastructureNavPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Infrastructure Navigation</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Hierarchy navigation and topology components</p>
    </div>
    <div className="grid gap-6">
      <SectionCard title="Infrastructure Breadcrumb" desc="Clickable path: Site → Room → Aisle → Rack → Device">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {[
            { icon: Building2, label: 'DC Paris' },
            { icon: Server, label: 'Room A' },
            { icon: Box, label: 'Aisle 01' },
            { icon: Box, label: 'Rack r01-01' },
          ].map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />}
              <a href="#" className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10 whitespace-nowrap">
                <Icon className="h-4 w-4" />{label}
              </a>
            </div>
          ))}
          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
          <span className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
            <Cpu className="h-4 w-4 text-brand-500" />r01-01-c01
          </span>
        </nav>
      </SectionCard>
      <SectionCard title="Device Type Icons" desc="Icon system for physical infrastructure types">
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          {deviceTypes.map(({ type, icon: Icon, color, bg }) => (
            <div key={type} className={`flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800 ${bg}`}>
              <Icon className={`h-8 w-8 ${color}`} />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{type}</span>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Rack Mini Cards" desc="Compact rack overview for room/aisle views">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {racks.map((rack) => (
            <div key={rack.id} className="group relative cursor-pointer rounded-xl border-2 bg-white p-3 transition-all hover:shadow-lg dark:bg-gray-900" style={{ borderColor: rack.color }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{rack.id}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: rack.color }}>{rack.health}</span>
              </div>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {[['U', rack.u], ['Temp', rack.temp], ['Power', rack.power]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{k}:</span><span className="font-mono font-semibold">{v}</span></div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-xs font-semibold text-white">View Details →</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Topology Tree" desc="Visual hierarchy display">
        <div className="space-y-1.5 font-mono text-sm">
          {[
            { indent: 0, icon: Building2, label: 'DC Paris', extra: '' },
            { indent: 1, icon: Server, label: 'Room A', extra: '' },
            { indent: 2, icon: Box, label: 'Aisle 01', extra: '(7 racks)' },
            { indent: 3, icon: Box, label: 'Rack r01-01', extra: '(10 devices)' },
            { indent: 4, icon: Cpu, label: 'r01-01-c01', extra: 'OK' },
          ].map(({ indent, icon: Icon, label, extra }, i) => (
            <div key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300" style={{ paddingLeft: `${indent * 16}px` }}>
              {indent > 0 && <span className="text-gray-300 dark:text-gray-600">└──</span>}
              <Icon className="h-4 w-4 text-brand-500 shrink-0" />
              <span className="font-semibold">{label}</span>
              {extra && extra !== 'OK' && <span className="text-xs text-gray-400 dark:text-gray-500">{extra}</span>}
              {extra === 'OK' && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: '#10b981' }}>OK</span>}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  </div>
);
