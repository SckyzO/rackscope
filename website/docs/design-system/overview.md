---
id: overview
title: Design System Overview
sidebar_position: 1
---

# Design System Overview

Rackscope uses a shared component library located in `frontend/src/app/components/`. All pages should use these components instead of writing inline patterns.

## Reference page

Navigate to `/templates/default` in the app to see all components rendered with all variants and states.

## Component categories

| Category | Path | Components |
|---|---|---|
| **Layout** | `components/layout/` | PageHeader, PageBreadcrumb, SectionCard, Drawer, DrawerHeader, Modal, Tabs, Backdrop, ConfirmationModal |
| **Actions** | `components/` | PageActionButton, PageActionIconButton, RefreshButton, useAutoRefresh |
| **Forms** | `components/forms/` | SearchInput, SegmentedControl, FilterPills, ToggleSwitch, NumberInput, StepperInput, FormRow |
| **UI Primitives** | `components/ui/` | Spinner, SectionLabel, StatusPill, StatusDot, IconBox, AlertBanner, SelectInput, Tooltip, TooltipHelp, StatefulSaveButton, UnsavedIndicator |
| **Data** | `components/data/` | KpiCard |
| **Feedback** | `components/feedback/` | LoadingState, EmptyState, ErrorState |

## Quick start — new page

```tsx
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';
import { RefreshButton, useAutoRefresh } from '../../components/RefreshButton';
import { PageActionButton } from '../../components/PageActionButton';
import { usePageTitle } from '../../hooks/usePageTitle';
import { SlidersHorizontal } from 'lucide-react';

export const MyPage = () => {
  usePageTitle('My Page');
  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('my-page', loadData);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Page"
        breadcrumb={<PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Page' }]} />}
        actions={
          <>
            <PageActionButton icon={SlidersHorizontal}>Configure</PageActionButton>
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

## Design principles

1. **Consistency**: Use shared components instead of reinventing patterns
2. **Dark mode first**: All components support dark mode as primary theme
3. **Accessibility**: Components include ARIA attributes and keyboard navigation
4. **Performance**: Components are optimized with React.memo where appropriate
5. **Composability**: Components are designed to work together

## Import paths

All components are exported from their respective directories:

```tsx
// Layout
import { PageHeader, SectionCard, Drawer } from '../../components/layout';

// Actions
import { PageActionButton, RefreshButton } from '../../components';

// Forms
import { SearchInput, SegmentedControl } from '../../components/forms';

// UI
import { StatusPill, Spinner, Tooltip } from '../../components/ui';

// Feedback
import { LoadingState, EmptyState } from '../../components/feedback';

// Data
import { KpiCard } from '../../components/data';
```

## Next steps

- [Page Actions](./page-actions.md) - Buttons, refresh controls, auto-refresh
- [Forms](./forms.md) - Input controls, filters, toggles
- [Status](./status.md) - Pills, dots, labels, alerts
- [Overlays](./overlays.md) - Drawers, modals, tabs
- [Feedback](./feedback.md) - Loading, empty, error states
