/**
 * EmptyPage — Cosmos page template
 *
 * Copy this file, rename the export, and replace placeholder content.
 *
 * Building blocks available here:
 *   PageHeader   — title + description + optional action buttons (top-right)
 *   SectionCard  — white card with title, optional description, children
 *   ColBox       — placeholder box for column layouts
 *
 * Column layouts use CSS Grid. Available patterns:
 *   grid-cols-2                  → 2 equal columns
 *   grid-cols-3                  → 3 equal columns (33/33/33)
 *   grid-cols-[1fr_3fr_1fr]      → 3 columns 20/60/20
 *   grid-cols-[1fr_5fr_4fr]      → 3 columns 10/50/40
 *   grid-cols-4                  → 4 equal columns
 *
 * All grids use gap-4 by default. Change to gap-5 or gap-6 for more breathing room.
 */

import type { ReactNode } from 'react';
import { Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

// ── Shared sub-components ─────────────────────────────────────────────────────

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export const SectionCard = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children?: ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

// ── Column placeholder box ─────────────────────────────────────────────────────

const ColBox = ({ label, height = 80 }: { label: string; height?: number }) => (
  <div
    className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
    style={{ minHeight: height }}
  >
    <span className="font-mono text-sm font-semibold text-gray-400 dark:text-gray-500">
      {label}
    </span>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const EmptyPage = () => {
  usePageTitle('Empty Page');

  return (
    <div className="space-y-6">
      {/* ── Header with action buttons ── */}
      <PageHeader
        title="Page Title"
        description="A short description of what this page shows or lets you do."
        actions={
          <>
            <button
              title="Settings"
              className="flex items-center justify-center rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors">
              <Plus className="h-4 w-4" />
              New
            </button>
          </>
        }
      />

      {/* ── 2 Columns ── */}
      <SectionCard title="2 Columns" desc="Equal 50 / 50">
        <div className="grid grid-cols-2 gap-4">
          <ColBox label="50%" />
          <ColBox label="50%" />
        </div>
      </SectionCard>

      {/* ── 3 Columns — 33/33/33 ── */}
      <SectionCard title="3 Columns — Equal" desc="33 / 33 / 33">
        <div className="grid grid-cols-3 gap-4">
          <ColBox label="33%" />
          <ColBox label="33%" />
          <ColBox label="33%" />
        </div>
      </SectionCard>

      {/* ── 3 Columns — 20/60/20 ── */}
      <SectionCard title="3 Columns — Centered" desc="20 / 60 / 20">
        <div className="grid grid-cols-[1fr_3fr_1fr] gap-4">
          <ColBox label="20%" />
          <ColBox label="60%" />
          <ColBox label="20%" />
        </div>
      </SectionCard>

      {/* ── 3 Columns — 10/50/40 ── */}
      <SectionCard title="3 Columns — Asymmetric" desc="10 / 50 / 40">
        <div className="grid grid-cols-[1fr_5fr_4fr] gap-4">
          <ColBox label="10%" />
          <ColBox label="50%" />
          <ColBox label="40%" />
        </div>
      </SectionCard>

      {/* ── 4 Columns ── */}
      <SectionCard title="4 Columns" desc="Equal 25 / 25 / 25 / 25">
        <div className="grid grid-cols-4 gap-4">
          <ColBox label="25%" />
          <ColBox label="25%" />
          <ColBox label="25%" />
          <ColBox label="25%" />
        </div>
      </SectionCard>
    </div>
  );
};
