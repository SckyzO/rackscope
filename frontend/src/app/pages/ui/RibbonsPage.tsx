import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const CardBase = ({ children }: { children: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800">
    {children}
  </div>
);

const CardContent = ({ title = 'Card Title' }: { title?: string }) => (
  <div className="mt-8">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Lorem ipsum dolor sit amet consectetur. Eget nulla suscipit arcu rutrum amet vel nec fringilla
      vulputate.
    </p>
  </div>
);

export const RibbonsPage = () => {
  usePageTitle('Ribbons');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ribbons"
        description="Corner and edge label decorations"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Ribbons' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1 — Rounded Ribbon */}
        <SectionCard title="Rounded Ribbon" desc="Simple pill-style badge at top-left">
          <CardBase>
            <span className="bg-brand-500 absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium text-white">
              Popular
            </span>
            <CardContent />
          </CardBase>
        </SectionCard>

        {/* 2 — Ribbon With Shape (pennant / flag pointing right) */}
        <SectionCard title="Ribbon With Shape" desc="Pennant flag with right-pointing arrow tip">
          <CardBase>
            {/* clip-path creates the arrow/pennant shape: flat left + right arrow tip */}
            <div
              className="bg-brand-500 absolute top-4 left-0 py-1.5 pr-8 pl-3 text-sm font-bold text-white"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
              }}
            >
              Popular
            </div>
            <CardContent />
          </CardBase>
        </SectionCard>

        {/* 3 — Filed Ribbon (New) — diagonal corner fold */}
        <SectionCard title="Filed Ribbon" desc="Diagonal banner folded across the top-left corner">
          <CardBase>
            {/* Classic dog-ear corner ribbon: rotated strip clipped by overflow-hidden */}
            <div className="bg-brand-500 absolute top-5 -left-7 w-28 -rotate-45 py-1.5 text-center text-xs font-bold text-white shadow-sm">
              New
            </div>
            <CardContent />
          </CardBase>
        </SectionCard>

        {/* 4 — Filed Ribbon with icon */}
        <SectionCard title="Filed Ribbon (Icon)" desc="Pennant flag with icon at top-left">
          <CardBase>
            <div
              className="bg-brand-500 absolute top-4 left-0 flex items-center gap-1.5 py-1.5 pr-7 pl-2.5 text-white"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
              }}
            >
              {/* Lightning bolt icon via SVG inline */}
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L14 2z" />
              </svg>
              <span className="text-xs font-bold">New</span>
            </div>
            <CardContent />
          </CardBase>
        </SectionCard>

        {/* 5 — Diagonal banner (top-right) */}
        <SectionCard
          title="Corner Banner (Top Right)"
          desc="Diagonal rotated band at the top-right corner"
        >
          <CardBase>
            <div className="bg-error-500 absolute top-4 -right-8 w-28 rotate-45 py-1.5 text-center text-xs font-bold text-white shadow">
              Sale
            </div>
            <CardContent />
          </CardBase>
        </SectionCard>

        {/* 6 — Multiple ribbons */}
        <SectionCard title="Multiple Ribbons" desc="Stacked badge ribbons on the same card">
          <CardBase>
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <span className="bg-brand-500 rounded-full px-2.5 py-0.5 text-xs font-medium text-white">
                New
              </span>
              <span className="bg-success-500 rounded-full px-2.5 py-0.5 text-xs font-medium text-white">
                Popular
              </span>
            </div>
            <div className="mt-12">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Premium Package
              </h4>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Lorem ipsum dolor sit amet consectetur. Eget nulla suscipit arcu rutrum amet vel nec
                fringilla.
              </p>
            </div>
          </CardBase>
        </SectionCard>

        {/* 7 — Success Rounded (Top Right) */}
        <SectionCard
          title="Rounded Ribbon (Top Right)"
          desc="Success pill badge at the top-right corner"
        >
          <CardBase>
            <span className="bg-success-500 absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-medium text-white">
              Featured
            </span>
            <CardContent />
          </CardBase>
        </SectionCard>

        {/* 8 — Warning Filed Ribbon */}
        <SectionCard title="Filed Ribbon (Warning)" desc="Corner fold ribbon in warning color">
          <CardBase>
            <div className="bg-warning-500 absolute top-5 -left-7 w-28 -rotate-45 py-1.5 text-center text-xs font-bold text-white shadow-sm">
              Hot
            </div>
            <CardContent />
          </CardBase>
        </SectionCard>
      </div>
    </div>
  );
};
