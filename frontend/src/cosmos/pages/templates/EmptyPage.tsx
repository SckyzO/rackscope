/**
 * EmptyPage — Cosmos page template
 *
 * Use this as a starting point for any new page.
 * Copy, rename the export, and replace the placeholder content.
 *
 * Standard structure:
 *   <div className="space-y-6">          ← page root, handles vertical rhythm
 *     <PageHeader                         ← title + description + optional action buttons
 *       title="…"
 *       description="…"
 *       actions={<>…buttons…</>}
 *     />
 *     <SectionCard title="…">            ← one card per logical section
 *       {content}
 *     </SectionCard>
 *   </div>
 */

import type { ReactNode } from 'react';
import { Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

// ── Shared sub-components (copy into new pages as needed) ─────────────────────

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  /** Optional action buttons — rendered top-right, flex row with gap-2 */
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

// ── Standard button styles (use these classes on any <button>) ────────────────
//
//  Primary  → "bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
//  Secondary→ "flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
//  Icon-only→ same as secondary but without text, just icon

// ── Page ──────────────────────────────────────────────────────────────────────

export const EmptyPage = () => {
  // usePageTitle() drives the header title — call with the exact page title.
  usePageTitle('Empty Page');

  return (
    <div className="space-y-6">
      {/* Page header with action buttons top-right */}
      <PageHeader
        title="Page Title"
        description="A short description of what this page shows or lets you do."
        actions={
          <>
            {/* Icon-only secondary button */}
            <button
              title="Settings"
              className="flex items-center justify-center rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {/* Secondary button with icon + label */}
            <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            {/* Primary button */}
            <button className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors">
              <Plus className="h-4 w-4" />
              New
            </button>
          </>
        }
      />

      <SectionCard title="Section title" desc="Optional section description.">
        <p className="text-sm text-gray-400">Content goes here.</p>
      </SectionCard>
    </div>
  );
};
