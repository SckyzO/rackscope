import { Thermometer, Zap, Cpu, Clock } from 'lucide-react';

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

const SparklineCard = ({
  icon: Icon,
  label,
  value,
  unit,
  color,
  points,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit: string;
  color: string;
  points: number[];
}) => {
  const max = Math.max(...points);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <div className="text-2xl font-bold" style={{ color }}>
            {value}
          </div>
          {unit && <div className="text-xs text-gray-400">{unit}</div>}
        </div>
        <div className="flex h-10 flex-1 items-end gap-0.5">
          {points.map((p, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all"
              style={{ height: `${(p / max) * 100}%`, backgroundColor: color, opacity: 0.7 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const TemperatureGauge = ({ temp = 42 }: { temp?: number }) => {
  const color = temp >= 75 ? '#ef4444' : temp >= 60 ? '#f59e0b' : '#10b981';
  const arc = (temp / 100) * 270;
  const r = 65;
  const circ = 2 * Math.PI * r;
  const dash = (arc / 360) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40">
        <svg className="h-full w-full -rotate-[135deg]">
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={circ}
            strokeLinecap="round"
            className="text-gray-200 dark:text-gray-800"
          />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold" style={{ color }}>
            {temp}°C
          </div>
          <div className="text-xs text-gray-400">Temperature</div>
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs">
        {[
          { l: '< 60°C', c: '#10b981' },
          { l: '60-75°C', c: '#f59e0b' },
          { l: '> 75°C', c: '#ef4444' },
        ].map((t) => (
          <div key={t.l} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.c }} />
            <span className="text-gray-500 dark:text-gray-400">{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const historyData = [
  20, 25, 22, 28, 32, 35, 38, 40, 42, 45, 43, 42, 40, 38, 42, 45, 48, 50, 52, 48, 45, 42, 40, 42,
];
const pdus = [
  { name: 'PDU-A', cur: 3.2, max: 7.2, pct: 44, color: '#10b981' },
  { name: 'PDU-B', cur: 5.8, max: 7.2, pct: 80, color: '#f59e0b' },
  { name: 'PDU-C', cur: 6.9, max: 7.2, pct: 96, color: '#ef4444' },
];

export const MetricsPage = () => {
  const hmax = Math.max(...historyData);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Metrics</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Infrastructure metric visualization components
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SparklineCard
          icon={Thermometer}
          label="Temperature"
          value="42"
          unit="°C"
          color="#10b981"
          points={[38, 40, 42, 41, 43, 42, 40, 42]}
        />
        <SparklineCard
          icon={Zap}
          label="Power"
          value="380"
          unit="W"
          color="#f59e0b"
          points={[320, 340, 360, 380, 370, 385, 375, 380]}
        />
        <SparklineCard
          icon={Cpu}
          label="CPU Load"
          value="78"
          unit="%"
          color="#ef4444"
          points={[65, 70, 75, 78, 76, 78, 77, 78]}
        />
        <SparklineCard
          icon={Clock}
          label="Uptime"
          value="14d 6h"
          unit=""
          color="#10b981"
          points={[14, 14, 14, 14, 14, 14, 14, 14]}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Temperature Gauge" desc="Circular gauge with OK/WARN/CRIT thresholds">
          <TemperatureGauge temp={42} />
        </SectionCard>
        <SectionCard title="PDU Power Consumption" desc="Per-PDU utilization bars with thresholds">
          <div className="space-y-4">
            {pdus.map((p) => (
              <div key={p.name}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {p.cur}kW / {p.max}kW <span className="font-semibold">({p.pct}%)</span>
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div
                    className="flex h-full items-center justify-end rounded-lg pr-2"
                    style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                  >
                    <span className="text-xs font-bold text-white">{p.pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard
        title="Metric History"
        desc="Temperature trend over 24h with WARN/CRIT threshold lines"
      >
        <div className="relative h-32">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line
              x1="0"
              y1={100 - (60 / hmax) * 100}
              x2="100"
              y2={100 - (60 / hmax) * 100}
              stroke="#f59e0b"
              strokeWidth="0.5"
              strokeDasharray="3"
            />
            <line
              x1="0"
              y1={100 - (75 / hmax) * 100}
              x2="100"
              y2={100 - (75 / hmax) * 100}
              stroke="#ef4444"
              strokeWidth="0.5"
              strokeDasharray="3"
            />
            <polygon
              fill="#3b82f6"
              fillOpacity="0.1"
              points={`0,100 ${historyData.map((v, i) => `${(i / (historyData.length - 1)) * 100},${100 - (v / hmax) * 100}`).join(' ')} 100,100`}
            />
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              points={historyData
                .map((v, i) => `${(i / (historyData.length - 1)) * 100},${100 - (v / hmax) * 100}`)
                .join(' ')}
            />
          </svg>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>24h ago</span>
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <span className="h-px w-4" style={{ backgroundColor: '#f59e0b', display: 'block' }} />
              <span>WARN 60°C</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-px w-4" style={{ backgroundColor: '#ef4444', display: 'block' }} />
              <span>CRIT 75°C</span>
            </div>
          </div>
          <span>Now</span>
        </div>
      </SectionCard>
    </div>
  );
};
