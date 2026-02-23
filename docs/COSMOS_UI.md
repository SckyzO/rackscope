# Cosmos UI Library

## Overview

The Cosmos UI is a component design lab embedded in the Rackscope application.
It provides a living style guide and component playground used to prototype and validate
UI patterns before integrating them into production views.

- **React 19 + TypeScript + Tailwind CSS v4.1**
- Based on TailAdmin HTML template (translated to React JSX)
- Design tokens defined in `frontend/src/index.css` (`@theme` block)
- Dark mode: class-based via `.dark` on the `html` element
- Route prefix: `/cosmos/*`

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| React | 19 | UI framework |
| TypeScript | 5+ | Type safety |
| Vite | 5 | Dev server + bundler |
| Tailwind CSS | v4.1 | Utility-first styling (CSS-first config) |
| Lucide React | latest | Icon set |
| React Router | v6 | Client-side routing |

---

## Key Rules (Tailwind v4)

Tailwind v4 scans source files and generates only the classes it finds as **static strings**.
Dynamic string interpolation breaks this scan — classes will be missing from the output.

```tsx
// WRONG — Tailwind cannot detect this class at build time
<div className={`text-${color}-500`} />

// RIGHT — use a static lookup map
const STATUS_CLASS: Record<string, string> = {
  ok:      'text-green-500',
  warn:    'text-amber-500',
  crit:    'text-red-500',
  unknown: 'text-gray-500',
};
<div className={STATUS_CLASS[status]} />
```

---

## Design Tokens (`index.css`)

Defined via `@theme` in `frontend/src/index.css`:

| Token | Value | Description |
|-------|-------|-------------|
| `brand-50` … `brand-950` | `#465fff` base | Primary brand palette |
| `color-success` | `#12b76a` | Success / OK state |
| `color-warning` | `#f59e0b` | Warning state |
| `color-error` | `#ef4444` | Error / Critical state |
| Gray dark | `#111827` (gray-900) | Primary dark surface |

### Layout surfaces

| Element | Light | Dark |
|---------|-------|------|
| Sidebar | `bg-white` | `bg-gray-900` |
| Page canvas | `bg-gray-100` | `bg-gray-950` |
| Card / panel | `bg-white` | `bg-gray-900` |
| Card border | `border-gray-200` | `border-gray-800` |

---

## Creating a New Page

### Standard layout (full-width content)

```tsx
import { PageHeader, SectionCard } from '../templates/EmptyPage';
import { usePageTitle } from '../contexts/PageTitleContext';

export const MyPage = () => {
  usePageTitle('My Page');

  return (
    <div className="space-y-6">
      <PageHeader title="My Page" description="Brief description of the page." />
      <SectionCard title="Section Title">
        {/* content */}
      </SectionCard>
    </div>
  );
};
```

### Centered layout (settings / forms)

```tsx
import { PageHeader, SectionCard, ContentNarrow, Breadcrumb } from '../templates/EmptyPage';
import { usePageTitle } from '../contexts/PageTitleContext';

export const MySettingsPage = () => {
  usePageTitle('Settings');

  return (
    <div className="mx-auto w-full max-w-[1536px] p-1 md:p-6">
      <div className="mb-5">
        <Breadcrumb items={[{ label: 'Home', href: '/cosmos' }, { label: 'Settings' }]} />
      </div>
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-gray-900 xl:px-10 xl:py-12">
        <ContentNarrow maxWidth={630}>
          {/* centered form content */}
        </ContentNarrow>
      </div>
    </div>
  );
};
```

---

## Exported Components (`EmptyPage.tsx`)

All building blocks are exported from `cosmos/pages/templates/EmptyPage.tsx`.

### Layout

| Component | Props | Description |
|-----------|-------|-------------|
| `PageHeader` | `title`, `description?`, `actions?` | Page title + description + optional action buttons (top-right) |
| `SectionCard` | `title`, `desc?`, `children` | White rounded card with title and optional description |
| `ColBox` | `label`, `height?` | Styled placeholder box for layout prototyping |
| `ContentNarrow` | `maxWidth?`, `children` | Centered, width-constrained content wrapper |
| `PageCard` | `children` | Full-height white page canvas |

### States

