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
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Building2,
  Box,
  Cpu,
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

// ── Status badge ─────────────────────────────────────────────────────────────
//
// Three sizes:
//   sm  — inline in a row / table cell (text-[10px])
//   md  — standard badge (text-xs)      ← default
//   lg  — prominent display (text-sm)
//
// Health dot: small colored circle for compact views.

const STATUS_COLOR: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

type HealthStatus = 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';

export const StatusBadge = ({
  status,
  size = 'md',
}: {
  status: HealthStatus;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClass =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px]'
      : size === 'lg'
        ? 'px-3 py-1 text-sm'
        : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${sizeClass} ${STATUS_PILL[status] ?? STATUS_PILL.UNKNOWN}`}
    >
      {status}
    </span>
  );
};

export const HealthDot = ({ status, pulse = false }: { status: HealthStatus; pulse?: boolean }) => (
  <span className="relative flex h-2.5 w-2.5 shrink-0">
    {pulse && (
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        style={{ backgroundColor: STATUS_COLOR[status] }}
      />
    )}
    <span
      className="relative inline-flex h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: STATUS_COLOR[status] }}
    />
  </span>
);

// ── Health badge (icon + label) ───────────────────────────────────────────────
//
// Distinct from StatusBadge (pill): this is the rounded-lg badge with icon
// as seen on the Health Status page. Use for prominent state display.

const HEALTH_CONFIG: Record<
  HealthStatus,
  { icon: React.ElementType; bg: string; text: string; border: string }
> = {
  OK: {
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-500/30',
  },
  WARN: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  CRIT: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
  },
  UNKNOWN: {
    icon: HelpCircle,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

export const HealthBadge = ({ status }: { status: HealthStatus }) => {
  const { icon: Icon, bg, text, border } = HEALTH_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${bg} ${text} ${border}`}
    >
      <Icon className="h-4 w-4" />
      {status}
    </span>
  );
};

// ── Breadcrumb ────────────────────────────────────────────────────────────────
//
// Clickable path: Site → Room → Aisle → Rack → Device (current, not a link).
// Pass items in order; the last item is rendered as the current page (no link).

export type BreadcrumbItem = {
  label: string;
  icon?: React.ElementType;
  href?: string;
};

export const Breadcrumb = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav className="flex items-center gap-1 overflow-x-auto">
    {items.map(({ icon: Icon, label, href }, i) => {
      const isLast = i === items.length - 1;
      return (
        <div key={label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />}
          {isLast ? (
            <span className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white">
              {Icon && <Icon className="text-brand-500 h-4 w-4" />}
              {label}
            </span>
          ) : (
            <a
              href={href ?? '#'}
              className="text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10 flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </a>
          )}
        </div>
      );
    })}
  </nav>
);

// ── Centered / narrow layout ─────────────────────────────────────────────────
//
// From TailAdmin blank.html:
//   outer: rounded-2xl border bg-white — single card wrapping ALL page content
//   inner: mx-auto max-w-[630px]       — content constrained + centered
//
// Use this for: Settings, Profile, forms — anything that's hard to read full-width.
//
// Two components:
//   PageCard      — the full-page outer card (replaces space-y-6 + individual SectionCards)
//   ContentNarrow — centered width-constrained wrapper to put inside PageCard

export const PageCard = ({ children }: { children: ReactNode }) => (
  <div className="min-h-[60vh] rounded-2xl border border-gray-200 bg-white px-5 py-8 xl:px-10 xl:py-12 dark:border-gray-800 dark:bg-gray-900">
    {children}
  </div>
);

/** Constrained centered column — use inside PageCard or anywhere */
export const ContentNarrow = ({
  children,
  maxWidth = 680,
}: {
  children: ReactNode;
  maxWidth?: number;
}) => (
  <div className="mx-auto w-full" style={{ maxWidth }}>
    {children}
  </div>
);

// ── EmptyPage — the actual blank template to copy ────────────────────────────
//
// This is what you duplicate when starting a new page.
// Delete / replace the placeholder content and add your own.

export const EmptyPage = () => {
  usePageTitle('Page Title'); // ← change this

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page Title"
        description="A short description of what this page shows or lets you do."
        // actions={<> … buttons … </>}  ← uncomment to add action buttons
      />

      <SectionCard title="Section title" desc="Optional description.">
        <p className="text-sm text-gray-400 dark:text-gray-500">Content goes here.</p>
      </SectionCard>
    </div>
  );
};

// ── TemplatesShowcase — component library reference ───────────────────────────
//
// Route: /cosmos/templates/showcase
// Shows every building block available in this file.
// Do NOT copy this — copy EmptyPage above instead.

