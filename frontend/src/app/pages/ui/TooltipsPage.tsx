import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

type Pos = 'top' | 'bottom' | 'left' | 'right';
type Color = 'dark' | 'white' | 'brand';

const positionClasses: Record<Pos, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const colorClasses: Record<Color, string> = {
  dark: 'bg-gray-900 text-white dark:bg-gray-700',
  white:
    'bg-white text-gray-700 border border-gray-200 shadow-theme-md dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
  brand: 'bg-brand-500 text-white',
};

const Tooltip = ({ pos, color, label }: { pos: Pos; color: Color; label: string }) => (
  <div className="group relative inline-flex">
    <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {label}
    </button>
    <div
      className={`pointer-events-none invisible absolute z-50 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap group-hover:visible ${positionClasses[pos]} ${colorClasses[color]}`}
    >
      Tooltip {pos}
    </div>
  </div>
);

export const TooltipsPage = () => {
  usePageTitle('Tooltips');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tooltips"
        description="Informational text appearing on hover"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Tooltips' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Default (Dark)" desc="Hover to show tooltip in each position">
          <div className="flex flex-wrap gap-8 pt-4 pb-4">
            {(['top', 'right', 'bottom', 'left'] as Pos[]).map((pos) => (
              <Tooltip key={pos} pos={pos} color="dark" label={`Tooltip ${pos}`} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Brand Color" desc="Brand-colored tooltips in all positions">
          <div className="flex flex-wrap gap-8 pt-4 pb-4">
            {(['top', 'right', 'bottom', 'left'] as Pos[]).map((pos) => (
              <Tooltip key={pos} pos={pos} color="brand" label={`Tooltip ${pos}`} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="White Tooltip" desc="Light background with border and shadow">
          <div className="flex flex-wrap gap-8 pt-4 pb-4">
            {(['top', 'right', 'bottom', 'left'] as Pos[]).map((pos) => (
              <Tooltip key={pos} pos={pos} color="white" label={`Tooltip ${pos}`} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="With Rich Content" desc="Tooltips containing formatted text">
          <div className="flex flex-wrap gap-8 pt-4 pb-4">
            <div className="group relative inline-flex">
              <button className="bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-1.5 text-xs font-medium text-white">
                Hover me
              </button>
              <div className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-xl bg-gray-900 p-3 group-hover:visible dark:bg-gray-700">
                <p className="text-xs font-semibold text-white">Information</p>
                <p className="mt-1 text-xs text-gray-300">
                  This tooltip contains multiple lines of text for context.
                </p>
              </div>
            </div>
            <div className="group relative inline-flex">
              <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                With Status
              </button>
              <div className="bg-success-500 pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg px-3 py-1.5 group-hover:visible">
                <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Status: Online
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
