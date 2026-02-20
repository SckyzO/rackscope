import { TrendingUp, Users, Eye, MousePointerClick, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const StatCard = ({ title, value, change, positive, icon, iconBg, iconColor }: StatCardProps) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-4 flex items-start justify-between">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <span
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
          positive ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500' : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-500'
        }`}
      >
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {change}
      </span>
    </div>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

const TopPagesRow = ({ page, views, bar }: { page: string; views: string; bar: number }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0 dark:border-gray-800">
    <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{page}</span>
    <div className="flex items-center gap-3 shrink-0">
      <div className="w-24 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${bar}%` }} />
      </div>
      <span className="w-14 text-right text-sm font-medium text-gray-700 dark:text-gray-200">{views}</span>
    </div>
  </div>
);

export const CosmosAnalytics = () => (
  <div className="space-y-6">
    {/* Stat cards */}
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Unique Visitors"
        value="24,563"
        change="+12.5%"
        positive
        icon={<Users className="h-6 w-6" />}
        iconBg="bg-brand-50 dark:bg-brand-500/10"
        iconColor="text-brand-500"
      />
      <StatCard
        title="Total Pageviews"
        value="89,234"
        change="+8.2%"
        positive
        icon={<Eye className="h-6 w-6" />}
        iconBg="bg-success-50 dark:bg-success-500/10"
        iconColor="text-success-500"
      />
      <StatCard
        title="Bounce Rate"
        value="42.3%"
        change="-3.1%"
        positive
        icon={<MousePointerClick className="h-6 w-6" />}
        iconBg="bg-warning-50 dark:bg-warning-500/10"
        iconColor="text-warning-500"
      />
      <StatCard
        title="Visit Duration"
        value="3m 24s"
        change="+18.7%"
        positive
        icon={<TrendingUp className="h-6 w-6" />}
        iconBg="bg-error-50 dark:bg-error-500/10"
        iconColor="text-error-500"
      />
    </div>

    {/* Main chart area */}
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Traffic Overview</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visitors and pageviews — last 30 days</p>
        </div>
        <div className="flex gap-2">
          {['12 months', '30 days', '7 days'].map((label, i) => (
            <button
              key={label}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                i === 1
                  ? 'bg-brand-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex h-64 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Chart — coming soon</p>
        </div>
      </div>
    </div>

    {/* Bottom grid */}
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Top pages */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top Pages</h3>
          <button className="text-xs font-medium text-brand-500 hover:text-brand-600">View all</button>
        </div>
        <div>
          <TopPagesRow page="/dashboard" views="12,345" bar={100} />
          <TopPagesRow page="/cosmos" views="8,234" bar={67} />
          <TopPagesRow page="/rooms/room-a" views="6,789" bar={55} />
          <TopPagesRow page="/racks/r01-01" views="4,567" bar={37} />
          <TopPagesRow page="/settings" views="2,123" bar={17} />
        </div>
      </div>

      {/* Traffic sources */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Traffic Sources</h3>
          <button className="text-xs font-medium text-brand-500 hover:text-brand-600">View all</button>
        </div>
        <div className="space-y-4">
          {[
            { source: 'Direct', pct: '45%', w: 45, color: 'bg-brand-500' },
            { source: 'Social Media', pct: '30%', w: 30, color: 'bg-success-500' },
            { source: 'Search Engines', pct: '18%', w: 18, color: 'bg-warning-500' },
            { source: 'Referrals', pct: '7%', w: 7, color: 'bg-error-500' },
          ].map((item) => (
            <div key={item.source}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{item.source}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{item.pct}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.w}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
