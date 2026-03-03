---
id: feedback
title: Feedback States
sidebar_position: 6
---

# Feedback States

Components for loading, empty, error states, and save feedback.

## LoadingState

A centered loading indicator with optional message.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | `'Loading...'` | Loading message |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Spinner size |

### Example

```tsx
import { LoadingState } from '../../components/feedback/LoadingState';

export const MyPage = () => {
  if (loading) {
    return <LoadingState message="Loading rooms..." />;
  }

  return <div>{/* Content */}</div>;
};
```

### Usage patterns

**Full page loading:**
```tsx
{loading && <LoadingState message="Loading topology..." size="lg" />}
```

**Section loading:**
```tsx
<SectionCard title="Devices">
  {loading ? (
    <LoadingState message="Loading devices..." size="sm" />
  ) : (
    <DeviceList devices={devices} />
  )}
</SectionCard>
```

## EmptyState

A centered message for empty data states with optional action.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | - | Optional icon |
| `title` | `string` | required | Empty state title |
| `message` | `string` | - | Optional description |
| `action` | `ReactNode` | - | Optional action button |

### Example

```tsx
import { EmptyState } from '../../components/feedback/EmptyState';
import { Inbox } from 'lucide-react';

export const MyPage = () => {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No items found"
        message="Get started by adding your first item."
        action={
          <button onClick={handleAdd}>
            Add Item
          </button>
        }
      />
    );
  }

  return <div>{/* Content */}</div>;
};
```

### Usage patterns

**No search results:**
```tsx
<EmptyState
  icon={SearchX}
  title="No results found"
  message={`No items match "${searchQuery}"`}
  action={
    <button onClick={() => setSearchQuery('')}>
      Clear search
    </button>
  }
/>
```

**Empty list with action:**
```tsx
<EmptyState
  icon={FolderOpen}
  title="No racks configured"
  message="Add your first rack to get started."
  action={
    <PageActionButton variant="primary" icon={Plus} onClick={handleAddRack}>
      Add Rack
    </PageActionButton>
  }
/>
```

**Empty with multiple actions:**
```tsx
<EmptyState
  icon={FileQuestion}
  title="No data available"
  message="Import existing configuration or create a new one."
  action={
    <div className="flex gap-3">
      <button onClick={handleImport}>Import</button>
      <button onClick={handleCreate}>Create New</button>
    </div>
  }
/>
```

## ErrorState

A centered error message with optional retry action.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Error'` | Error title |
| `message` | `string` | required | Error message |
| `error` | `Error` | - | Optional error object (for details) |
| `onRetry` | `() => void` | - | Optional retry handler |

### Example

```tsx
import { ErrorState } from '../../components/feedback/ErrorState';

export const MyPage = () => {
  if (error) {
    return (
      <ErrorState
        title="Failed to load data"
        message="Unable to fetch room information from the server."
        error={error}
        onRetry={handleRetry}
      />
    );
  }

  return <div>{/* Content */}</div>;
};
```

### Usage patterns

**API error with retry:**
```tsx
<ErrorState
  title="Connection Failed"
  message="Failed to connect to Prometheus server."
  onRetry={loadData}
/>
```

**Error with details:**
```tsx
<ErrorState
  title="Configuration Error"
  message="Invalid topology configuration detected."
  error={new Error('Missing required field: site.id')}
/>
```

**Section error:**
```tsx
<SectionCard title="Metrics">
  {error ? (
    <ErrorState
      title="Failed to load metrics"
      message={error.message}
      onRetry={loadMetrics}
    />
  ) : (
    <MetricsChart data={data} />
  )}
</SectionCard>
```

## StatefulSaveButton

A save button with 5 states: idle, dirty, saving, saved, error.

### States

