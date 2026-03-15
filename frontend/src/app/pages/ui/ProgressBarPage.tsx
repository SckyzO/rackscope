import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const Bar = ({
  pct,
  color = 'bg-brand-500',
  height = 'h-2',
}: {
  pct: number;
  color?: string;
  height?: string;
}) => (
  <div className={`w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${height}`}>
    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
  </div>
);

export const ProgressBarPage = () => {
  usePageTitle('Progress Bar');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress Bars"
        description="Progress indicators for tasks and loading states"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Progress Bar' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Sizes" desc="Extra small to extra large">
          <div className="space-y-4">
            {[
              ['xs', 'h-1'],
              ['sm', 'h-1.5'],
              ['md', 'h-2.5'],
              ['lg', 'h-4'],
              ['xl', 'h-6'],
            ].map(([size, h]) => (
              <div key={size} className="flex items-center gap-3">
                <span className="w-6 text-xs text-gray-400 uppercase">{size}</span>
                <div className="flex-1">
                  <Bar pct={65} height={h} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Colors" desc="Status and brand colors">
          <div className="space-y-3">
            {[
              { label: 'Brand', color: 'bg-brand-500', pct: 75 },
              { label: 'Success', color: 'bg-success-500', pct: 60 },
              { label: 'Warning', color: 'bg-warning-500', pct: 45 },
              { label: 'Error', color: 'bg-error-500', pct: 30 },
              { label: 'Gray', color: 'bg-gray-400', pct: 85 },
            ].map((b) => (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{b.label}</span>
                  <span>{b.pct}%</span>
                </div>
                <Bar pct={b.pct} color={b.color} />
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="With Outside Label" desc="Percentage shown outside the bar">
          <div className="space-y-4">
            {[40, 70, 30].map((pct) => (
              <div key={pct}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Task {pct}%</span>
                  <span className="text-gray-500">{pct}%</span>
                </div>
                <Bar pct={pct} />
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="With Inside Label" desc="Percentage text inside the bar">
          <div className="space-y-3">
            {[45, 72, 88].map((pct) => (
              <div
                key={pct}
                className="h-6 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <div
                  className="bg-brand-500 flex h-full items-center justify-end rounded-full pr-2 text-xs font-bold text-white"
                  style={{ width: `${pct}%` }}
                >
                  {pct}%
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Striped" desc="Diagonal stripe pattern">
          <div className="space-y-3">
            <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="bg-brand-500 h-full rounded-full"
                style={{
                  width: '65%',
                  backgroundImage:
                    'repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.2) 10px,rgba(255,255,255,.2) 20px)',
                }}
              />
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="bg-success-500 h-full rounded-full"
                style={{
                  width: '80%',
                  backgroundImage:
                    'repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.2) 10px,rgba(255,255,255,.2) 20px)',
                }}
              />
            </div>
          </div>
        </SectionCard>
        <SectionCard title="System Resources" desc="Multi-metric progress display">
          <div className="space-y-3">
            {[
              { label: 'CPU', pct: 65, color: 'bg-brand-500' },
              { label: 'Memory', pct: 82, color: 'bg-success-500' },
              { label: 'Disk', pct: 57, color: 'bg-warning-500' },
              { label: 'Network', pct: 23, color: 'bg-error-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-14 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {item.label}
                </span>
                <div className="flex-1">
                  <Bar pct={item.pct} color={item.color} height="h-1.5" />
                </div>
                <span className="w-10 text-right text-xs text-gray-500">{item.pct}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
