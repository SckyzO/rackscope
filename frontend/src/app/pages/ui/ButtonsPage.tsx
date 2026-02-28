import {
  Plus,
  Download,
  Trash2,
  ArrowRight,
  Settings,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

// ── Button base classes (exact TailAdmin patterns) ────────────────────────────

// Primary: bg-brand-500 shadow-theme-xs hover:bg-brand-600
// Secondary: bg-white ring-1 ring-inset ring-gray-300 shadow-theme-xs hover:bg-gray-50
// Two standard sizes: sm (px-4 py-3) and md (px-5 py-3.5)

const BTN_PRIMARY =
  'inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY_MD =
  'inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SECONDARY =
  'inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SECONDARY_MD =
  'inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed';

export const ButtonsPage = () => {
  usePageTitle('Buttons');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buttons"
        description="Button variants from the TailAdmin design system"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Buttons' },
            ]}
          />
        }
      />

      {/* ── Primary ── */}
      <SectionCard title="Primary" desc="Solid brand-500 background — two sizes">
        <div className="flex flex-wrap items-center gap-4">
          <button className={BTN_PRIMARY}>Button Text</button>
          <button className={BTN_PRIMARY_MD}>Button Text</button>
        </div>
      </SectionCard>

      {/* ── Primary with icon ── */}
      <SectionCard
        title="Primary with Icon"
        desc="Leading icon (button-02) and trailing icon (button-03)"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Leading icon */}
          <button className={BTN_PRIMARY}>
            <Plus className="h-5 w-5" />
            Button Text
          </button>
          <button className={BTN_PRIMARY_MD}>
            <Download className="h-5 w-5" />
            Button Text
          </button>
          {/* Trailing icon */}
          <button className={BTN_PRIMARY}>
            Button Text
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className={BTN_PRIMARY_MD}>
            Button Text
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </SectionCard>

      {/* ── Secondary ── */}
      <SectionCard title="Secondary" desc="White background with ring — button-04">
        <div className="flex flex-wrap items-center gap-4">
          <button className={BTN_SECONDARY}>Button Text</button>
          <button className={BTN_SECONDARY_MD}>Button Text</button>
        </div>
      </SectionCard>

      {/* ── Secondary with icon ── */}
      <SectionCard
        title="Secondary with Icon"
        desc="Leading icon (button-05) and trailing icon (button-06)"
      >
        <div className="flex flex-wrap items-center gap-4">
          <button className={BTN_SECONDARY}>
            <Settings className="h-5 w-5" />
            Button Text
          </button>
          <button className={BTN_SECONDARY_MD}>
            <Download className="h-5 w-5" />
            Button Text
          </button>
          <button className={BTN_SECONDARY}>
            Button Text
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className={BTN_SECONDARY_MD}>
            Button Text
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </SectionCard>

      {/* ── Color variants ── */}
      <SectionCard title="Color Variants" desc="Success, Error, Warning">
        <div className="flex flex-wrap items-center gap-4">
          <button className="bg-success-500 hover:bg-success-600 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-sm transition">
            <Check className="h-5 w-5" /> Success
          </button>
          <button className="bg-error-500 hover:bg-error-600 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-sm transition">
            <Trash2 className="h-5 w-5" /> Destructive
          </button>
          <button className="bg-warning-500 hover:bg-warning-600 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-sm transition">
            <AlertTriangle className="h-5 w-5" /> Warning
          </button>
        </div>
      </SectionCard>

      {/* ── Icon-only ── */}
      <SectionCard title="Icon Only" desc="Square icon buttons — primary and secondary">
        <div className="flex flex-wrap items-center gap-4">
          <button className="bg-brand-500 hover:bg-brand-600 inline-flex h-11 w-11 items-center justify-center rounded-lg text-white shadow-sm transition">
            <Plus className="h-5 w-5" />
          </button>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm ring-1 ring-gray-300 transition ring-inset hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5">
            <Settings className="h-5 w-5" />
          </button>
          <button className="bg-error-500 hover:bg-error-600 inline-flex h-11 w-11 items-center justify-center rounded-lg text-white shadow-sm transition">
            <Trash2 className="h-5 w-5" />
          </button>
          <button className="text-error-500 ring-error-300 hover:bg-error-50 dark:ring-error-700 dark:hover:bg-error-500/10 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white shadow-sm ring-1 transition ring-inset dark:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
      </SectionCard>

      {/* ── Sizes ── */}
      <SectionCard title="Sizes" desc="XS · SM · MD · LG">
        <div className="flex flex-wrap items-end gap-4">
          <button className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm transition">
            Extra Small
          </button>
          <button className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white shadow-sm transition">
            Small
          </button>
          <button className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-sm transition">
            Medium
          </button>
          <button className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-5 py-3.5 text-base font-medium text-white shadow-sm transition">
            Large
          </button>
        </div>
      </SectionCard>

      {/* ── Loading & Disabled ── */}
      <SectionCard title="Loading & Disabled" desc="Spinner state and disabled state">
        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled
            className="bg-brand-500 inline-flex cursor-not-allowed items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white opacity-50 shadow-sm"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </button>
          <button
            disabled
            className="bg-brand-500 inline-flex cursor-not-allowed items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white opacity-50 shadow-sm"
          >
            Disabled
          </button>
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-400 opacity-50 shadow-sm ring-1 ring-gray-300 ring-inset dark:bg-gray-800 dark:ring-gray-700"
          >
            Disabled Secondary
          </button>
        </div>
      </SectionCard>

      {/* ── Ghost / Link ── */}
      <SectionCard title="Ghost & Link" desc="Minimal / text-only button styles">
        <div className="flex flex-wrap items-center gap-4">
          <button className="text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition">
            Ghost Primary
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5">
            Ghost Neutral
          </button>
          <button className="text-brand-500 hover:text-brand-600 text-sm font-medium underline-offset-2 hover:underline">
            Link style
          </button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Link neutral
          </button>
        </div>
      </SectionCard>
    </div>
  );
};
