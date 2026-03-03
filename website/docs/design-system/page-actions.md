---
id: page-actions
title: Page Actions
sidebar_position: 2
---

# Page Actions

Page actions are buttons and controls that appear in the header or prominent locations of a page. They trigger primary actions or configuration changes.

## PageActionButton

A button component for page-level actions with icon support.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Button text label |
| `icon` | `LucideIcon` | - | Optional Lucide icon component |
| `variant` | `'outline' \| 'primary' \| 'brand-outline' \| 'danger-outline'` | `'outline'` | Visual style variant |
| `onClick` | `() => void` | - | Click handler |
| `disabled` | `boolean` | `false` | Disabled state |

### Variants

#### `outline` (default)
Neutral action with border. Use for secondary actions.

```tsx
<PageActionButton icon={Settings}>Configure</PageActionButton>
```

#### `primary`
Solid background. Use for primary page actions.

```tsx
<PageActionButton variant="primary" icon={Plus}>Add Rack</PageActionButton>
```

#### `brand-outline`
Accent-colored border. Use for feature-specific actions.

```tsx
<PageActionButton variant="brand-outline" icon={Download}>Export</PageActionButton>
```

#### `danger-outline`
Red border. Use for destructive actions.

```tsx
<PageActionButton variant="danger-outline" icon={Trash2}>Delete All</PageActionButton>
```

### Example

```tsx
import { PageActionButton } from '../../components/PageActionButton';
import { Settings, Plus, Download } from 'lucide-react';

export const MyPage = () => {
  return (
    <PageHeader
      title="My Page"
      actions={
        <>
          <PageActionButton icon={Settings}>Settings</PageActionButton>
          <PageActionButton variant="primary" icon={Plus}>Add Item</PageActionButton>
          <PageActionButton variant="brand-outline" icon={Download}>Export</PageActionButton>
        </>
      }
    />
  );
};
```

## PageActionIconButton

Icon-only button for page actions. Uses the same variant system as PageActionButton.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | required | Lucide icon component |
| `variant` | `'outline' \| 'primary' \| 'brand-outline' \| 'danger-outline'` | `'outline'` | Visual style variant |
| `onClick` | `() => void` | - | Click handler |
| `title` | `string` | - | Tooltip text (for accessibility) |
| `disabled` | `boolean` | `false` | Disabled state |

### Example

```tsx
import { PageActionIconButton } from '../../components/PageActionIconButton';
import { Settings, Plus } from 'lucide-react';

<PageActionIconButton icon={Settings} title="Settings" />
<PageActionIconButton variant="primary" icon={Plus} title="Add new" />
```

## RefreshButton

A split button that combines manual refresh with auto-refresh interval selection.

### Features

- Left side: Manual refresh button (with spinner during refresh)
- Right side: Dropdown menu for auto-refresh intervals (Off, 5s, 10s, 30s, 60s)
- Persists interval selection to localStorage
- Integrates with `useAutoRefresh` hook

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `refreshing` | `boolean` | `false` | Shows spinner on button |
| `autoRefreshMs` | `number \| null` | `null` | Current interval (milliseconds) |
| `onRefresh` | `() => void` | required | Manual refresh handler |
| `onIntervalChange` | `(ms: number \| null) => void` | required | Interval change handler |
| `disabled` | `boolean` | `false` | Disabled state |

### Example

```tsx
import { RefreshButton, useAutoRefresh } from '../../components/RefreshButton';
import { useState } from 'react';

export const MyPage = () => {
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch data
    } finally {
      setLoading(false);
    }
  };

  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('my-page', loadData);

  return (
    <PageHeader
      title="My Page"
      actions={
        <RefreshButton
          refreshing={loading}
          autoRefreshMs={autoRefreshMs}
          onRefresh={loadData}
          onIntervalChange={onIntervalChange}
        />
      }
    />
  );
};
```

## useAutoRefresh

A React hook that manages auto-refresh intervals with localStorage persistence.

### Signature

```tsx
useAutoRefresh(
  pageKey: string,
  callback: () => void | Promise<void>
): {
  autoRefreshMs: number | null;
  onIntervalChange: (ms: number | null) => void;
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageKey` | `string` | Unique key for localStorage persistence (e.g., `'rack-view'`, `'room-state'`) |
| `callback` | `() => void \| Promise<void>` | Function to call on each interval tick |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `autoRefreshMs` | `number \| null` | Current refresh interval in milliseconds (null = off) |
| `onIntervalChange` | `(ms: number \| null) => void` | Handler to change the interval |

### Behavior

- Stores interval preference in localStorage as `rackscope.autoRefresh.{pageKey}`
- Starts interval automatically if a value is stored
- Cleans up interval on unmount
- Supports async callbacks (awaits completion before scheduling next tick)

### Example

```tsx
import { useAutoRefresh } from '../../components/RefreshButton';
import { useEffect, useState } from 'react';

export const MyPage = () => {
  const [data, setData] = useState(null);

  const loadData = async () => {
    const response = await fetch('/api/data');
    setData(await response.json());
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh with persistence
  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('my-page', loadData);

  return (
    <div>
      <RefreshButton
        refreshing={false}
        autoRefreshMs={autoRefreshMs}
        onRefresh={loadData}
        onIntervalChange={onIntervalChange}
      />
      {/* Render data */}
    </div>
  );
};
```

## Layout patterns

### Standard page header with actions

```tsx
<PageHeader
  title="Room Overview"
  breadcrumb={
    <PageBreadcrumb
      items={[
        { label: 'Home', href: '/' },
        { label: 'Rooms', href: '/rooms' },
        { label: room.name },
      ]}
    />
  }
  actions={
    <>
      <PageActionButton icon={Settings}>Configure</PageActionButton>
      <PageActionButton variant="primary" icon={Plus}>Add Rack</PageActionButton>
      <RefreshButton
        refreshing={loading}
        autoRefreshMs={autoRefreshMs}
        onRefresh={loadData}
        onIntervalChange={onIntervalChange}
      />
    </>
  }
/>
```

### Minimal header (no actions)

```tsx
<PageHeader
  title="Static Page"
  breadcrumb={<PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Static' }]} />}
/>
```

### Header with icon buttons

```tsx
<PageHeader
  title="Quick Actions"
  actions={
    <>
      <PageActionIconButton icon={Settings} title="Settings" />
      <PageActionIconButton icon={Download} title="Export" />
      <PageActionIconButton variant="primary" icon={Plus} title="Add" />
    </>
  }
/>
```
