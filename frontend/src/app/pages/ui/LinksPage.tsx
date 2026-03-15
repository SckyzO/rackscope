import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const linkColors = [
  { label: 'Primary', cls: 'text-brand-500 hover:text-brand-600' },
  {
    label: 'Secondary',
    cls: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
  },
  { label: 'Success', cls: 'text-success-500 hover:text-success-600' },
  { label: 'Danger', cls: 'text-error-500 hover:text-error-600' },
  { label: 'Warning', cls: 'text-warning-500 hover:text-warning-600' },
];

export const LinksPage = () => {
  usePageTitle('Links');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Links"
        description="Link components with various styles and states"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Links' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Colored Links" desc="Links in different semantic colors">
          <div className="flex flex-wrap gap-4">
            {linkColors.map((l) => (
              <a
                key={l.label}
                href="#"
                className={`text-sm font-medium transition-colors ${l.cls}`}
              >
                {l.label}
              </a>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Links with Underline" desc="Always underlined links">
          <div className="flex flex-wrap gap-4">
            {linkColors.map((l) => (
              <a
                key={l.label}
                href="#"
                className={`text-sm font-medium underline transition-colors ${l.cls}`}
              >
                {l.label}
              </a>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Opacity Variants" desc="Links with different opacity levels">
          <div className="space-y-2">
            {[10, 25, 50, 75, 100].map((op) => (
              <div key={op} className="flex items-center gap-3">
                <span className="w-8 text-xs text-gray-400">{op}%</span>
                <a
                  href="#"
                  className={`text-brand-500 text-sm font-medium opacity-${op === 100 ? '100' : op}`}
                >
                  Link text example
                </a>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Hover Opacity" desc="Links that fade on hover">
          <div className="flex flex-wrap gap-4">
            <a
              href="#"
              className="text-brand-500 text-sm font-medium transition-opacity hover:opacity-75"
            >
              Fade on hover
            </a>
            <a
              href="#"
              className="text-success-500 text-sm font-medium transition-opacity hover:opacity-75"
            >
              Fade on hover
            </a>
            <a
              href="#"
              className="text-error-500 text-sm font-medium transition-opacity hover:opacity-75"
            >
              Fade on hover
            </a>
          </div>
        </SectionCard>
        <SectionCard title="Link Sizes" desc="Different text sizes for links">
          <div className="flex flex-col gap-2">
            <a href="#" className="text-brand-500 hover:text-brand-600 text-xs font-medium">
              Extra small link
            </a>
            <a href="#" className="text-brand-500 hover:text-brand-600 text-sm font-medium">
              Small link
            </a>
            <a href="#" className="text-brand-500 hover:text-brand-600 text-base font-medium">
              Base link
            </a>
            <a href="#" className="text-brand-500 hover:text-brand-600 text-lg font-medium">
              Large link
            </a>
          </div>
        </SectionCard>
        <SectionCard title="Link States" desc="Active, visited and disabled states">
          <div className="flex flex-wrap gap-4">
            <a href="#" className="text-brand-500 hover:text-brand-600 text-sm font-medium">
              Normal
            </a>
            <a href="#" className="text-brand-700 dark:text-brand-300 text-sm font-medium">
              Visited
            </a>
            <span className="cursor-not-allowed text-sm font-medium text-gray-300 dark:text-gray-600">
              Disabled
            </span>
            <a
              href="#"
              className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 rounded px-2 py-0.5 text-sm font-medium"
            >
              Highlighted
            </a>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
