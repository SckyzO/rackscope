import { ChevronRight, Home } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

export const BreadcrumbPage = () => {
  usePageTitle('Breadcrumb');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Breadcrumb"
        description="Navigation hierarchy indicators"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Breadcrumb' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Default" desc="Simple text breadcrumb with slash separator">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1 text-sm">
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  Home
                </a>
              </li>
              <li className="text-gray-300 dark:text-gray-600">/</li>
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  UI Kits
                </a>
              </li>
              <li className="text-gray-300 dark:text-gray-600">/</li>
              <li className="font-medium text-gray-900 dark:text-white">Breadcrumb</li>
            </ol>
          </nav>
        </SectionCard>
        <SectionCard title="With Icons" desc="Breadcrumb with Home icon on first item">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:text-brand-500 flex items-center gap-1 text-gray-500 dark:text-gray-400"
                >
                  <Home className="h-4 w-4" /> Home
                </a>
              </li>
              <li>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  UI Kits
                </a>
              </li>
              <li>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li className="font-medium text-gray-900 dark:text-white">Breadcrumb</li>
            </ol>
          </nav>
        </SectionCard>
        <SectionCard title="Arrow Separator" desc="Breadcrumb with arrow separators">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  Home
                </a>
              </li>
              <li className="text-gray-400">→</li>
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  UI Kits
                </a>
              </li>
              <li className="text-gray-400">→</li>
              <li className="font-medium text-gray-900 dark:text-white">Breadcrumb</li>
            </ol>
          </nav>
        </SectionCard>
        <SectionCard title="Dotted Separator" desc="Breadcrumb with dot separators">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  Home
                </a>
              </li>
              <li className="h-1 w-1 rounded-full bg-gray-400" />
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  UI Kits
                </a>
              </li>
              <li className="h-1 w-1 rounded-full bg-gray-400" />
              <li className="font-medium text-gray-900 dark:text-white">Breadcrumb</li>
            </ol>
          </nav>
        </SectionCard>
        <SectionCard title="Pill Style" desc="Breadcrumb with pill background">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:bg-brand-50 hover:text-brand-500 rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  Home
                </a>
              </li>
              <li>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </li>
              <li>
                <a
                  href="#"
                  className="hover:bg-brand-50 hover:text-brand-500 rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  UI Kits
                </a>
              </li>
              <li>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </li>
              <li className="bg-brand-500 rounded-full px-3 py-1 font-medium text-white">
                Breadcrumb
              </li>
            </ol>
          </nav>
        </SectionCard>
        <SectionCard title="Deep Navigation" desc="Multi-level breadcrumb with truncation">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1 text-sm">
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  Home
                </a>
              </li>
              <li>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </li>
              <li className="text-gray-400">...</li>
              <li>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 text-gray-500 dark:text-gray-400">
                  UI Kits
                </a>
              </li>
              <li>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </li>
              <li className="font-medium text-gray-900 dark:text-white">Breadcrumb</li>
            </ol>
          </nav>
        </SectionCard>
      </div>
    </div>
  );
};
