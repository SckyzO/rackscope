---
id: forms
title: Forms
sidebar_position: 3
---

# Forms

Form components for user input, filters, and controls.

## SearchInput

A text input field with search icon and clear button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | required | Controlled input value |
| `onChange` | `(value: string) => void` | required | Value change handler |
| `placeholder` | `string` | `'Search...'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |

### Example

```tsx
import { SearchInput } from '../../components/forms/SearchInput';
import { useState } from 'react';

export const MyPage = () => {
  const [search, setSearch] = useState('');

  return (
    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder="Search racks..."
    />
  );
};
```

## SegmentedControl

A toggle control for switching between multiple options (like tabs, but inline).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | required | Currently selected value |
| `onChange` | `(value: string) => void` | required | Selection change handler |
| `options` | `Array<{ value: string; label: string }>` | required | Available options |
| `fullWidth` | `boolean` | `false` | Expand to container width |

### Example

```tsx
import { SegmentedControl } from '../../components/forms/SegmentedControl';
import { useState } from 'react';

export const MyPage = () => {
  const [view, setView] = useState('grid');

  return (
    <SegmentedControl
      value={view}
      onChange={setView}
      options={[
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
        { value: 'table', label: 'Table' },
      ]}
    />
  );
};
```

## FilterPills

A filter component with icon prefix and removable pills for active filters.

### Features

- Icon prefix cell (non-clickable, visual indicator)
- Pills display active filters
- Each pill has a remove button (×)
- Supports custom pill rendering

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | required | Icon displayed in prefix cell |
| `filters` | `Array<{ id: string; label: string }>` | required | Active filters |
| `onRemove` | `(id: string) => void` | required | Handler when filter is removed |
| `onClear` | `() => void` | - | Optional handler to clear all filters |

### Example

```tsx
import { FilterPills } from '../../components/forms/FilterPills';
import { Filter } from 'lucide-react';
import { useState } from 'react';

export const MyPage = () => {
  const [filters, setFilters] = useState([
    { id: 'status-crit', label: 'Status: CRIT' },
    { id: 'type-server', label: 'Type: Server' },
  ]);

  const handleRemove = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const handleClear = () => {
    setFilters([]);
  };

  return (
    <FilterPills
      icon={Filter}
      filters={filters}
      onRemove={handleRemove}
      onClear={handleClear}
    />
  );
};
```

## ToggleSwitch

A toggle switch for boolean settings (on/off).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | required | Current state |
| `onChange` | `(checked: boolean) => void` | required | State change handler |
| `label` | `string` | - | Optional label text |
| `disabled` | `boolean` | `false` | Disabled state |

### Example

```tsx
import { ToggleSwitch } from '../../components/forms/ToggleSwitch';
import { useState } from 'react';

export const MyPage = () => {
  const [enabled, setEnabled] = useState(false);

  return (
    <ToggleSwitch
      checked={enabled}
      onChange={setEnabled}
      label="Enable feature"
    />
  );
};
```

## NumberInput

A numeric input with external increment/decrement buttons (−/+ style).

### Features

- Minus (−) button on the left
- Text input in the center
- Plus (+) button on the right
- Min/max value constraints
- Step support

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | required | Current value |
| `onChange` | `(value: number) => void` | required | Value change handler |
| `min` | `number` | - | Minimum value |
| `max` | `number` | - | Maximum value |
| `step` | `number` | `1` | Increment/decrement step |
| `disabled` | `boolean` | `false` | Disabled state |

### Example

```tsx
import { NumberInput } from '../../components/forms/NumberInput';
import { useState } from 'react';

export const MyPage = () => {
  const [count, setCount] = useState(10);

  return (
    <NumberInput
      value={count}
      onChange={setCount}
      min={0}
      max={100}
      step={5}
    />
  );
};
```

## StepperInput

A numeric input with internal increment/decrement arrows (settings-style).

### Features

- Text input with arrows on the right edge (inside the input)
- Up/down arrow buttons integrated into the field
- Min/max value constraints
- Step support

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | required | Current value |
| `onChange` | `(value: number) => void` | required | Value change handler |
| `min` | `number` | - | Minimum value |
| `max` | `number` | - | Maximum value |
| `step` | `number` | `1` | Increment/decrement step |
| `disabled` | `boolean` | `false` | Disabled state |
| `suffix` | `string` | - | Optional suffix (e.g., 's', 'ms') |

### Example

```tsx
import { StepperInput } from '../../components/forms/StepperInput';
import { useState } from 'react';

export const SettingsPage = () => {
  const [timeout, setTimeout] = useState(30);

  return (
    <StepperInput
      value={timeout}
      onChange={setTimeout}
      min={1}
      max={120}
      step={1}
      suffix="s"
    />
  );
};
```

## FormRow

A layout component for settings forms with label/description on the left and control on the right.

### Features

- Two-column layout (label/description left, control right)
- Use with `divide-y` bordered container for settings pages
- Responsive stacking on small screens

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Setting label |
| `description` | `string` | - | Optional description text |
| `children` | `ReactNode` | required | Control element (input, toggle, etc.) |

### Example

```tsx
import { FormRow } from '../../components/forms/FormRow';
import { ToggleSwitch } from '../../components/forms/ToggleSwitch';
import { StepperInput } from '../../components/forms/StepperInput';
import { useState } from 'react';

export const SettingsPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [timeout, setTimeout] = useState(30);

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700 border rounded-lg">
      <FormRow
        label="Dark Mode"
        description="Enable dark theme for the interface"
      >
        <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
      </FormRow>

      <FormRow
        label="Timeout"
        description="Request timeout in seconds"
      >
        <StepperInput
          value={timeout}
          onChange={setTimeout}
          min={1}
          max={120}
          suffix="s"
        />
      </FormRow>
    </div>
  );
};
```

## Form patterns

### Search and filter bar

```tsx
<div className="flex items-center gap-4">
  <SearchInput
    value={search}
    onChange={setSearch}
    placeholder="Search devices..."
  />
  <SegmentedControl
    value={view}
    onChange={setView}
    options={[
      { value: 'grid', label: 'Grid' },
      { value: 'list', label: 'List' },
    ]}
  />
</div>

{filters.length > 0 && (
  <FilterPills
    icon={Filter}
    filters={filters}
    onRemove={handleRemoveFilter}
    onClear={handleClearFilters}
  />
)}
```

### Settings form

```tsx
<SectionCard title="General Settings">
  <div className="divide-y divide-gray-200 dark:divide-gray-700 border rounded-lg">
    <FormRow label="Dark Mode" description="Use dark theme">
      <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
    </FormRow>
    <FormRow label="Auto-refresh" description="Refresh interval">
      <StepperInput
        value={interval}
        onChange={setInterval}
        min={5}
        max={300}
        suffix="s"
      />
    </FormRow>
    <FormRow label="Items per page" description="Number of items to display">
      <NumberInput
        value={perPage}
        onChange={setPerPage}
        min={10}
        max={100}
        step={10}
      />
    </FormRow>
  </div>
</SectionCard>
```

### Numeric input comparison

**Use NumberInput (−/+) for:**
- Quantity selectors (cart, inventory)
- Counters
- Standalone numeric fields

**Use StepperInput (↑/↓) for:**
- Settings panels
- Configuration forms
- Fields with units (seconds, pixels, etc.)