export const TemplatesShowcase = () => {
  usePageTitle('Design System');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Design System"
        description="All Cosmos building blocks — reference for new pages."
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

      {/* ── Centered layout (canvas page) ── */}
      <div className="space-y-2">
        <LayoutLabel>
          Centered layout — breadcrumb + single full-page card + content constrained to 630px
        </LayoutLabel>
        {/* Breadcrumb sits above the card */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/cosmos' },
            { label: 'Section', href: '#' },
            { label: 'Page Title' },
          ]}
        />
        {/* The canvas card: bg-white / dark:bg-gray-900, min height, generous padding */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 xl:px-10 xl:py-12 dark:border-gray-800 dark:bg-gray-900">
          {/* ContentNarrow (inline style) guarantees the 630px constraint */}
          <ContentNarrow maxWidth={630}>
            <div className="mb-8 text-center">
              <h3 className="mb-3 text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">
                Page Title
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Title and description live INSIDE the card. Content below is also constrained.
              </p>
            </div>
            <div className="space-y-4">
              <ColBox label="630px content width" height={60} />
              <div className="grid grid-cols-2 gap-4">
                <ColBox label="50%" height={60} />
                <ColBox label="50%" height={60} />
              </div>
            </div>
          </ContentNarrow>
        </div>
      </div>

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

      {/* ── Status badges ── */}
      <div className="space-y-2">
        <LayoutLabel>Status badges — SM / MD / LG</LayoutLabel>
        <SectionCard title="StatusBadge">
          <div className="space-y-4">
            {/* All states × all sizes */}
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <div key={size} className="flex flex-wrap items-center gap-2">
                <span className="w-6 font-mono text-[10px] text-gray-400">{size}</span>
                {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((s) => (
                  <StatusBadge key={s} status={s} size={size} />
                ))}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="space-y-2">
        <LayoutLabel>Health dot — static / pulsing</LayoutLabel>
        <SectionCard title="HealthDot">
          <div className="flex flex-wrap gap-6">
            {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <HealthDot status={s} pulse />
                <span className="text-sm text-gray-600 dark:text-gray-400">{s}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Health badges (icon + label) ── */}
      <div className="space-y-2">
        <LayoutLabel>Health badge — icon + label (rounded-lg)</LayoutLabel>
        <SectionCard title="HealthBadge">
          <div className="flex flex-wrap gap-3">
            {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((s) => (
              <HealthBadge key={s} status={s} />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="space-y-2">
        <LayoutLabel>Breadcrumb — Site → Room → Aisle → Rack → Device (current)</LayoutLabel>
        <SectionCard title="Breadcrumb">
          <Breadcrumb
            items={[
              { icon: Building2, label: 'DC Paris', href: '#' },
              { icon: Server, label: 'Room A', href: '#' },
              { icon: Box, label: 'Aisle 01', href: '#' },
              { icon: Box, label: 'Rack r01-01', href: '#' },
              { icon: Cpu, label: 'r01-01-c01' },
            ]}
          />
        </SectionCard>
      </div>

      {/* ── Inline form ── */}
      <div className="space-y-2">
        <LayoutLabel>Inline form — text input / select / toggle inside a SectionCard</LayoutLabel>
        <SectionCard title="Form" desc="Use this layout for settings and editor forms.">
          <div className="space-y-4">
            {/* Text input */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Label
              </label>
              <input
                type="text"
                placeholder="Placeholder…"
                className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">Optional helper text.</p>
            </div>

            {/* Select */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select
              </label>
              <select className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option>Option A</option>
                <option>Option B</option>
                <option>Option C</option>
              </select>
            </div>

            {/* Toggle row */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Toggle option
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Short description of what this enables.
                </p>
              </div>
              {/* Toggle — copy className, wire onClick + checked to your state */}
              <button
                type="button"
                className="bg-brand-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
              >
                <span className="pointer-events-none inline-block h-5 w-5 translate-x-5 rounded-full bg-white shadow ring-0 transition-transform" />
              </button>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5">
                Cancel
              </button>
              <button className="bg-brand-500 hover:bg-brand-600 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors">
                Save
              </button>
            </div>
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

// ── CenteredPage — blank template for settings / forms / profiles ─────────────
//
// Route: /cosmos/templates/centered
//
// From TailAdmin blank.html:
//   - ONE big card fills the whole page area (no separate PageHeader above)
//   - Title + description are centered at the TOP of the card
//   - Content below is also constrained to a readable max-width
//
// Use this for: Settings, Profile, detail forms — anything that's hard to read full-width.

export const CenteredPage = () => {
  usePageTitle('Page Title'); // ← change this

  return (
    // mx-auto + max-w matches TailAdmin's `max-w-(--breakpoint-2xl)` wrapper
    // This prevents the card from stretching on ultra-wide screens.
    <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-5">
      {/* Breadcrumb — above the card */}
      <Breadcrumb items={[{ label: 'Home', href: '/cosmos' }, { label: 'Page Title' }]} />

      {/*
       * Single full-height canvas card — matches TailAdmin blank.html exactly.
       *
       * Key classes:
       *   min-h-screen          fills the visible content area
       *   bg-white              solid white in light mode
       *   dark:bg-gray-900      card background matching Cosmos SectionCard dark theme
       *   xl:px-10 xl:py-12     generous padding on wide screens
       *
       * Replace the centered placeholder below with your actual content.
       */}
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 xl:px-10 xl:py-12 dark:border-gray-800 dark:bg-gray-900">
        {/* ContentNarrow uses inline style={{ maxWidth }} — guaranteed to work */}
        <ContentNarrow maxWidth={630}>
          <div className="text-center">
            <h3 className="mb-4 text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">
              Page Title
            </h3>
            <p className="text-sm text-gray-500 sm:text-base dark:text-gray-400">
              Replace this with your content. Use SectionCard for sections, column grids for
              layouts.
            </p>
          </div>
        </ContentNarrow>
      </div>
    </div>
  );
};
