const SectionCard = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

const Sk = ({
  h = 'h-4',
  w = 'w-full',
  round = 'rounded',
}: {
  h?: string;
  w?: string;
  round?: string;
}) => <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${h} ${w} ${round}`} />;

export const SkeletonPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Skeleton Loader</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Animated loading placeholder components
      </p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Text Skeleton" desc="Placeholder for text content">
        <div className="space-y-3">
          <Sk h="h-5" w="w-3/4" />
          <Sk h="h-4" />
          <Sk h="h-4" w="w-5/6" />
          <Sk h="h-4" w="w-4/6" />
          <Sk h="h-4" w="w-2/3" />
        </div>
      </SectionCard>
      <SectionCard title="Card Skeleton" desc="Full card with image and text placeholders">
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
      <SectionCard title="Profile Skeleton" desc="User profile loading state">
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
      <SectionCard title="Table Skeleton" desc="Data table row placeholders">
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Sk key={i} h="h-3" w="w-3/4" />
              ))}
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, row) => (
            <div
              key={row}
              className="border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
            >
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, col) => (
                  <Sk key={col} h="h-3" w={col === 0 ? 'w-full' : col === 3 ? 'w-1/2' : 'w-5/6'} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Dashboard Skeleton" desc="Grid of stat card placeholders">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
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
      <SectionCard title="Notification Skeleton" desc="Notification feed loading state">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Sk h="h-10" w="w-10" round="rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Sk h="h-4" w="w-2/5" />
                  <Sk h="h-3" w="w-16" />
                </div>
                <Sk h="h-3" />
                <Sk h="h-3" w="w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  </div>
);
