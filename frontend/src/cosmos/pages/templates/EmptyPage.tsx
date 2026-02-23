/**
 * EmptyPage — Cosmos page template
 *
 * Building blocks:
 *   PageHeader   — title + description + optional action buttons (top-right)
 *   SectionCard  — white card with title + optional description + children
 *   ColBox       — styled placeholder box (same as MetricsPage cards)
 *
 * Column layouts — use directly in any page:
 *   1 col  (no grid needed, ColBox is block)
 *   2 cols  grid-cols-2
 *   3 cols  grid-cols-3             33/33/33
 *   3 cols  grid-cols-[1fr_3fr_1fr] 20/60/20
 *   3 cols  grid-cols-[1fr_5fr_4fr] 10/50/40
 *   4 cols  grid-cols-4
 *
 * All grids use gap-4. Swap to gap-5 or gap-6 for more breathing room.
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

export const ColBox = ({ label, height = 80 }: { label: string; height?: number }) => (
  <div
    className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    style={{ minHeight: height }}
  >
    <span className="font-mono text-sm font-semibold text-gray-400 dark:text-gray-500">
      {label}
    </span>
  </div>
);

// ── Layout section label ───────────────────────────────────────────────────────

const LayoutLabel = ({ children }: { children: string }) => (
  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
    {children}
  </p>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const EmptyPage = () => {
  usePageTitle('Empty Page');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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

      {/* ── SectionCard ── */}
      <div className="space-y-2">
        <LayoutLabel>SectionCard — with title, description, content</LayoutLabel>
        <SectionCard
          title="Section title"
          desc="Optional description — explains what this section contains."
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Content goes here. Replace with actual components, tables, charts, etc.
          </p>
        </SectionCard>
      </div>

      {/* ── SectionCard without description ── */}
      <div className="space-y-2">
        <LayoutLabel>SectionCard — title only</LayoutLabel>
        <SectionCard title="Section title">
          <p className="text-sm text-gray-500 dark:text-gray-400">Content goes here.</p>
        </SectionCard>
      </div>

      {/* ── 1 Column ── */}
      <div className="space-y-2">
        <LayoutLabel>1 Column</LayoutLabel>
        <ColBox label="100%" height={100} />
      </div>

      {/* ── 2 Columns ── */}
      <div className="space-y-2">
        <LayoutLabel>2 Columns — 50 / 50</LayoutLabel>
        <div className="grid grid-cols-2 gap-4">
          <ColBox label="50%" />
          <ColBox label="50%" />
        </div>
      </div>

      {/* ── 3 Columns — 33/33/33 ── */}
      <div className="space-y-2">
        <LayoutLabel>3 Columns — Equal 33 / 33 / 33</LayoutLabel>
        <div className="grid grid-cols-3 gap-4">
          <ColBox label="33%" />
          <ColBox label="33%" />
          <ColBox label="33%" />
        </div>
      </div>

      {/* ── 3 Columns — 20/60/20 ── */}
      <div className="space-y-2">
        <LayoutLabel>3 Columns — Centered 20 / 60 / 20</LayoutLabel>
        <div className="grid grid-cols-[1fr_3fr_1fr] gap-4">
          <ColBox label="20%" />
          <ColBox label="60%" />
          <ColBox label="20%" />
        </div>
      </div>

      {/* ── 3 Columns — 10/50/40 ── */}
      <div className="space-y-2">
        <LayoutLabel>3 Columns — Asymmetric 10 / 50 / 40</LayoutLabel>
        <div className="grid grid-cols-[1fr_5fr_4fr] gap-4">
          <ColBox label="10%" />
          <ColBox label="50%" />
          <ColBox label="40%" />
        </div>
      </div>

      {/* ── 3 Columns — 20/50/30 ── */}
      <div className="space-y-2">
        <LayoutLabel>3 Columns — 20 / 50 / 30</LayoutLabel>
        <div className="grid grid-cols-[2fr_5fr_3fr] gap-4">
          <ColBox label="20%" />
          <ColBox label="50%" />
          <ColBox label="30%" />
        </div>
      </div>

      {/* ── 4 Columns ── */}
      <div className="space-y-2">
        <LayoutLabel>4 Columns — Equal 25 / 25 / 25 / 25</LayoutLabel>
        <div className="grid grid-cols-4 gap-4">
          <ColBox label="25%" />
          <ColBox label="25%" />
          <ColBox label="25%" />
          <ColBox label="25%" />
        </div>
      </div>
    </div>
  );
};
