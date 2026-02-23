import { usePageTitle } from '../../contexts/PageTitleContext';
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

const initials = ['JD', 'AL', 'MK', 'SR', 'TC'];
const colors = ['bg-brand-500', 'bg-success-500', 'bg-warning-500', 'bg-error-500', 'bg-gray-500'];

export const AvatarsPage = () => {
  usePageTitle('Avatars');
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Avatars</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          User avatar components in various styles and sizes
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Sizes" desc="Avatar sizes from extra small to extra large">
          <div className="flex flex-wrap items-center gap-4">
            {[
              ['h-6 w-6 text-[9px]', 'XS'],
              ['h-8 w-8 text-[10px]', 'SM'],
              ['h-10 w-10 text-xs', 'MD'],
              ['h-12 w-12 text-sm', 'LG'],
              ['h-14 w-14 text-base', 'XL'],
              ['h-16 w-16 text-lg', '2XL'],
            ].map(([cls, label]) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className={`bg-brand-500 flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${cls}`}
                >
                  JD
                </div>
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Colors" desc="Avatars with different background colors">
          <div className="flex flex-wrap items-center gap-3">
            {initials.map((init, i) => (
              <div
                key={init}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white ${colors[i]}`}
              >
                {init}
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Shapes" desc="Circle and square avatar shapes">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-brand-500 flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white">
                JD
              </div>
              <span className="text-xs text-gray-400">Circle</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-brand-500 flex h-12 w-12 items-center justify-center rounded-lg text-sm font-semibold text-white">
                JD
              </div>
              <span className="text-xs text-gray-400">Rounded</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-brand-500 flex h-12 w-12 items-center justify-center rounded-md text-sm font-semibold text-white">
                JD
              </div>
              <span className="text-xs text-gray-400">Square</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="With Status Indicator" desc="Avatars with online/offline indicator">
          <div className="flex flex-wrap items-center gap-6">
            {[
              { color: 'bg-success-500', label: 'Online' },
              { color: 'bg-warning-500', label: 'Away' },
              { color: 'bg-gray-400', label: 'Offline' },
              { color: 'bg-error-500', label: 'Busy' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <div className="bg-brand-500 flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold text-white">
                    JD
                  </div>
                  <span
                    className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${s.color}`}
                  />
                </div>
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Avatar Group" desc="Stacked avatar groups">
          <div className="space-y-4">
            <div className="flex -space-x-3">
              {colors.map((color, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white dark:border-gray-900 ${color}`}
                >
                  {initials[i]}
                </div>
              ))}
            </div>
            <div className="flex -space-x-3">
              {colors.slice(0, 3).map((color, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white dark:border-gray-900 ${color}`}
                >
                  {initials[i]}
                </div>
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-600 dark:border-gray-900 dark:bg-gray-700 dark:text-gray-200">
                +12
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="With Ring" desc="Avatars with colored ring border">
          <div className="flex flex-wrap items-center gap-4">
            {[
              { ring: 'ring-brand-500', label: 'Brand' },
              { ring: 'ring-success-500', label: 'Success' },
              { ring: 'ring-warning-500', label: 'Warning' },
              { ring: 'ring-error-500', label: 'Error' },
            ].map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`bg-brand-500 flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-offset-2 dark:ring-offset-gray-900 ${r.ring}`}
                >
                  JD
                </div>
                <span className="text-xs text-gray-400">{r.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
