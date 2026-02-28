import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';

export const BadgesPage = () => {
  usePageTitle('Badges');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Badges"
        description="Small count and labeling components"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Badges' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Light Badges" desc="Subtle background with colored text">
          <div className="flex flex-wrap gap-2">
            <span className={`${base} bg-brand-50 text-brand-500 dark:bg-brand-500/15`}>New</span>
            <span className={`${base} bg-success-50 text-success-500 dark:bg-success-500/15`}>
              Active
            </span>
            <span className={`${base} bg-warning-50 text-warning-500 dark:bg-warning-500/15`}>
              Pending
            </span>
            <span className={`${base} bg-error-50 text-error-500 dark:bg-error-500/15`}>Error</span>
            <span
              className={`${base} bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300`}
            >
              Default
            </span>
          </div>
        </SectionCard>
        <SectionCard title="Solid Badges" desc="Filled background">
          <div className="flex flex-wrap gap-2">
            <span className={`${base} bg-brand-500 text-white`}>New</span>
            <span className={`${base} bg-success-500 text-white`}>Active</span>
            <span className={`${base} bg-warning-500 text-white`}>Pending</span>
            <span className={`${base} bg-error-500 text-white`}>Error</span>
            <span className={`${base} bg-gray-600 text-white`}>Default</span>
          </div>
        </SectionCard>
        <SectionCard title="Light with Left Icon" desc="Badge with indicator dot before text">
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: 'Online',
                dot: 'bg-success-500',
                cls: 'bg-success-50 text-success-500 dark:bg-success-500/15',
              },
              {
                label: 'Busy',
                dot: 'bg-warning-500',
                cls: 'bg-warning-50 text-warning-500 dark:bg-warning-500/15',
              },
              {
                label: 'Offline',
                dot: 'bg-gray-400',
                cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
              },
              {
                label: 'Critical',
                dot: 'bg-error-500',
                cls: 'bg-error-50 text-error-500 dark:bg-error-500/15',
              },
            ].map((b) => (
              <span key={b.label} className={`${base} ${b.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                {b.label}
              </span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Solid with Left Icon" desc="Solid badge with indicator dot">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Online', dot: 'bg-white/50', cls: 'bg-success-500 text-white' },
              { label: 'Busy', dot: 'bg-white/50', cls: 'bg-warning-500 text-white' },
              { label: 'New', dot: 'bg-white/50', cls: 'bg-brand-500 text-white' },
              { label: 'Critical', dot: 'bg-white/50', cls: 'bg-error-500 text-white' },
            ].map((b) => (
              <span key={b.label} className={`${base} ${b.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                {b.label}
              </span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Rounded vs Pill" desc="Different border radius styles">
          <div className="flex flex-wrap gap-2">
            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium">
              Rounded
            </span>
            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium">
              Pill
            </span>
            <span className="bg-brand-500 inline-flex items-center rounded px-2.5 py-1 text-xs font-medium text-white">
              Square
            </span>
          </div>
        </SectionCard>
        <SectionCard title="Sizes" desc="Small, medium, and large badges">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium">
              XS
            </span>
            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium">
              SM
            </span>
            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium">
              MD
            </span>
            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center rounded-full px-4 py-2 text-base font-medium">
              LG
            </span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