| State | Label | Icon | Description |
|-------|-------|------|-------------|
| `idle` | Save | - | Default state, button disabled |
| `dirty` | Save | - | Unsaved changes, button enabled |
| `saving` | Saving... | Spinner | Save in progress |
| `saved` | Saved | Check | Save successful (auto-revert to idle) |
| `error` | Retry | AlertCircle | Save failed |

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `state` | `'idle' \| 'dirty' \| 'saving' \| 'saved' \| 'error'` | required | Current state |
| `onClick` | `() => void` | required | Save handler |
| `disabled` | `boolean` | `false` | Additional disabled state |

### Example

```tsx
import { StatefulSaveButton } from '../../components/ui/StatefulSaveButton';
import { useState, useEffect } from 'react';

export const EditorPage = () => {
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    // Mark as dirty when content changes
    if (content !== originalContent) {
      setSaveState('dirty');
    } else {
      setSaveState('idle');
    }
  }, [content]);

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await saveContent(content);
      setSaveState('saved');
      // Auto-revert to idle after 2s
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      setSaveState('error');
    }
  };

  return (
    <div>
      <textarea value={content} onChange={e => setContent(e.target.value)} />
      <StatefulSaveButton state={saveState} onClick={handleSave} />
    </div>
  );
};
```

### State transitions

```
idle → (content changes) → dirty
dirty → (save clicked) → saving
saving → (success) → saved → (2s delay) → idle
saving → (failure) → error
error → (retry clicked) → saving
```

## UnsavedIndicator

A visual indicator for unsaved changes (dot + text).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | required | Controls visibility |

### Example

```tsx
import { UnsavedIndicator } from '../../components/ui/UnsavedIndicator';

<PageHeader
  title={
    <div className="flex items-center gap-2">
      <span>Topology Editor</span>
      <UnsavedIndicator visible={hasUnsavedChanges} />
    </div>
  }
  actions={
    <StatefulSaveButton state={saveState} onClick={handleSave} />
  }
/>
```

### Usage patterns

**With page title:**
```tsx
<PageHeader
  title={
    <div className="flex items-center gap-2">
      <span>Configuration</span>
      <UnsavedIndicator visible={isDirty} />
    </div>
  }
/>
```

**With tab label:**
```tsx
<Tabs
  tabs={[
    {
      id: 'topology',
      label: (
        <div className="flex items-center gap-2">
          <span>Topology</span>
          <UnsavedIndicator visible={topologyDirty} />
        </div>
      ),
    },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

## Feedback patterns

### Loading → Content → Error

```tsx
export const MyPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data');
      setData(await response.json());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading data..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load data"
        message={error.message}
        onRetry={loadData}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No data available"
        message="Get started by adding your first item."
        action={<button onClick={handleAdd}>Add Item</button>}
      />
    );
  }

  return <div>{/* Render data */}</div>;
};
```

### Editor with save state

```tsx
export const EditorPage = () => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');

  const isDirty = content !== originalContent;

  useEffect(() => {
    setSaveState(isDirty ? 'dirty' : 'idle');
  }, [isDirty]);

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await saveContent(content);
      setOriginalContent(content);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      setSaveState('error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span>Editor</span>
            <UnsavedIndicator visible={isDirty} />
          </div>
        }
        actions={
          <StatefulSaveButton state={saveState} onClick={handleSave} />
        }
      />

      <SectionCard title="Content">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full h-64"
        />
      </SectionCard>
    </div>
  );
};
```

### Section with conditional states

```tsx
<SectionCard title="Recent Activity">
  {loading ? (
    <LoadingState message="Loading activity..." size="sm" />
  ) : error ? (
    <ErrorState
      title="Failed to load activity"
      message={error.message}
      onRetry={loadActivity}
    />
  ) : activities.length === 0 ? (
    <EmptyState
      icon={Activity}
      title="No recent activity"
      message="Activity will appear here when actions are performed."
    />
  ) : (
    <ActivityList activities={activities} />
  )}
</SectionCard>
```

### Unsaved changes warning

```tsx
export const EditorPage = () => {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <div>
      <UnsavedIndicator visible={isDirty} />
      {/* Editor content */}
    </div>
  );
};
```
