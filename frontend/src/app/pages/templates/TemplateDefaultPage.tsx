/**
 * TemplateDefaultPage — Visual showcase of ALL shared components
 *
 * Route: /templates/default
 *
 * Use this page to review and validate the design of every shared component.
 * Each section shows a component with all its variants and states.
 */

import { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  Download,
  Server,
  Cpu,
  LayoutDashboard,
  Activity,
  Filter,
  Settings,
  Bell,
  User,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

// Actions
import { RefreshButton, useAutoRefresh } from '../../components/RefreshButton';
import { PageActionButton, PageActionIconButton } from '../../components/PageActionButton';

// New components
import { FormRow } from '../../components/forms/FormRow';
import { NumberInput } from '../../components/forms/NumberInput';
import { StatefulSaveButton, type SaveState } from '../../components/ui/StatefulSaveButton';
import { UnsavedIndicator } from '../../components/ui/UnsavedIndicator';
import { ConfirmationModal } from '../../components/layout/ConfirmationModal';

// UI primitives
import { Spinner } from '../../components/ui/Spinner';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { StatusPill } from '../../components/ui/StatusPill';
import { StatusDot } from '../../components/ui/StatusDot';
import { IconBox } from '../../components/ui/IconBox';
import { AlertBanner } from '../../components/ui/AlertBanner';
import { SelectInput } from '../../components/ui/SelectInput';

// Forms
import { SearchInput } from '../../components/forms/SearchInput';
import { SegmentedControl } from '../../components/forms/SegmentedControl';
import { FilterPills } from '../../components/forms/FilterPills';
import { ToggleSwitch } from '../../components/forms/ToggleSwitch';

// Data
import { KpiCard } from '../../components/data/KpiCard';

// Layout
import { Backdrop } from '../../components/layout/Backdrop';
import { DrawerHeader } from '../../components/layout/DrawerHeader';
import { Drawer } from '../../components/layout/Drawer';
import { Modal, ModalHeader, ModalFooter } from '../../components/layout/Modal';
import { Tabs } from '../../components/layout/Tabs';

// Feedback
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';

// ── Helpers ───────────────────────────────────────────────────────────────────

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const TemplateDefaultPage = () => {
  usePageTitle('Component Showcase');

  // Actions demo
  const [demoRefreshing, setDemoRefreshing] = useState(false);
  const fakeRefresh = () => {
    setDemoRefreshing(true);
    setTimeout(() => setDemoRefreshing(false), 1200);
  };
  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('showcase-demo', fakeRefresh);

  // Forms demo
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('list');
  const [filter, setFilter] = useState('all');
  const [select, setSelect] = useState('option1');
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);

  // Layout demo
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // StatefulSaveButton demo
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const simulateSave = () => {
    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 1500);
  };

  // FormRow demo
  const [formToggle, setFormToggle] = useState(true);
  const [formSelect, setFormSelect] = useState('30');
  const [numVal, setNumVal] = useState(60);
  const [numZoom, setNumZoom] = useState(4);

  const STATUSES = ['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Component Showcase"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Templates' },
              { label: 'Component Showcase' },
            ]}
          />
        }
        actions={
          <>
            <PageActionButton icon={SlidersHorizontal}>Configure</PageActionButton>
            <RefreshButton
              refreshing={demoRefreshing}
              autoRefreshMs={autoRefreshMs}
              onRefresh={fakeRefresh}
              onIntervalChange={onIntervalChange}
            />
          </>
        }
      />

      {/* ── 1. Page Actions ── */}
      <SectionCard title="1 · Page Actions" desc="components/PageActionButton + components/RefreshButton">
        <div className="space-y-4">
          <Row label="All button variants">
            <PageActionButton icon={SlidersHorizontal}>outline (default)</PageActionButton>
            <PageActionButton icon={Plus} variant="primary">primary</PageActionButton>
            <PageActionButton icon={Pencil} variant="brand-outline">brand-outline</PageActionButton>
            <PageActionButton icon={Trash2} variant="danger-outline">danger-outline</PageActionButton>
          </Row>
          <Row label="Icon-only (same height — pixel-perfect check)">
            <PageActionIconButton icon={SlidersHorizontal} title="Configure" />
            <PageActionIconButton icon={Download} title="Download" />
            <PageActionIconButton icon={Plus} title="Add" variant="primary" />
            {/* Alignment check */}
            <PageActionButton icon={SlidersHorizontal}>Configure</PageActionButton>
            <PageActionButton icon={Plus} variant="primary">New</PageActionButton>
          </Row>
          <Row label="Disabled state">
            <PageActionButton icon={SlidersHorizontal} disabled>Configure</PageActionButton>
            <PageActionButton icon={Plus} variant="primary" disabled>New</PageActionButton>
            <PageActionIconButton icon={SlidersHorizontal} title="Configure" disabled />
          </Row>
          <Row label="RefreshButton (split button — try the dropdown)">
            <RefreshButton
              refreshing={demoRefreshing}
              autoRefreshMs={autoRefreshMs}
              onRefresh={fakeRefresh}
              onIntervalChange={onIntervalChange}
            />
          </Row>
        </div>
      </SectionCard>

      {/* ── 2. Status ── */}
      <SectionCard title="2 · Status" desc="ui/StatusPill + ui/StatusDot">
        <div className="space-y-4">
          <Row label="StatusPill — sizes sm / md / lg">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <StatusPill status={s} size="sm" />
                <StatusPill status={s} size="md" />
                <StatusPill status={s} size="lg" />
              </div>
            ))}
          </Row>
          <Row label="StatusDot — sizes sm / md / lg · last row with pulse">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <StatusDot status={s} size="sm" />
                <StatusDot status={s} size="md" />
                <StatusDot status={s} size="lg" />
                <StatusDot status={s} size="md" pulse />
              </div>
            ))}
          </Row>
          <Row label="Combined (dot + pill — typical row usage)">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <StatusDot status={s} />
                <StatusPill status={s} />
              </div>
            ))}
          </Row>
        </div>
      </SectionCard>

      {/* ── 3. UI Primitives ── */}
      <SectionCard title="3 · UI Primitives" desc="ui/Spinner · ui/SectionLabel · ui/IconBox · ui/AlertBanner · ui/SelectInput">
        <div className="space-y-4">
          <Row label="Spinner — sizes sm / md / lg / xl">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
            <Spinner size="xl" />
          </Row>
          <Row label="SectionLabel">
            <SectionLabel>Section title example</SectionLabel>
          </Row>
          <Row label="IconBox — sizes sm / md / lg · bg/color variants">
            <IconBox icon={Server} size="sm" />
            <IconBox icon={Cpu} size="md" />
            <IconBox icon={Activity} size="lg" />
            <IconBox icon={Bell} bg="bg-brand-50 dark:bg-brand-500/10" color="text-brand-500" />
            <IconBox icon={Trash2} bg="bg-red-50 dark:bg-red-500/10" color="text-red-500" />
            <IconBox icon={LayoutDashboard} bg="bg-green-50 dark:bg-green-500/10" color="text-green-500" />
          </Row>
          <div className="space-y-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">AlertBanner — all variants</p>
            <div className="space-y-2">
              <AlertBanner variant="success">Settings saved successfully.</AlertBanner>
              <AlertBanner variant="error">Failed to connect to Prometheus.</AlertBanner>
              <AlertBanner variant="warning">Simulator is running with overrides active.</AlertBanner>
              <AlertBanner variant="info">Changes will take effect on next scrape cycle.</AlertBanner>
            </div>
          </div>
          <Row label="SelectInput">
            <SelectInput
              value={select}
              onChange={setSelect}
              options={[
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
                { label: 'Option 3', value: 'option3' },
              ]}
            />
            <SelectInput
              value=""
              onChange={() => {}}
              placeholder="Select a room…"
              options={[
                { label: 'DC-A / Room 1', value: 'room-1' },
                { label: 'DC-A / Room 2', value: 'room-2' },
              ]}
            />
          </Row>
        </div>
      </SectionCard>

      {/* ── 4. Forms ── */}
      <SectionCard title="4 · Forms" desc="forms/SearchInput · forms/SegmentedControl · forms/FilterPills · forms/ToggleSwitch · forms/NumberInput">
        <div className="space-y-4">
          <Row label="SearchInput">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search racks…"
              className="w-56"
            />
          </Row>
          <Row label="SegmentedControl — text + text+icon">
            <SegmentedControl
              options={[
                { label: 'List', value: 'list' },
                { label: 'Grid', value: 'grid' },
                { label: 'Map', value: 'map' },
              ]}
              value={segment}
              onChange={setSegment}
            />
            <SegmentedControl
              options={[
                { label: 'Overview', value: 'overview', icon: LayoutDashboard },
                { label: 'Nodes', value: 'nodes', icon: Server },
                { label: 'Alerts', value: 'alerts', icon: Bell },
              ]}
              value={segment}
              onChange={setSegment}
            />
          </Row>
          <Row label="FilterPills">
            <FilterPills
              options={[
                { label: 'All', value: 'all' },
                { label: 'CRIT', value: 'crit' },
                { label: 'WARN', value: 'warn' },
                { label: 'OK', value: 'ok' },
              ]}
              value={filter}
              onChange={setFilter}
              icon={Filter}
            />
          </Row>
          <Row label="ToggleSwitch — with label / without / disabled">
            <ToggleSwitch checked={toggle1} onChange={() => setToggle1((v) => !v)} label="Enable feature" />
            <ToggleSwitch checked={toggle2} onChange={() => setToggle2((v) => !v)} />
            <ToggleSwitch checked={true} onChange={() => {}} disabled label="Disabled on" />
            <ToggleSwitch checked={false} onChange={() => {}} disabled label="Disabled off" />
          </Row>
          <Row label="NumberInput — − / + buttons, unit suffix, min/max">
            <NumberInput value={numVal} onChange={setNumVal} min={1} max={3600} step={1} unit="s" />
            <NumberInput value={numZoom} onChange={setNumZoom} min={1} max={18} step={1} />
            <NumberInput value={numVal} onChange={setNumVal} min={0} max={100} step={5} unit="%" width="w-16" />
            <NumberInput value={42} onChange={() => {}} disabled unit="ms" />
          </Row>
        </div>
      </SectionCard>

      {/* ── 5. Data ── */}
      <SectionCard title="5 · Data" desc="data/KpiCard">
        <Row label="KpiCard — standalone + grid">
          <KpiCard label="Total Racks" value="48" sub="across 3 sites" />
          <KpiCard label="CRIT Alerts" value="3" sub="2 escalated" className="border-red-200 dark:border-red-900/40" />
          <KpiCard label="Health Score" value="94%" />
          <KpiCard label="Nodes Online" value="1 204" sub="of 1 248 total" />
        </Row>
      </SectionCard>

      {/* ── 5.5 · Forms & Settings ── */}
      <SectionCard
        title="5.5 · Forms & Settings"
        desc="forms/FormRow · ui/StatefulSaveButton · ui/UnsavedIndicator · layout/ConfirmationModal"
      >
        <div className="space-y-5">
          {/* FormRow */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              FormRow — label + description left, control right
            </p>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-4 dark:divide-gray-800 dark:border-gray-800">
              <div className="py-3">
                <FormRow label="Auto-refresh" description="Reload page data automatically">
                  <ToggleSwitch checked={formToggle} onChange={() => setFormToggle((v) => !v)} />
                </FormRow>
              </div>
              <div className="py-3">
                <FormRow label="Default interval" description="Time between refreshes">
                  <SelectInput
                    value={formSelect}
                    onChange={setFormSelect}
                    options={[
                      { label: '15s', value: '15' },
                      { label: '30s', value: '30' },
                      { label: '1m', value: '60' },
                      { label: '5m', value: '300' },
                    ]}
                  />
                </FormRow>
              </div>
              <div className="py-3">
                <FormRow label="Show health legend" description="Display color legend on room view">
                  <ToggleSwitch checked={!formToggle} onChange={() => setFormToggle((v) => !v)} />
                </FormRow>
              </div>
            </div>
          </div>

          {/* StatefulSaveButton + UnsavedIndicator */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              StatefulSaveButton — click to cycle idle → saving → saved → idle
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <UnsavedIndicator visible={saveState === 'dirty' || saveState === 'idle'} />
                <StatefulSaveButton state={saveState} onClick={simulateSave} />
              </div>
              {/* All 5 states side by side for visual reference */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800">
                <p className="mr-1 text-[10px] font-semibold tracking-wider text-gray-300 uppercase dark:text-gray-700">
                  states:
                </p>
                {(['idle', 'dirty', 'saving', 'saved', 'error'] as SaveState[]).map((s) => (
                  <StatefulSaveButton key={s} state={s} onClick={() => {}} />
                ))}
              </div>
            </div>
          </div>

          {/* ConfirmationModal */}
          <Row label="ConfirmationModal">
            <PageActionButton
              icon={Bell}
              variant="brand-outline"
              onClick={() => setConfirmOpen(true)}
            >
              Open confirmation modal
            </PageActionButton>
          </Row>
        </div>
      </SectionCard>

      {/* ── 6. Layout ── */}
      <SectionCard title="6 · Layout" desc="layout/Tabs · layout/Drawer · layout/Modal · layout/DrawerHeader · layout/Backdrop">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-400 dark:text-gray-500">Tabs — text / icon+text / with badge</p>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'nodes', label: 'Nodes', icon: Server },
                { id: 'alerts', label: 'Alerts', icon: Bell, badge: 3 },
                { id: 'settings', label: 'Settings', icon: Settings },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">Active: {activeTab}</p>
          </div>

          {/* Drawer trigger */}
          <Row label="Drawer (slide-in from right)">
            <PageActionButton icon={SlidersHorizontal} onClick={() => setDrawerOpen(true)}>
              Open Drawer
            </PageActionButton>
          </Row>

          {/* Modal trigger */}
          <Row label="Modal (centered dialog)">
            <PageActionButton icon={Plus} variant="primary" onClick={() => setModalOpen(true)}>
              Open Modal
            </PageActionButton>
          </Row>
        </div>
      </SectionCard>

      {/* ── 7. Feedback ── */}
      <SectionCard title="7 · Feedback" desc="feedback/LoadingState · feedback/EmptyState · feedback/ErrorState">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800">
            <LoadingState message="Loading racks…" />
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800">
            <EmptyState
              title="No racks found"
              description="Add a rack to get started."
              icon={Server}
            />
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800">
            <ErrorState
              message="Failed to fetch data."
              onRetry={() => {}}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── ConfirmationModal ── */}
      <ConfirmationModal
        open={confirmOpen}
        title="Unsaved changes"
        message="You have unsaved changes. What would you like to do?"
        onStay={() => setConfirmOpen(false)}
        onDiscard={() => setConfirmOpen(false)}
        onSave={() => { simulateSave(); setConfirmOpen(false); }}
        saving={saveState === 'saving'}
      />

      {/* ── Drawer (portal) ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width={320}>
        <DrawerHeader
          title="Drawer Example"
          icon={SlidersHorizontal}
          description="This is the standard drawer"
          onClose={() => setDrawerOpen(false)}
        />
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <SectionLabel>Section A</SectionLabel>
          <div className="space-y-2">
            <ToggleSwitch checked={toggle1} onChange={() => setToggle1((v) => !v)} label="Option 1" />
            <ToggleSwitch checked={toggle2} onChange={() => setToggle2((v) => !v)} label="Option 2" />
          </div>
          <SectionLabel>Section B</SectionLabel>
          <SelectInput
            value={select}
            onChange={setSelect}
            options={[
              { label: 'Option A', value: 'option1' },
              { label: 'Option B', value: 'option2' },
            ]}
            className="w-full"
          />
        </div>
        <div className="shrink-0 border-t border-gray-100 p-4 dark:border-gray-800">
          <button
            onClick={() => setDrawerOpen(false)}
            className="bg-brand-500 hover:bg-brand-600 flex w-full items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-white transition-colors"
          >
            Apply
          </button>
        </div>
      </Drawer>

      {/* ── Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} maxWidth={480}>
        <ModalHeader title="Modal Example" onClose={() => setModalOpen(false)} />
        <div className="p-6 space-y-4">
          <AlertBanner variant="warning">This action cannot be undone.</AlertBanner>
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" />
          <ToggleSwitch checked={toggle1} onChange={() => setToggle1((v) => !v)} label="Enable option" />
        </div>
        <ModalFooter>
          <PageActionButton onClick={() => setModalOpen(false)}>Cancel</PageActionButton>
          <PageActionButton variant="danger-outline" onClick={() => setModalOpen(false)}>
            Delete
          </PageActionButton>
          <PageActionButton variant="primary" onClick={() => setModalOpen(false)}>
            Confirm
          </PageActionButton>
        </ModalFooter>
      </Modal>
    </div>
  );
};
