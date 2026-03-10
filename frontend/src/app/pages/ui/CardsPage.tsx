import { Activity, Star, ArrowRight } from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const cardBase =
  'rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900';

export const CardsPage = () => {
  usePageTitle('Cards');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cards"
        description="Container components for grouped content"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Cards' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Card with Image (Vertical)" desc="Image at top with content below">
          <div className={cardBase + ' overflow-hidden'}>
            <div className="from-brand-400 to-brand-600 h-40 bg-gradient-to-br" />
            <div className="p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white">Card Title</h4>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.
              </p>
              <a
                href="#"
                className="text-brand-500 hover:text-brand-600 mt-3 inline-flex items-center gap-1 text-sm font-medium"
              >
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Card with Image (Horizontal)" desc="Side-by-side image and content">
          <div className={cardBase + ' flex overflow-hidden'}>
            <div className="from-success-400 to-success-600 w-28 shrink-0 bg-gradient-to-b" />
            <div className="p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white">Card Title</h4>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                Consectetur adipiscing elit. Sed do eiusmod tempor.
              </p>
              <a
                href="#"
                className="text-brand-500 hover:text-brand-600 mt-3 inline-flex items-center gap-1 text-sm font-medium"
              >
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Text Only Card" desc="Simple card with text content">
          <div className={cardBase + ' p-5'}>
            <h4 className="font-semibold text-gray-900 dark:text-white">Card Title</h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore.
            </p>
            <a
              href="#"
              className="text-brand-500 hover:text-brand-600 mt-3 inline-flex items-center gap-1 text-sm font-medium"
            >
              Read more <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </SectionCard>
        <SectionCard title="Card with Icon" desc="Icon header with title and description">
          <div className={cardBase + ' p-5'}>
            <div className="bg-brand-50 dark:bg-brand-500/15 flex h-12 w-12 items-center justify-center rounded-xl">
              <Activity className="text-brand-500 h-6 w-6" />
            </div>
            <h4 className="mt-4 font-semibold text-gray-900 dark:text-white">Card Title</h4>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <a
              href="#"
              className="text-brand-500 hover:text-brand-600 mt-3 inline-flex items-center gap-1 text-sm font-medium"
            >
              Learn more <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </SectionCard>
        <SectionCard
          title="Card with Header/Body/Footer"
          desc="Structured sections separated by borders"
        >
          <div className={cardBase + ' divide-y divide-gray-100 dark:divide-gray-800'}>
            <div className="flex items-center justify-between p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white">Card Header</h4>
              <button className="text-brand-500 text-xs font-medium">Action</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This is the card body. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4">
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-medium text-white">
                Confirm
              </button>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Stat Card" desc="KPI and metric display card">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                label: 'Total Users',
                value: '24,563',
                change: '+12%',
                color: 'text-success-500',
                bg: 'bg-success-50 dark:bg-success-500/10',
              },
              {
                label: 'Revenue',
                value: '$89.2K',
                change: '+8.5%',
                color: 'text-success-500',
                bg: 'bg-success-50 dark:bg-success-500/10',
              },
            ].map((s) => (
              <div key={s.label} className={`${cardBase} p-4`}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.color} ${s.bg}`}
                >
                  {s.change}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Profile Card" desc="User profile summary card">
          <div className={cardBase + ' p-5 text-center'}>
            <div className="bg-brand-500 mx-auto flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white">
              JD
            </div>
            <h4 className="mt-3 font-semibold text-gray-900 dark:text-white">John Doe</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Software Engineer</p>
            <div className="mt-3 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="fill-warning-400 text-warning-400 h-4 w-4" />
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="bg-brand-500 hover:bg-brand-600 flex-1 rounded-lg py-2 text-sm font-medium text-white">
                Follow
              </button>
              <button className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                Message
              </button>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Hover Effects" desc="Cards with hover interactions">
          <div className="grid gap-3 sm:grid-cols-2">
            {['Lift', 'Glow', 'Scale', 'Border'].map((effect) => (
              <div
                key={effect}
                className={`${cardBase} cursor-pointer p-4 transition-all ${
                  effect === 'Lift'
                    ? 'hover:shadow-theme-md hover:-translate-y-1'
                    : effect === 'Glow'
                      ? 'hover:shadow-[0_0_0_3px_rgba(70,95,255,0.15)]'
                      : effect === 'Scale'
                        ? 'hover:scale-[1.02]'
                        : 'hover:border-brand-500'
                }`}
              >
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{effect}</p>
                <p className="mt-1 text-xs text-gray-400">Hover to see effect</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
