import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

export const SpinnersPage = () => {
  usePageTitle('Spinners');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Spinners"
        description="Loading indicators and animated state components"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Spinners' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Border Spinner" desc="Circular border-based spinner in multiple sizes">
          <div className="flex flex-wrap items-center gap-6">
            {[
              ['h-4 w-4 border-2', 'XS'],
              ['h-6 w-6 border-2', 'SM'],
              ['h-8 w-8 border-[3px]', 'MD'],
              ['h-10 w-10 border-4', 'LG'],
              ['h-12 w-12 border-4', 'XL'],
            ].map(([cls, label]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className={`border-t-brand-500 dark:border-t-brand-500 animate-spin rounded-full border-gray-200 dark:border-gray-700 ${cls}`}
                />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Spinner Colors" desc="Status and brand color variants">
          <div className="flex flex-wrap items-center gap-6">
            {[
              { top: '#465fff', label: 'Brand' },
              { top: '#12b76a', label: 'Success' },
              { top: '#f79009', label: 'Warning' },
              { top: '#f04438', label: 'Error' },
            ].map(({ top, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-[3px]"
                  style={{ borderColor: 'rgba(75,85,99,0.3)', borderTopColor: top }}
                />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Dot Spinner" desc="Three bouncing dots">
          <div className="flex flex-col gap-4">
            {['bg-brand-500', 'bg-success-500', 'bg-warning-500'].map((color) => (
              <div key={color} className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-2.5 w-2.5 animate-bounce rounded-full ${color}`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Pulse Spinner" desc="Growing pulse animation">
          <div className="flex flex-wrap items-center gap-6">
            {['bg-brand-500', 'bg-success-500', 'bg-warning-500', 'bg-error-500'].map((color) => (
              <div key={color} className="relative h-8 w-8">
                <div
                  className={`absolute h-full w-full animate-ping rounded-full opacity-75 ${color}`}
                />
                <div className={`relative h-full w-full rounded-full ${color}`} />
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Spinner in Button" desc="Loading state integrated in buttons">
          <div className="flex flex-wrap gap-3">
            <button className="bg-brand-500 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Loading...
            </button>
            <button className="bg-success-500 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <div className="border-t-brand-500 h-4 w-4 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
              Please wait...
            </button>
          </div>
        </SectionCard>
        <SectionCard title="Full-screen Overlay" desc="Loading overlay for content areas">
          <div className="relative h-40 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
              <div className="text-center">
                <div className="border-t-brand-500 mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700" />
                <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Loading...
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
