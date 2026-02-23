/**
 * EmptyPage — Cosmos page template
 *
 * Use this as a starting point for any new page.
 * Copy, rename the export, and replace the placeholder content.
 *
 * Standard structure:
 *   <div className="space-y-6">          ← page root, handles vertical rhythm
 *     <PageHeader />                      ← title + description (always first)
 *     <SectionCard title="…">            ← one card per logical section
 *       {content}
 *     </SectionCard>
 *   </div>
 */

import type { ReactNode } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';

// ── Shared sub-components (copy into new pages as needed) ─────────────────────

export const PageHeader = ({ title, description }: { title: string; description?: string }) => (
  <div>
    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
    {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export const EmptyPage = () => {
  // usePageTitle() sets the header title dynamically.
  // Always call this with the page title — it replaces the static ROUTE_LABELS map.
  usePageTitle('Empty Page');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page Title"
        description="A short description of what this page shows or lets you do."
      />

      <SectionCard title="Section title" desc="Optional section description.">
        <p className="text-sm text-gray-400">Content goes here.</p>
      </SectionCard>
    </div>
  );
};
