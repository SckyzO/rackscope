---
id: overlays
title: Overlays
sidebar_position: 5
---

# Overlays

Components for modal dialogs, drawers, tabs, and overlay UI patterns.

## Drawer

A slide-out panel for forms, details, or secondary content.

### Features

- Slides in from the right side
- Backdrop overlay
- Keyboard navigation (Escape to close)
- Composable with DrawerHeader and custom content

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Close handler |
| `children` | `ReactNode` | required | Drawer content |
| `width` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Drawer width |

### Width variants

- `sm`: 384px (24rem)
- `md`: 512px (32rem)
- `lg`: 640px (40rem)
- `xl`: 768px (48rem)

### Example

```tsx
import { Drawer, DrawerHeader } from '../../components/layout/Drawer';
import { useState } from 'react';

export const MyPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <button onClick={() => setDrawerOpen(true)}>Open Drawer</button>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width="lg">
        <DrawerHeader
          title="Edit Device"
          onClose={() => setDrawerOpen(false)}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Drawer content */}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={() => setDrawerOpen(false)}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </div>
      </Drawer>
    </>
  );
};
```

## DrawerHeader

A header component for drawers with title and close button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Drawer title |
| `subtitle` | `string` | - | Optional subtitle |
| `onClose` | `() => void` | required | Close handler |

### Example

```tsx
<DrawerHeader
  title="Rack Configuration"
  subtitle="DC1 / Room A / Aisle 01 / Rack 12"
  onClose={handleClose}
/>
```

## Drawer Composition Pattern

Drawers should follow this structure:

```tsx
<Drawer open={open} onClose={onClose} width="lg">
  {/* 1. Header */}
  <DrawerHeader title="Title" onClose={onClose} />

  {/* 2. Scrollable content */}
  <div className="flex-1 overflow-y-auto p-6 space-y-6">
    <SectionCard title="Section 1">...</SectionCard>
    <SectionCard title="Section 2">...</SectionCard>
  </div>

  {/* 3. Footer (optional) */}
  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
    <button onClick={onClose}>Cancel</button>
    <button onClick={onSave}>Save</button>
  </div>
</Drawer>
```

## Modal

A centered modal dialog for confirmations, forms, or focused tasks.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Close handler |
| `children` | `ReactNode` | required | Modal content |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Modal width |

### Example

```tsx
import { Modal, ModalHeader, ModalFooter } from '../../components/layout/Modal';
import { useState } from 'react';

export const MyPage = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setModalOpen(true)}>Open Modal</button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <ModalHeader
          title="Delete Rack"
          onClose={() => setModalOpen(false)}
        />

        <div className="p-6">
          <p>Are you sure you want to delete this rack?</p>
        </div>

        <ModalFooter>
          <button onClick={() => setModalOpen(false)}>Cancel</button>
          <button onClick={handleDelete}>Delete</button>
        </ModalFooter>
      </Modal>
    </>
  );
};
```

## ModalHeader

A header component for modals with title and close button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Modal title |
| `subtitle` | `string` | - | Optional subtitle |
| `onClose` | `() => void` | required | Close handler |

## ModalFooter

A footer component for modal actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Action buttons |

## ConfirmationModal

A specialized modal for confirmation dialogs.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Close/cancel handler |
| `onConfirm` | `() => void` | required | Confirm action handler |
| `title` | `string` | required | Modal title |
| `message` | `string \| ReactNode` | required | Confirmation message |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button text |
| `cancelLabel` | `string` | `'Cancel'` | Cancel button text |
| `variant` | `'danger' \| 'warning' \| 'primary'` | `'primary'` | Visual style |

### Example

```tsx
import { ConfirmationModal } from '../../components/layout/ConfirmationModal';
import { useState } from 'react';

export const MyPage = () => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = () => {
    // Perform deletion
    setConfirmOpen(false);
  };

  return (
    <>
      <button onClick={() => setConfirmOpen(true)}>Delete</button>

      <ConfirmationModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Rack"
        message="Are you sure you want to delete this rack? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
};
```

