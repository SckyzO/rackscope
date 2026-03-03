---
id: status
title: Status & Indicators
sidebar_position: 4
---

# Status & Indicators

Components for displaying status, labels, alerts, and visual indicators.

## Health Status Colors

Rackscope uses a consistent color system for health states:

| State | Color | Hex | Usage |
|-------|-------|-----|-------|
| **OK** | Green | `#10b981` | All checks passing |
| **WARN** | Orange | `#f59e0b` | At least one warning-level check fails |
| **CRIT** | Red | `#ef4444` | At least one critical-level check fails |
| **UNKNOWN** | Gray | `#6b7280` | No data or check error |

## StatusPill

A pill-shaped status indicator with text label.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `'OK' \| 'WARN' \| 'CRIT' \| 'UNKNOWN'` | required | Health status |
| `label` | `string` | - | Optional custom label (defaults to status text) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |

### Example

```tsx
import { StatusPill } from '../../components/ui/StatusPill';

<StatusPill status="OK" />
<StatusPill status="WARN" label="2 warnings" />
<StatusPill status="CRIT" size="lg" />
<StatusPill status="UNKNOWN" />
```

### Size variants

- `sm`: Compact size for dense layouts
- `md`: Default size for most uses
- `lg`: Prominent size for headers/cards

## StatusDot

A small circular status indicator (no text).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `'OK' \| 'WARN' \| 'CRIT' \| 'UNKNOWN'` | required | Health status |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `pulse` | `boolean` | `false` | Enable pulsing animation |

### Example

```tsx
import { StatusDot } from '../../components/ui/StatusDot';

<StatusDot status="OK" />
<StatusDot status="CRIT" pulse />
<StatusDot status="WARN" size="lg" />
```

### Usage patterns

**With text label:**
```tsx
<div className="flex items-center gap-2">
  <StatusDot status="OK" />
  <span>compute001</span>
</div>
```

**Pulsing for active alerts:**
```tsx
<StatusDot status="CRIT" pulse />
```

## SectionLabel

A label for section headings or group titles.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Label text |
| `icon` | `LucideIcon` | - | Optional leading icon |

### Example

```tsx
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Server } from 'lucide-react';

<SectionLabel icon={Server}>Compute Nodes</SectionLabel>
<SectionLabel>Storage Arrays</SectionLabel>
```

## IconBox

A colored box for icons with background.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | required | Lucide icon component |
| `variant` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'neutral'` | `'primary'` | Color variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |

### Example

```tsx
import { IconBox } from '../../components/ui/IconBox';
import { Server, AlertTriangle, CheckCircle } from 'lucide-react';

<IconBox icon={Server} variant="primary" />
<IconBox icon={AlertTriangle} variant="warning" />
<IconBox icon={CheckCircle} variant="success" size="lg" />
```

### Variants

- `primary`: Accent color background
- `success`: Green background (for OK status)
- `warning`: Orange background (for WARN status)
- `danger`: Red background (for CRIT status)
- `neutral`: Gray background (for info/unknown)

## AlertBanner

A banner for page-level alerts and notifications.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` | Alert type |
| `title` | `string` | - | Optional title |
| `children` | `ReactNode` | required | Alert message |
| `onDismiss` | `() => void` | - | Optional dismiss handler (shows × button) |

### Example

```tsx
import { AlertBanner } from '../../components/ui/AlertBanner';

<AlertBanner variant="warning" title="Configuration Warning">
  Some racks have no health checks configured.
</AlertBanner>

<AlertBanner variant="danger" onDismiss={handleDismiss}>
  Failed to connect to Prometheus server.
</AlertBanner>

<AlertBanner variant="success">
  Configuration saved successfully.
</AlertBanner>

<AlertBanner variant="info">
  Demo mode is enabled. Data is simulated.
</AlertBanner>
```

## Tooltip

A hoverable tooltip for additional context.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string \| ReactNode` | required | Tooltip content |
| `children` | `ReactNode` | required | Element to attach tooltip to |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip position |
| `delay` | `number` | `200` | Show delay in milliseconds |

### Example

```tsx
import { Tooltip } from '../../components/ui/Tooltip';

<Tooltip content="Click to edit">
  <button>Edit</button>
</Tooltip>

<Tooltip content="This is a complex multi-line tooltip with more information" placement="right">
  <InfoIcon />
</Tooltip>
```

## TooltipHelp

A question mark icon with tooltip (for inline help).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string \| ReactNode` | required | Help text |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip position |

### Example

```tsx
import { TooltipHelp } from '../../components/ui/TooltipHelp';

<div className="flex items-center gap-2">
  <span>Refresh Interval</span>
  <TooltipHelp content="How often the page data is refreshed automatically" />
</div>
```

## Spinner

A loading spinner.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `variant` | `'primary' \| 'white'` | `'primary'` | Color variant |

### Example

```tsx
import { Spinner } from '../../components/ui/Spinner';

<Spinner />
<Spinner size="lg" />
<Spinner variant="white" /> {/* For dark backgrounds */}
```

## Status patterns

### Device card with status

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <IconBox icon={Server} variant="primary" />
    <div>
      <div className="font-medium">compute001</div>
      <div className="text-sm text-gray-500">Dell PowerEdge R740</div>
    </div>
  </div>
  <StatusPill status="OK" />
</div>
```

### List item with status dot

```tsx
<div className="flex items-center gap-2">
  <StatusDot status="WARN" />
  <span className="font-medium">rack-dc1-a01-r12</span>
  <span className="text-sm text-gray-500">2 warnings</span>
</div>
```

### Section with label

```tsx
<div className="space-y-4">
  <SectionLabel icon={Server}>Compute Nodes</SectionLabel>
  <div className="grid grid-cols-3 gap-4">
    {/* Node cards */}
  </div>
</div>
```

### Alert with action

```tsx
<AlertBanner
  variant="warning"
  title="Missing Configuration"
  onDismiss={handleDismiss}
>
  <div className="space-y-2">
    <p>Some devices are missing health check definitions.</p>
    <button className="text-sm underline">Configure now</button>
  </div>
</AlertBanner>
```

### Help text with tooltip

```tsx
<FormRow
  label={
    <div className="flex items-center gap-2">
      <span>Cache TTL</span>
      <TooltipHelp content="How long Prometheus query results are cached" />
    </div>
  }
>
  <StepperInput value={ttl} onChange={setTtl} suffix="s" />
</FormRow>
```

### Loading indicator

```tsx
{loading ? (
  <div className="flex items-center gap-2">
    <Spinner size="sm" />
    <span>Loading data...</span>
  </div>
) : (
  <div>{/* Content */}</div>
)}
```
