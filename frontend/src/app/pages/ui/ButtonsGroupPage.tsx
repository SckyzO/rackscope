import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const PrimaryBtn = ({ children }: { children: React.ReactNode }) => (
  <button className="border-brand-400 bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 border-r px-4 py-2 text-sm font-medium text-white transition-colors last:border-r-0">
    {children}
  </button>
);

const SecondaryBtn = ({ children }: { children: React.ReactNode }) => (
  <button className="flex items-center gap-1.5 border-r border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors last:border-r-0 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5">
    {children}
  </button>
);

export const ButtonsGroupPage = () => {
  usePageTitle('Buttons Group');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Button Groups"
        description="Grouped buttons sharing a unified container"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Button Groups' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Primary Basic" desc="Three primary buttons in a group">
          <div className="border-brand-500 inline-flex overflow-hidden rounded-lg border">
            <PrimaryBtn>Button</PrimaryBtn>
            <PrimaryBtn>Button</PrimaryBtn>
            <PrimaryBtn>Button</PrimaryBtn>
          </div>
        </SectionCard>
        <SectionCard title="Secondary Basic" desc="Three secondary outline buttons">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <SecondaryBtn>Button</SecondaryBtn>
            <SecondaryBtn>Button</SecondaryBtn>
            <SecondaryBtn>Button</SecondaryBtn>
          </div>
        </SectionCard>
        <SectionCard title="Primary with Left Icon" desc="Primary group with leading icons">
          <div className="border-brand-500 inline-flex overflow-hidden rounded-lg border">
            <PrimaryBtn>
              <ChevronLeft className="h-4 w-4" />
              Back
            </PrimaryBtn>
            <PrimaryBtn>
              <ChevronLeft className="h-4 w-4" />
              Page
            </PrimaryBtn>
            <PrimaryBtn>
              <ChevronLeft className="h-4 w-4" />
              First
            </PrimaryBtn>
          </div>
        </SectionCard>
        <SectionCard title="Secondary with Left Icon" desc="Secondary group with leading icons">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <SecondaryBtn>
              <ChevronLeft className="h-4 w-4" />
              Back
            </SecondaryBtn>
            <SecondaryBtn>
              <ChevronLeft className="h-4 w-4" />
              Page
            </SecondaryBtn>
            <SecondaryBtn>
              <ChevronLeft className="h-4 w-4" />
              First
            </SecondaryBtn>
          </div>
        </SectionCard>
        <SectionCard title="Primary with Right Icon" desc="Primary group with trailing icons">
          <div className="border-brand-500 inline-flex overflow-hidden rounded-lg border">
            <PrimaryBtn>
              Next
              <ChevronRight className="h-4 w-4" />
            </PrimaryBtn>
            <PrimaryBtn>
              Page
              <ChevronRight className="h-4 w-4" />
            </PrimaryBtn>
            <PrimaryBtn>
              Last
              <ChevronRight className="h-4 w-4" />
            </PrimaryBtn>
          </div>
        </SectionCard>
        <SectionCard title="Secondary with Right Icon" desc="Secondary group with trailing icons">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <SecondaryBtn>
              Next
              <ChevronRight className="h-4 w-4" />
            </SecondaryBtn>
            <SecondaryBtn>
              Page
              <ChevronRight className="h-4 w-4" />
            </SecondaryBtn>
            <SecondaryBtn>
              Last
              <ChevronRight className="h-4 w-4" />
            </SecondaryBtn>
          </div>
        </SectionCard>
        <SectionCard title="Sizes" desc="Small, medium, and large groups">
          <div className="flex flex-col gap-3">
            {[
              { size: 'sm', cls: 'px-3 py-1.5 text-xs' },
              { size: 'md', cls: 'px-4 py-2 text-sm' },
              { size: 'lg', cls: 'px-5 py-2.5 text-base' },
            ].map(({ size, cls }) => (
              <div
                key={size}
                className="border-brand-500 inline-flex overflow-hidden rounded-lg border"
              >
                {['One', 'Two', 'Three'].map((label) => (
                  <button
                    key={label}
                    className={`border-brand-400 bg-brand-500 hover:bg-brand-600 border-r font-medium text-white transition-colors last:border-r-0 ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Mixed States" desc="Active, normal, and disabled states">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <button className="border-brand-400 bg-brand-500 border-r px-4 py-2 text-sm font-medium text-white">
              Active
            </button>
            <button className="border-r border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Normal
            </button>
            <button
              className="cursor-not-allowed bg-gray-50 px-4 py-2 text-sm font-medium text-gray-300 dark:bg-gray-700 dark:text-gray-500"
              disabled
            >
              Disabled
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
