import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const TOTAL = 10;

function pages(current: number): (number | '...')[] {
  if (TOTAL <= 7) return Array.from({ length: TOTAL }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', TOTAL];
  if (current >= TOTAL - 2) return [1, '...', TOTAL - 3, TOTAL - 2, TOTAL - 1, TOTAL];
  return [1, '...', current - 1, current, current + 1, '...', TOTAL];
}

const PageBtn = ({
  page,
  active,
  onClick,
}: {
  page: number | '...';
  active?: boolean;
  onClick?: () => void;
}) =>
  page === '...' ? (
    <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">…</span>
  ) : (
    <button
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${active ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`}
    >
      {page}
    </button>
  );

const NavBtn = ({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
  >
    {children}
  </button>
);

export const PaginationPage = () => {
  usePageTitle('Pagination');
  const [p1, sp1] = useState(1);
  const [p2, sp2] = useState(1);
  const [p3, sp3] = useState(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagination"
        description="Navigation controls for paged content"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Pagination' },
            ]}
          />
        }
      />
      <div className="grid gap-6">
        <SectionCard title="With Text" desc="Previous / Next text labels">
          <nav className="flex justify-center">
            <div className="flex items-center gap-1">
              <NavBtn onClick={() => sp1(Math.max(1, p1 - 1))} disabled={p1 === 1}>
                Previous
              </NavBtn>
              {pages(p1).map((pg, i) => (
                <PageBtn
                  key={i} // eslint-disable-line react/no-array-index-key
                  page={pg}
                  active={pg === p1}
                  onClick={typeof pg === 'number' ? () => sp1(pg) : undefined}
                />
              ))}
              <NavBtn onClick={() => sp1(Math.min(TOTAL, p1 + 1))} disabled={p1 === TOTAL}>
                Next
              </NavBtn>
            </div>
          </nav>
        </SectionCard>
        <SectionCard title="With Icons and Text" desc="Chevron icons alongside text">
          <nav className="flex justify-center">
            <div className="flex items-center gap-1">
              <NavBtn onClick={() => sp2(Math.max(1, p2 - 1))} disabled={p2 === 1}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </NavBtn>
              {pages(p2).map((pg, i) => (
                <PageBtn
                  key={i} // eslint-disable-line react/no-array-index-key
                  page={pg}
                  active={pg === p2}
                  onClick={typeof pg === 'number' ? () => sp2(pg) : undefined}
                />
              ))}
              <NavBtn onClick={() => sp2(Math.min(TOTAL, p2 + 1))} disabled={p2 === TOTAL}>
                Next
                <ChevronRight className="h-4 w-4" />
              </NavBtn>
            </div>
          </nav>
        </SectionCard>
        <SectionCard title="Icon Only" desc="Compact icon-only navigation">
          <nav className="flex justify-center">
            <div className="flex items-center gap-1">
              <button
                onClick={() => sp3(Math.max(1, p3 - 1))}
                disabled={p3 === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pages(p3).map((pg, i) => (
                <PageBtn
                  key={i} // eslint-disable-line react/no-array-index-key
                  page={pg}
                  active={pg === p3}
                  onClick={typeof pg === 'number' ? () => sp3(pg) : undefined}
                />
              ))}
              <button
                onClick={() => sp3(Math.min(TOTAL, p3 + 1))}
                disabled={p3 === TOTAL}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </SectionCard>
        <SectionCard title="With Page Info" desc="Shows current page range">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(p1 - 1) * 10 + 1}–{Math.min(p1 * 10, 97)}
              </span>{' '}
              of <span className="font-semibold text-gray-900 dark:text-white">97</span> results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => sp1(Math.max(1, p1 - 1))}
                disabled={p1 === 1}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => sp1(pg)}
                  className={`flex h-8 w-8 items-center justify-center rounded text-sm font-medium transition-colors ${p1 === pg ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => sp1(Math.min(TOTAL, p1 + 1))}
                disabled={p1 === TOTAL}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
