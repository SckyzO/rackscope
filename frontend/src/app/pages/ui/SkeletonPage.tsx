import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';
import { Sk, SkeletonText, SkeletonTable, SkeletonList } from '@app/components/ui/Skeleton';

export const SkeletonPage = () => {
  usePageTitle('Skeleton');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Skeleton Loader"
        description="Animated loading placeholder components"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Skeleton' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Text Skeleton" desc="SkeletonText — paragraph placeholder">
          <SkeletonText lines={5} />
        </SectionCard>

        <SectionCard title="Card Skeleton" desc="Sk primitive — composable blocks">
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <Sk h="h-40" round="rounded-none" />
            <div className="space-y-3 p-4">
              <Sk h="h-5" w="w-2/3" />
              <Sk h="h-4" />
              <Sk h="h-4" w="w-5/6" />
              <Sk h="h-4" w="w-1/2" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Profile Skeleton" desc="Sk primitive — avatar + text">
          <div className="flex items-start gap-4">
            <Sk h="h-14" w="w-14" round="rounded-full" />
            <div className="flex-1 space-y-2.5">
              <Sk h="h-5" w="w-1/2" />
              <Sk h="h-4" w="w-1/3" />
              <Sk h="h-4" />
              <Sk h="h-4" w="w-5/6" />
              <Sk h="h-4" w="w-3/4" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Table Skeleton" desc="SkeletonTable — data table rows">
          <SkeletonTable rows={4} cols={4} />
        </SectionCard>

        <SectionCard title="List Skeleton" desc="SkeletonList — icon + content + action rows">
          <div className="-mx-6 -mb-6">
            <SkeletonList rows={4} />
          </div>
        </SectionCard>

        <SectionCard title="Dashboard Skeleton" desc="Sk primitive — stat cards grid">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i} // eslint-disable-line react/no-array-index-key
                className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <Sk h="h-4" w="w-1/2" />
                  <Sk h="h-8" w="w-8" round="rounded-lg" />
                </div>
                <Sk h="h-7" w="w-1/3" />
                <Sk h="h-3" w="w-2/3" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
