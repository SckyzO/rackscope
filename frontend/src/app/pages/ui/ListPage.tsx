import { CheckCircle, Mail, Send, FileText, Trash2, AlertCircle } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const items = [
  'Lorem ipsum dolor sit amet',
  'Consectetur adipiscing elit',
  'Sed do eiusmod tempor',
  'Ut labore et dolore magna',
  'Aliqua enim ad minim',
];

export const ListPage = () => {
  usePageTitle('List');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lists"
        description="Various list styles and components"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui' },
              { label: 'List' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Unordered List" desc="Basic bulleted list">
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="bg-brand-500 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Ordered List" desc="Numbered sequential list">
          <ol className="space-y-2">
            {items.map((item, i) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </SectionCard>
        <SectionCard title="List with Buttons" desc="Navigation-style list items">
          <nav className="space-y-1">
            {[
              { label: 'Inbox', icon: Mail, count: 12 },
              { label: 'Sent', icon: Send, count: 0 },
              { label: 'Drafts', icon: FileText, count: 3 },
              { label: 'Trash', icon: Trash2, count: 0 },
              { label: 'Spam', icon: AlertCircle, count: 2 },
            ].map(({ label, icon: Icon, count }) => (
              <button
                key={label}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="flex-1 text-left">{label}</span>
                {count > 0 && (
                  <span className="bg-brand-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </SectionCard>
        <SectionCard title="List with Icons" desc="Items with leading icons">
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
              >
                <CheckCircle className="text-success-500 h-4 w-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Horizontal List" desc="Items displayed inline">
          <ul className="flex flex-wrap divide-x divide-gray-200 dark:divide-gray-700">
            {['Home', 'About', 'Services', 'Portfolio', 'Contact'].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="hover:text-brand-500 dark:hover:text-brand-400 px-4 py-1 text-sm font-medium text-gray-600 transition-colors dark:text-gray-400"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="List with Checkboxes" desc="Selectable checklist items">
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={item} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked={i < 2}
                  id={`cb-${i}`}
                  className="text-brand-500 accent-brand-500 h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor={`cb-${i}`} className="text-sm text-gray-600 dark:text-gray-400">
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="List with Radio" desc="Single-select radio list">
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={item} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="list-radio"
                  defaultChecked={i === 0}
                  id={`rb-${i}`}
                  className="text-brand-500 accent-brand-500 h-4 w-4 border-gray-300"
                />
                <label htmlFor={`rb-${i}`} className="text-sm text-gray-600 dark:text-gray-400">
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Divider List" desc="Items separated by dividers">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => (
              <li
                key={item}
                className="py-3 text-sm text-gray-600 first:pt-0 last:pb-0 dark:text-gray-400"
              >
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
};