| Component | Props | Description |
|-----------|-------|-------------|
| `LoadingState` | `message?` | Centered spinner + text |
| `EmptyState` | `title?`, `description?`, `action?` | No-data placeholder with optional CTA button |
| `ErrorState` | `message?`, `onRetry?` | Error message with optional retry link |

### Data Display

| Component | Props | Description |
|-----------|-------|-------------|
| `StatusBadge` | `status`, `size?` (`sm` / `md` / `lg`) | OK / WARN / CRIT / UNKNOWN pill badge |
| `HealthBadge` | `status` | Icon + label badge with `rounded-lg` |
| `HealthDot` | `status`, `pulse?` | Small colored dot with optional CSS ping animation |
| `SimpleRow` | `label`, `value`, `mono?` | Key-value pair row (e.g., in detail panels) |
| `ClickableRow` | `icon?`, `title`, `subtitle?`, `onClick?` | Navigable list row with trailing chevron |
| `StatusRow` | `icon?`, `title`, `subtitle?`, `status`, `onClick?` | List row with integrated health badge |

### Navigation

| Component | Props | Description |
|-----------|-------|-------------|
| `Breadcrumb` | `items: { label, icon?, href? }[]` | Site / Room / Aisle / Rack path trail |

### Constants

| Export | Type | Description |
|--------|------|-------------|
| `STATUS_PILL` | `Record<string, string>` | Tailwind CSS classes per health status |
| `STATUS_COLOR` | `Record<string, string>` | Hex color strings per health status |
| `HEALTH_CONFIG` | `Record<HealthStatus, { icon, color, bg, text, border }>` | Full config per status (icons + colors) |

---

## Button Patterns

```tsx
{/* Primary action */}
<button className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors">
  <Plus className="h-4 w-4" />
  Add Item
</button>

{/* Secondary action */}
<button className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5">
  <RefreshCw className="h-4 w-4" />
  Refresh
</button>

{/* Icon-only */}
<button className="flex items-center justify-center rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5">
  <SlidersHorizontal className="h-4 w-4" />
</button>
```

---

## Grid Layouts

```tsx
{/* 1 column — no grid needed, children are block */}

{/* 2 columns — 50/50 */}
<div className="grid grid-cols-2 gap-4">

{/* 3 columns — 33/33/33 */}
<div className="grid grid-cols-3 gap-4">

{/* 3 columns — 20/60/20 */}
<div className="grid grid-cols-[1fr_3fr_1fr] gap-4">

{/* 3 columns — 10/50/40 */}
<div className="grid grid-cols-[1fr_5fr_4fr] gap-4">

{/* 3 columns — 20/50/30 */}
<div className="grid grid-cols-[2fr_5fr_3fr] gap-4">

{/* 4 columns — 25/25/25/25 */}
<div className="grid grid-cols-4 gap-4">
```

---

## Health Status Colors

| Status | Hex | Tailwind class |
|--------|-----|----------------|
| OK | `#10b981` | `green-500` |
| WARN | `#f59e0b` | `amber-500` |
| CRIT | `#ef4444` | `red-500` |
| UNKNOWN | `#6b7280` | `gray-500` |

---

## UI Demo Pages (`/cosmos/ui/*`)

31 demo pages covering all base components:

| Route | Page | Description |
|-------|------|-------------|
| `/cosmos/ui/accordion` | AccordionPage | Collapsible content sections |
| `/cosmos/ui/alerts` | AlertsPage | Contextual feedback messages |
| `/cosmos/ui/avatars` | AvatarsPage | User and entity avatars |
| `/cosmos/ui/badges` | BadgesPage | Status and label pills |
| `/cosmos/ui/breadcrumb` | BreadcrumbPage | Hierarchical path trail |
| `/cosmos/ui/buttons-group` | ButtonsGroupPage | Button variants and groups |
| `/cosmos/ui/cards` | CardsPage | Content container cards |
| `/cosmos/ui/carousel` | CarouselPage | Sliding content carousel |
| `/cosmos/ui/drawer` | DrawerPage | Slide-in side panels |
| `/cosmos/ui/dropdowns` | DropdownsPage | Context menus and selects |
| `/cosmos/ui/empty-state` | EmptyStatePage | No-data placeholder views |
| `/cosmos/ui/form-elements` | FormElementsPage | Inputs, selects, checkboxes |
| `/cosmos/ui/links` | LinksPage | Styled anchor variants |
| `/cosmos/ui/list` | ListPage | Structured list items |
| `/cosmos/ui/modals` | ModalsPage | Dialog overlays |
| `/cosmos/ui/notifications` | NotificationsPage | Notification feed items |
| `/cosmos/ui/otp-input` | OtpInputPage | One-time password entry |
| `/cosmos/ui/pagination` | PaginationPage | Page navigation controls |
| `/cosmos/ui/popovers` | PopoversPage | Rich hover content panels |
| `/cosmos/ui/progress-bar` | ProgressBarPage | Linear progress indicator |
| `/cosmos/ui/range-slider` | RangeSliderPage | Numeric range selector |
| `/cosmos/ui/ribbons` | RibbonsPage | Corner ribbon decorations |
| `/cosmos/ui/skeleton` | SkeletonPage | Content loading placeholders |
| `/cosmos/ui/spinners` | SpinnersPage | Loading indicators |
| `/cosmos/ui/stats-cards` | StatsCardsPage | KPI metric summary cards |
| `/cosmos/ui/stepper` | StepperPage | Multi-step wizard flow |
| `/cosmos/ui/tabs` | TabsPage | Horizontal tab switcher |
| `/cosmos/ui/tag-input` | TagInputPage | Multi-value token input |
| `/cosmos/ui/timeline` | TimelinePage | Chronological event list |
| `/cosmos/ui/toast` | ToastPage | Transient notification toasts |
| `/cosmos/ui/tooltips` | TooltipsPage | Hover information hints |

---

## Page Title

Every page must call `usePageTitle()` at the top of the component. This drives the
header title dynamically — no `ROUTE_LABELS` map editing is needed.

```tsx
import { usePageTitle } from '../contexts/PageTitleContext';

export const MyPage = () => {
  usePageTitle('My Page Title');
  // ...
};
```

---

## File Structure

```
frontend/src/cosmos/
  components/
    ui/                         (future: Modal, Drawer, Toast, Tabs as headless components)
  contexts/
    PageTitleContext.tsx         usePageTitle hook + PageTitleProvider
  layout/
    CosmosHeader.tsx            Header with notifications, theme toggle, user menu
    CosmosSidebar.tsx           Navigation sidebar with collapse support
    CosmosLayout.tsx            Main layout wrapper (sidebar + header + outlet)
  pages/
    templates/
      EmptyPage.tsx             All reusable building blocks (exported)
    ui/                         31 component demo pages
    editors/                    Topology, Rack, Template, Checks editors
    views/                      Room (v1–v10), Rack (v1–v4), Device monitoring views
    slurm/                      Slurm live views (Overview, Nodes, Alerts, Partitions, Wallboard)
    rackscope/                  Rackscope-specific component demos (Health, Alerts, Metrics, Slurm)
    UILibraryPage.tsx           UI Library hub — index of all components
  CosmosRouter.tsx              All routes under /cosmos/*
```

---

## Adding a New Demo Page

1. Create `cosmos/pages/ui/MyComponentPage.tsx` with `usePageTitle('My Component')`.
2. Export a named component: `export const MyComponentPage = () => { ... }`.
3. Import and add a `<Route>` in `CosmosRouter.tsx`:
   ```tsx
   import { MyComponentPage } from './pages/ui/MyComponentPage';
   // inside CosmosRoutes:
   <Route path="ui/my-component" element={<MyComponentPage />} />
   ```
4. Add an entry to the `CATEGORIES` array in `UILibraryPage.tsx` so it appears in the hub.

---

## Routing Convention

| Prefix | Purpose |
|--------|---------|
| `/cosmos` | Dashboard (index) |
| `/cosmos/ui/*` | Component demo pages |
| `/cosmos/templates/*` | Page template demos |
| `/cosmos/views/*` | Live monitoring views |
| `/cosmos/rackscope/*` | Rackscope-specific component demos |
| `/cosmos/slurm/*` | Slurm live views |
| `/cosmos/editors/*` | YAML editors |
| `/cosmos/settings` | Application settings |
| `/cosmos/charts` | Chart demos |
| `/cosmos/tables` | Data table demos |
| `/cosmos/auth/*` | Auth pages (no layout) |
