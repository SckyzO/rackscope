---
id: overview
title: Design System
sidebar_position: 1
---

# Design System

Rackscope uses a shared component library located in `frontend/src/app/components/`. All pages use these components to ensure visual consistency across the application.

## Live showcase

Navigate to **`/templates/default`** (or **UI Library** in the sidebar) to see every component rendered with all its variants and states — buttons, forms, status indicators, overlays, feedback states, and more.

![UI Library — Component Showcase](/img/screenshots/2k-ui-library.png)

The showcase page is the authoritative reference for any component: it shows real usage, all size variants, dark/light mode rendering, and interactive states.

---

## Component categories

| Category | Path | Key components |
|---|---|---|
| **Layout** | `components/layout/` | `PageHeader`, `PageBreadcrumb`, `SectionCard`, `Drawer`, `DrawerHeader`, `Modal`, `Tabs`, `ConfirmationModal` |
| **Actions** | `components/` | `PageActionButton`, `PageActionIconButton`, `RefreshButton`, `useAutoRefresh` |
| **Forms** | `components/forms/` | `FormRow`, `SearchInput`, `SegmentedControl`, `FilterPills`, `ToggleSwitch`, `NumberInput`, `StepperInput` |
| **UI Primitives** | `components/ui/` | `StatusPill`, `StatusDot`, `IconBox`, `AlertBanner`, `SelectInput`, `Tooltip`, `TooltipHelp`, `KpiCard`, `StatefulSaveButton` |
| **Feedback** | `components/feedback/` | `LoadingState`, `EmptyState`, `ErrorState` |

---

## Quick-start — new page

```tsx
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';
import { RefreshButton, useAutoRefresh } from '../../components/RefreshButton';
import { PageActionIconButton } from '../../components/PageActionButton';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { SlidersHorizontal } from 'lucide-react';

export const MyPage = () => {
  usePageTitle('My Page');
  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('my-page', loadData);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Page"
        breadcrumb={
          <PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Page' }]} />
        }
        actions={
          <>
            <PageActionIconButton icon={SlidersHorizontal} title="Settings" onClick={openSettings} />
            <RefreshButton
              refreshing={loading}
              autoRefreshMs={autoRefreshMs}
              onRefresh={loadData}
              onIntervalChange={onIntervalChange}
            />
          </>
        }
      />
      <SectionCard title="Content">...</SectionCard>
    </div>
  );
};
```

---

## Design principles

1. **Dark mode first** — all components render correctly in dark mode (the default for NOC environments)
2. **Consistency** — use shared components, never reinvent inline patterns
3. **Composability** — components are designed to work together (`FormRow` + `ToggleSwitch`, `SectionCard` + `KpiCard`, etc.)
4. **Accessibility** — ARIA attributes, keyboard navigation, focus states throughout