## Tabs

A tabbed navigation component for switching between views.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `Array<{ id: string; label: string; icon?: LucideIcon }>` | required | Tab definitions |
| `activeTab` | `string` | required | Currently active tab ID |
| `onChange` | `(id: string) => void` | required | Tab change handler |

### Example

```tsx
import { Tabs } from '../../components/layout/Tabs';
import { Server, HardDrive, Cpu } from 'lucide-react';
import { useState } from 'react';

export const MyPage = () => {
  const [activeTab, setActiveTab] = useState('compute');

  return (
    <div>
      <Tabs
        tabs={[
          { id: 'compute', label: 'Compute', icon: Server },
          { id: 'storage', label: 'Storage', icon: HardDrive },
          { id: 'processors', label: 'Processors', icon: Cpu },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'compute' && <div>Compute content</div>}
      {activeTab === 'storage' && <div>Storage content</div>}
      {activeTab === 'processors' && <div>Processor content</div>}
    </div>
  );
};
```

## Backdrop

A background overlay for modals and drawers (automatically used by Modal/Drawer components).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Controls visibility |
| `onClick` | `() => void` | - | Click handler (for dismissing) |

### Example

```tsx
import { Backdrop } from '../../components/layout/Backdrop';

<Backdrop open={open} onClick={onClose} />
```

## Overlay patterns

### Form drawer

```tsx
<Drawer open={open} onClose={onClose} width="lg">
  <DrawerHeader title="Add Device" onClose={onClose} />

  <div className="flex-1 overflow-y-auto p-6 space-y-6">
    <SectionCard title="Basic Information">
      <FormRow label="Device Name">
        <input type="text" value={name} onChange={e => setName(e.target.value)} />
      </FormRow>
      <FormRow label="Template">
        <SelectInput options={templates} value={template} onChange={setTemplate} />
      </FormRow>
    </SectionCard>

    <SectionCard title="Configuration">
      {/* More form fields */}
    </SectionCard>
  </div>

  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
    <button onClick={onClose}>Cancel</button>
    <button onClick={handleSave}>Save</button>
  </div>
</Drawer>
```

### Confirmation modal

```tsx
<ConfirmationModal
  open={confirmDelete}
  onClose={() => setConfirmDelete(false)}
  onConfirm={handleDelete}
  title="Delete Device"
  message={
    <>
      <p>Are you sure you want to delete <strong>{device.name}</strong>?</p>
      <p className="text-sm text-gray-500 mt-2">
        This will also remove all associated instances and metrics.
      </p>
    </>
  }
  confirmLabel="Delete"
  variant="danger"
/>
```

### Tabbed content

```tsx
<div className="space-y-6">
  <Tabs
    tabs={[
      { id: 'overview', label: 'Overview' },
      { id: 'metrics', label: 'Metrics' },
      { id: 'alerts', label: 'Alerts' },
    ]}
    activeTab={activeTab}
    onChange={setActiveTab}
  />

  {activeTab === 'overview' && <OverviewTab />}
  {activeTab === 'metrics' && <MetricsTab />}
  {activeTab === 'alerts' && <AlertsTab />}
</div>
```

### Multi-step form drawer

```tsx
<Drawer open={open} onClose={onClose} width="xl">
  <DrawerHeader title="Setup Wizard" subtitle={`Step ${step} of 3`} onClose={onClose} />

  <div className="flex-1 overflow-y-auto p-6">
    {step === 1 && <Step1 />}
    {step === 2 && <Step2 />}
    {step === 3 && <Step3 />}
  </div>

  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
    <button onClick={handlePrevious} disabled={step === 1}>
      Previous
    </button>
    <div className="flex gap-3">
      <button onClick={onClose}>Cancel</button>
      {step < 3 ? (
        <button onClick={handleNext}>Next</button>
      ) : (
        <button onClick={handleFinish}>Finish</button>
      )}
    </div>
  </div>
</Drawer>
```
