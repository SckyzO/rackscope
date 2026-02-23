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
import {
  Plus,
  RefreshCw,
  SlidersHorizontal,
  AlertCircle,
  InboxIcon,
  ChevronRight,
  Server,
} from 'lucide-react';
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

// ── State components ──────────────────────────────────────────────────────────
//
// Use these inside a SectionCard or a ColBox to show loading / empty / error.
// They fill the height of their container via h-full.

/** Spinning loader — use while data is being fetched */
export const LoadingState = ({ message = 'Loading…' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
    <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
  </div>
);

/** No-data state — use when a fetch returns an empty list */
export const EmptyState = ({
  title = 'No data',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <InboxIcon className="h-10 w-10 text-gray-200 dark:text-gray-700" />
    <div className="text-center">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{description}</p>
      )}
    </div>
    {action}
  </div>
);

/** Error state — use when an API call fails */
export const ErrorState = ({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <AlertCircle className="h-8 w-8 text-red-400" />
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-brand-500 hover:text-brand-600 text-xs font-medium hover:underline"
      >
        Try again
      </button>
    )}
  </div>
);

// ── List / row patterns ───────────────────────────────────────────────────────
//
// Three patterns used throughout the app:
//
//  SimpleRow   — label + value on one line (key-value pairs, metadata)
//  ClickableRow — full-width button row with icon + title + subtitle + chevron
//  StatusRow   — same but with a colored status badge on the right
//
// All rows are used inside a SectionCard with divide-y for separators.

/** Key-value row — use for metadata / properties */
export const SimpleRow = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span
      className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}
    >
      {value}
    </span>
  </div>
);

/** Clickable row — use for navigable lists (racks, rooms, devices…) */
export const ClickableRow = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
  >
    {Icon && (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
      {subtitle && <p className="truncate text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-700" />
  </button>
);

const STATUS_PILL: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

/** Status row — same as ClickableRow but with a health badge */
export const StatusRow = ({
  icon: Icon,
  title,
  subtitle,
  status,
  onClick,
}: {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  status: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
  >
    {Icon && (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
      {subtitle && <p className="truncate text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
    </div>
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[status] ?? STATUS_PILL.UNKNOWN}`}
    >
      {status}
    </span>
  </button>
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

      {/* ── States ── */}
      <div className="space-y-2">
        <LayoutLabel>States — Loading / Empty / Error</LayoutLabel>
        <div className="grid grid-cols-3 gap-4">
          <SectionCard title="Loading">
            <LoadingState message="Fetching data…" />
          </SectionCard>
          <SectionCard title="Empty">
            <EmptyState
              title="No items yet"
              description="Create one to get started."
              action={
                <button className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors">
                  <Plus className="h-4 w-4" />
                  New
                </button>
              }
            />
          </SectionCard>
          <SectionCard title="Error">
            <ErrorState message="Failed to load data." onRetry={() => {}} />
          </SectionCard>
        </div>
      </div>

      {/* ── List patterns ── */}
      <div className="space-y-2">
        <LayoutLabel>List — SimpleRow (key / value)</LayoutLabel>
        <SectionCard title="Metadata">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SimpleRow label="ID" value="rack-01-a" mono />
            <SimpleRow label="Height" value="42U" />
            <SimpleRow label="Template" value="Standard Air Cooled" />
            <SimpleRow label="Devices" value={14} />
          </div>
        </SectionCard>
      </div>

      <div className="space-y-2">
        <LayoutLabel>List — ClickableRow (navigable)</LayoutLabel>
        <SectionCard title="Racks">
          <div className="-mx-1 divide-y divide-gray-100 dark:divide-gray-800">
            <ClickableRow icon={Server} title="Rack 01-A" subtitle="Room A · Aisle 1" />
            <ClickableRow icon={Server} title="Rack 01-B" subtitle="Room A · Aisle 1" />
            <ClickableRow icon={Server} title="Rack 02-A" subtitle="Room A · Aisle 2" />
          </div>
        </SectionCard>
      </div>

      <div className="space-y-2">
        <LayoutLabel>List — StatusRow (with health badge)</LayoutLabel>
        <SectionCard title="Infrastructure">
          <div className="-mx-1 divide-y divide-gray-100 dark:divide-gray-800">
            <StatusRow icon={Server} title="Rack 01-A" subtitle="Room A" status="OK" />
            <StatusRow icon={Server} title="Rack 01-B" subtitle="Room A" status="WARN" />
            <StatusRow icon={Server} title="Rack 02-A" subtitle="Room A" status="CRIT" />
            <StatusRow icon={Server} title="Rack 02-B" subtitle="Room A" status="UNKNOWN" />
          </div>
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
