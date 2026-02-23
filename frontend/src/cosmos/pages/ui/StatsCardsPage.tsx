import { DollarSign, Users, ShoppingCart, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

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

const stats = [
  {
    icon: DollarSign,
    iconColor: 'bg-success-500',
    value: '$45,231',
    label: 'Total Revenue',
    trend: '+12%',
    positive: true,
    progress: 68,
    goal: '$66,000',
  },
  {
    icon: Users,
    iconColor: 'bg-brand-500',
    value: '2,453',
    label: 'Active Users',
    trend: '+8%',
    positive: true,
    progress: 82,
    goal: '3,000',
  },
  {
    icon: ShoppingCart,
    iconColor: 'bg-warning-500',
    value: '892',
    label: 'Orders',
    trend: '-3%',
    positive: false,
    progress: 45,
    goal: '2,000',
  },
  {
    icon: Activity,
    iconColor: 'bg-error-500',
    value: '54.2%',
    label: 'Bounce Rate',
    trend: '+2%',
    positive: false,
    progress: 54,
    goal: '100%',
  },
];

const colorfulBg = ['bg-success-500', 'bg-brand-500', 'bg-warning-500', 'bg-error-500'];

const SparklineSVG = ({ positive }: { positive: boolean }) => {
  const pts = positive ? [30, 35, 33, 38, 36, 40, 42, 45] : [45, 42, 44, 40, 38, 36, 34, 30];
  const max = Math.max(...pts),
    min = Math.min(...pts);
  const norm = pts.map((p) => 100 - ((p - min) / (max - min || 1)) * 100);
  const color = positive ? '#12b76a' : '#f04438';
  return (
    <svg viewBox="0 0 70 40" className="h-10 w-16" preserveAspectRatio="none">
      <polygon
        fill={color}
        fillOpacity="0.15"
        points={`0,40 ${norm.map((y, i) => `${(i / (norm.length - 1)) * 70},${y * 0.4}`).join(' ')} 70,40`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={norm.map((y, i) => `${(i / (norm.length - 1)) * 70},${y * 0.4}`).join(' ')}
      />
    </svg>
  );
};

export const StatsCardsPage = () => {
  usePageTitle('Stats Cards');
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stats Cards</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          KPI and metric display card components
        </p>
      </div>

      <SectionCard title="Basic Stat Card" desc="Icon, value, label, trend badge">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="shadow-theme-sm rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.iconColor}`}
                >
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.positive ? 'bg-success-50 text-success-600 dark:bg-success-500/10' : 'bg-error-50 text-error-600 dark:bg-error-500/10'}`}
                >
                  {s.positive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {s.trend}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="With Sparkline" desc="Includes a mini trend SVG chart">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="shadow-theme-sm rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconColor}`}
                >
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <SparklineSVG positive={s.positive} />
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <div className="mt-1 flex items-end justify-between">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <span
                  className={`text-xs font-medium ${s.positive ? 'text-success-500' : 'text-error-500'}`}
                >
                  {s.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Horizontal Card" desc="Icon on left, stats on right">
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="shadow-theme-sm flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconColor}`}
              >
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
              <span
                className={`flex shrink-0 items-center gap-0.5 text-sm font-medium ${s.positive ? 'text-success-500' : 'text-error-500'}`}
              >
                {s.positive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {s.trend}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="With Progress" desc="Shows progress bar toward goal">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="shadow-theme-sm rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${s.iconColor}`}
              >
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="bg-brand-500 h-full rounded-full"
                  style={{ width: `${s.progress}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
                <span>{s.progress}% of goal</span>
                <span>{s.goal}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Colorful Cards" desc="Solid color backgrounds with white text">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`rounded-xl p-5 text-white ${colorfulBg[i]}`}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-sm opacity-80">{s.label}</p>
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
              <span className="mt-2 block text-xs opacity-75">{s.trend} vs last period</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
