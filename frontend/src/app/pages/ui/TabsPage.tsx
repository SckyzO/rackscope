import { useState } from 'react';
import { BarChart2, Bell, Users, Globe } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const Content = () => (
  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
    Lorem ipsum dolor sit amet consectetur. Non vitae facilisis urna tortor placerat egestas donec
    fermentum magna condimentum.
  </p>
);

const tabs = ['Overview', 'Notifications', 'Analytics', 'Customers'];
const icons = [BarChart2, Bell, Users, Globe];
const badges = [null, 8, null, 4];

export const TabsPage = () => {
  usePageTitle('Tabs');
  const [t1, st1] = useState(0);
  const [t2, st2] = useState(0);
  const [t3, st3] = useState(0);
  const [t4, st4] = useState(0);
  const [t5, st5] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tabs"
        description="Tab navigation for switching between views"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Tabs' },
            ]}
          />
        }
      />
      <div className="grid gap-6">
        <SectionCard title="Pill Tabs" desc="Rounded pill style with filled active state">
          <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => st1(i)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${i === t1 ? 'shadow-theme-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <Content />
        </SectionCard>
        <SectionCard title="Underline Tabs" desc="Minimal underline indicator">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-1">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => st2(i)}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${i === t2 ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <Content />
        </SectionCard>
        <SectionCard title="Underline with Icons" desc="Tabs with icons and underline indicator">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-1">
              {tabs.map((tab, i) => {
                const Icon = icons[i];
                return (
                  <button
                    key={tab}
                    onClick={() => st3(i)}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${i === t3 ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
          <Content />
        </SectionCard>
        <SectionCard title="Tabs with Badge" desc="Tabs with notification counts">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-1">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => st4(i)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${i === t4 ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {tab}
                  {badges[i] && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${i === t4 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                    >
                      {badges[i]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <Content />
        </SectionCard>
        <SectionCard title="Vertical Tabs" desc="Side-by-side vertical navigation">
          <div className="flex gap-0">
            <div className="flex w-40 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => st5(i)}
                  className={`border-r-2 px-4 py-3 text-left text-sm font-medium transition-colors ${i === t5 ? 'border-brand-500 bg-brand-50 text-brand-500 dark:bg-brand-500/10 -mr-0.5' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 pl-6">
              <h4 className="font-semibold text-gray-900 dark:text-white">{tabs[t5]}</h4>
              <Content />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
