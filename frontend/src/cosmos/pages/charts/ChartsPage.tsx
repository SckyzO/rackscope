import { TrendingUp, BarChart2 } from 'lucide-react';

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

// Simple SVG bar chart placeholder
const SimpleBarChart = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((val, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-sm ${color}`}
            style={{ height: `${(val / max) * 100}%` }}
          />
          <span className="text-[9px] text-gray-400">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i]}
          </span>
        </div>
      ))}
    </div>
  );
};

// Simple SVG area/line chart placeholder
const SimpleLineChart = ({ color }: { color: string }) => {
  const points = [30, 55, 40, 70, 50, 80, 65, 90];
  const w = 400,
    h = 100;
  const maxV = 100;
  const pts = points
    .map((v, i) => `${(i / (points.length - 1)) * w},${h - (v / maxV) * h}`)
    .join(' ');
  const fill = `${pts} ${w},${h} 0,${h}`;

  return (
    <div className="h-32 w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={color === 'brand' ? '#465fff' : '#12b76a'}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={color === 'brand' ? '#465fff' : '#12b76a'}
              stopOpacity="0.02"
            />
          </linearGradient>
        </defs>
        <polygon points={fill} fill={`url(#grad-${color})`} />
        <polyline
          points={pts}
          fill="none"
          stroke={color === 'brand' ? '#465fff' : '#12b76a'}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export const ChartsPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Charts</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Data visualization components</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Line Chart" desc="Trend visualization over time">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-brand-500 h-5 w-5" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">24,563</span>
          </div>
          <span className="bg-success-50 text-success-500 dark:bg-success-500/10 rounded-full px-2.5 py-1 text-xs font-medium">
            +12.5%
          </span>
        </div>
        <SimpleLineChart color="brand" />
        <div className="mt-3 flex gap-2">
          {['7d', '1m', '3m', '1y'].map((p, i) => (
            <button
              key={p}
              className={`rounded px-2.5 py-1 text-xs font-medium ${i === 1 ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Area Chart" desc="Filled area under the line">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-success-500 h-5 w-5" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">$89,234</span>
          </div>
          <span className="bg-success-50 text-success-500 dark:bg-success-500/10 rounded-full px-2.5 py-1 text-xs font-medium">
            +8.2%
          </span>
        </div>
        <SimpleLineChart color="success" />
      </SectionCard>
      <SectionCard title="Bar Chart" desc="Comparative data across categories">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="text-brand-500 h-5 w-5" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Sales</span>
          </div>
        </div>
        <SimpleBarChart data={[65, 80, 55, 95, 70, 85, 60, 90]} color="bg-brand-500" />
      </SectionCard>
      <SectionCard title="Multi-Color Bar Chart" desc="Categories with distinct colors">
        <div className="mb-4">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="bg-brand-500 h-2 w-2 rounded-full" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-success-500 h-2 w-2 rounded-full" />
              Profit
            </span>
          </div>
        </div>
        <div className="flex h-32 items-end gap-2">
          {[65, 80, 55, 95, 70, 85, 60, 90].map((val, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="flex w-full gap-0.5">
                <div
                  className="bg-brand-500 flex-1 rounded-t-sm"
                  style={{ height: `${val * 0.9}px` }}
                />
                <div
                  className="bg-success-500 flex-1 rounded-t-sm"
                  style={{ height: `${val * 0.5}px` }}
                />
              </div>
              <span className="text-[9px] text-gray-400">
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A'][i]}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Donut Chart" desc="Part-to-whole relationships">
        <div className="flex items-center justify-center gap-8">
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e4e7ec" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#465fff"
                strokeWidth="3"
                strokeDasharray="45 55"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#12b76a"
                strokeWidth="3"
                strokeDasharray="30 70"
                strokeDashoffset="-45"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#f79009"
                strokeWidth="3"
                strokeDasharray="18 82"
                strokeDashoffset="-75"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-900 dark:text-white">93%</span>
            </div>
          </div>
          <div className="space-y-2">
            {[
              ['Direct', '45%', 'bg-brand-500'],
              ['Organic', '30%', 'bg-success-500'],
              ['Paid', '18%', 'bg-warning-500'],
              ['Other', '7%', 'bg-gray-300'],
            ].map(([l, p, c]) => (
              <div key={l} className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${c}`} />
                <span className="text-gray-600 dark:text-gray-400">{l}</span>
                <span className="ml-auto font-medium text-gray-900 dark:text-white">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Progress Radials" desc="Circular progress indicators">
        <div className="flex flex-wrap justify-around gap-4">
          {[
            { val: 75, color: '#465fff', label: 'Progress' },
            { val: 60, color: '#12b76a', label: 'Success' },
            { val: 40, color: '#f79009', label: 'Warning' },
          ].map(({ val, color, label }) => {
            const circ = 2 * Math.PI * 15.9;
            const dash = (val / 100) * circ;
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="relative h-20 w-20">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e4e7ec" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeDasharray={`${dash} ${circ - dash}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{val}%</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  </div>
);
