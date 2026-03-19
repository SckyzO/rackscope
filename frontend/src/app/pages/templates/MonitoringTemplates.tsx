/**
 * MonitoringTemplates — live component demos for Rackscope monitoring views
 *
 * Shows the REAL components (RackElevation, health badges, status indicators)
 * with mock/static data — use as reference for building monitoring pages.
 *
 * Exports:
 *   RackViewTemplate   — dual front/rear RackElevation + sidebar
 *   DeviceViewTemplate — device header + metrics + instance selector + tabs
 *   RoomViewTemplate   — health summary + rack grid
 */

import { useState } from 'react';
import {
  ChevronRight,
  RotateCcw,
  Thermometer,
  Zap,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { RackElevation } from '@src/components/RackVisualizer';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import type { Rack, Device, DeviceTemplate, InfrastructureComponent } from '@src/types';

// ── Mock data ─────────────────────────────────────────────────────────────────

// 42U rack — realistic device distribution (matches BullSequana XH3000 style)
const MOCK_RACK: Rack = {
  id: 'rack-demo',
  name: 'Demo Rack XH3000 — 42U',
  u_height: 42,
  aisle_id: 'aisle-01',
  devices: [
    { id: 'dev-ib', name: 'IB Switch', template_id: 'switch-1u', u_position: 42 } as Device,
    { id: 'dev-s01', name: 'Server Node 01', template_id: 'server-1u', u_position: 41 } as Device,
    { id: 'dev-s02', name: 'Server Node 02', template_id: 'server-1u', u_position: 40 } as Device,
    { id: 'dev-s03', name: 'Server Node 03', template_id: 'server-1u', u_position: 39 } as Device,
    { id: 'dev-s04', name: 'Server Node 04', template_id: 'server-1u', u_position: 38 } as Device,
    { id: 'dev-s05', name: 'Server Node 05', template_id: 'server-1u', u_position: 37 } as Device,
    { id: 'dev-s06', name: 'Server Node 06', template_id: 'server-1u', u_position: 36 } as Device,
    { id: 'dev-s07', name: 'Server Node 07', template_id: 'server-1u', u_position: 35 } as Device,
    { id: 'dev-s08', name: 'Server Node 08', template_id: 'server-1u', u_position: 34 } as Device,
    { id: 'dev-s09', name: 'Server Node 09', template_id: 'server-1u', u_position: 33 } as Device,
    { id: 'dev-s10', name: 'Server Node 10', template_id: 'server-1u', u_position: 32 } as Device,
    { id: 'dev-net1', name: 'Network SW 01', template_id: 'switch-1u', u_position: 30 } as Device,
    { id: 'dev-net2', name: 'Network SW 02', template_id: 'switch-1u', u_position: 29 } as Device,
    {
      id: 'dev-st1',
      name: 'Storage Array 01',
      template_id: 'storage-4u',
      u_position: 24,
    } as Device,
    {
      id: 'dev-st2',
      name: 'Storage Array 02',
      template_id: 'storage-4u',
      u_position: 20,
    } as Device,
    { id: 'dev-mgmt', name: 'Mgmt Module', template_id: 'mgmt-1u', u_position: 19 } as Device,
    { id: 'dev-kvm', name: 'KVM Console', template_id: 'pdu-1u', u_position: 18 } as Device,
  ],
};

const MOCK_CATALOG: Record<string, DeviceTemplate> = {
  'server-1u': {
    id: 'server-1u',
    name: 'Server 1U',
    type: 'server',
    u_height: 1,
  } as DeviceTemplate,
  'switch-1u': {
    id: 'switch-1u',
    name: 'Switch 1U',
    type: 'network',
    u_height: 1,
  } as DeviceTemplate,
  'storage-4u': {
    id: 'storage-4u',
    name: 'Storage 4U',
    type: 'storage',
    u_height: 4,
  } as DeviceTemplate,
  'mgmt-1u': { id: 'mgmt-1u', name: 'Mgmt 1U', type: 'other', u_height: 1 } as DeviceTemplate,
  'pdu-1u': { id: 'pdu-1u', name: 'KVM / PDU 1U', type: 'pdu', u_height: 1 } as DeviceTemplate,
};

const MOCK_SIDE_COMPS: InfrastructureComponent[] = [
  { id: 'pdu-left', name: 'PDU Left', type: 'power', location: 'side-left', u_height: 8 },
  { id: 'pdu-right', name: 'PDU Right', type: 'power', location: 'side-right', u_height: 8 },
];

const MOCK_REAR_COMPS: InfrastructureComponent[] = [
  {
    id: 'patch-panel',
    name: 'Patch Panel',
    type: 'network',
    location: 'u-mount',
    u_position: 11,
    u_height: 1,
  },
];

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const STATE_PILL: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

// ── 1. RACK VIEW TEMPLATE ─────────────────────────────────────────────────────

export const RackViewTemplate = () => {
  usePageTitle('Rack View — Template');
  const [selected, setSelected] = useState<Device | null>(null);
  const health = 'WARN';

  return (
    <div className="flex h-full gap-4">
      {/* ── Left sidebar ── */}
      <aside className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto">
        {/* Identity */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{MOCK_RACK.name}</h2>
              <p className="font-mono text-xs text-gray-400">{MOCK_RACK.id}</p>
            </div>
            <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${STATE_PILL[health]}`}>
              {health}
            </span>
          </div>
          {/* Breadcrumb */}
          <nav className="mb-3 flex items-center gap-1 text-[11px]">
            <span className="text-brand-500">Map</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="text-brand-500">Room A</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">Rack</span>
          </nav>
          <div className="space-y-1.5 text-xs">
            {[
              ['Height', `${MOCK_RACK.u_height}U`],
              ['Devices', `${MOCK_RACK.devices.length} placed`],
              ['Template', 'Standard 12U'],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex items-center justify-between">
                <span className="text-gray-400">{l}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Thermometer, label: 'Temp', value: '52°C', color: 'text-blue-500' },
            { icon: Zap, label: 'Power', value: '2.4kW', color: 'text-yellow-500' },
            { icon: XCircle, label: 'CRIT', value: '0', color: 'text-red-500' },
            { icon: AlertTriangle, label: 'WARN', value: '2', color: 'text-amber-500' },
            { icon: Server, label: 'Nodes', value: '6', color: 'text-brand-500' },
            { icon: CheckCircle, label: 'OK', value: '4', color: 'text-green-500' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900"
            >
              <s.icon className={`mb-1 h-3.5 w-3.5 ${s.color}`} />
              <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[9px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main: dual front/rear ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Server className="text-brand-500 h-4 w-4" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {MOCK_RACK.name}
            </span>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: HC[health] }} />
          </div>
          <button className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600 dark:border-gray-700">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Front + Rear side by side */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-gray-100 dark:border-gray-800">
            <div className="shrink-0 border-b border-gray-100 py-1.5 text-center dark:border-gray-800">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Front
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4" style={{ minHeight: 700 }}>
              <RackElevation
                rack={MOCK_RACK}
                catalog={MOCK_CATALOG}
                health={health}
                nodesData={{}}
                isRearView={false}
                infraComponents={[]}
                sideComponents={MOCK_SIDE_COMPS}
                allowInfraOverlap={false}
                pduMetrics={undefined}
                onDeviceClick={(d) => setSelected(d)}
                maxUPx={48}
              />
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-gray-100 py-1.5 text-center dark:border-gray-800">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Rear
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4" style={{ minHeight: 700 }}>
              <RackElevation
                rack={MOCK_RACK}
                catalog={MOCK_CATALOG}
                health={health}
                nodesData={{}}
                isRearView={true}
                infraComponents={MOCK_REAR_COMPS}
                sideComponents={MOCK_SIDE_COMPS}
                allowInfraOverlap={true}
                pduMetrics={undefined}
                onDeviceClick={(d) => setSelected(d)}
                maxUPx={48}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: device detail ── */}
      {selected && (
        <aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">{selected.name}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <span
              className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${STATE_PILL.WARN}`}
            >
              WARN
            </span>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">ID</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{selected.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Template</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {selected.template_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">U Position</span>
                <span className="text-gray-700 dark:text-gray-300">U{selected.u_position}</span>
              </div>
            </div>
            <button className="bg-brand-500 hover:bg-brand-600 mt-4 w-full rounded-lg py-2 text-xs font-semibold text-white transition-colors">
              Open Device →
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};

// ── 2. DEVICE VIEW TEMPLATE ───────────────────────────────────────────────────

const INSTANCES = ['node-01', 'node-02', 'node-03', 'node-04', 'node-05', 'node-06'];
const CHECKS = [
  { id: 'node_up', name: 'Node Up', state: 'OK' },
  { id: 'ipmi_temp_warn', name: 'IPMI Temperature', state: 'WARN' },
  { id: 'ipmi_temp_crit', name: 'IPMI Temp Critical', state: 'OK' },
  { id: 'node_load', name: 'CPU Load', state: 'WARN' },
];

const HealthIcon = ({ state }: { state: string }) => {
  if (state === 'OK') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (state === 'WARN') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (state === 'CRIT') return <XCircle className="h-4 w-4 text-red-500" />;
  return <HelpCircle className="h-4 w-4 text-gray-400" />;
};

export const DeviceViewTemplate = () => {
  usePageTitle('Device View — Template');
  const [activeInstance, setActiveInstance] = useState('node-01');
  const [activeTab, setActiveTab] = useState('Checks');

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs">
        {['Map', 'Room A', 'Rack', 'Device'].map((crumb, i, arr) => (
          <span key={crumb} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
            <span
              className={
                i < arr.length - 1
                  ? 'text-brand-500 cursor-pointer hover:underline'
                  : 'font-semibold text-gray-700 dark:text-gray-200'
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">XH3140 Trio 01</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span className="font-mono">r01-01-c01</span>
              <span>·</span>
              <span>template: bs-xh3140-trio-1u-3n</span>
              <span>·</span>
              <span>U1</span>
            </div>
          </div>
          <span className={`rounded-lg px-3 py-1 text-sm font-bold ${STATE_PILL.WARN}`}>WARN</span>
        </div>
      </div>

      {/* Metrics + instance selector */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Thermometer, label: 'Temperature', value: '68°C', color: 'text-amber-500' },
            { icon: Zap, label: 'Power', value: '420W', color: 'text-yellow-500' },
            { icon: CheckCircle, label: 'Checks pass', value: '2/4', color: 'text-green-500' },
            { icon: Server, label: 'Nodes', value: '3', color: 'text-brand-500' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <m.icon className={`mb-2 h-5 w-5 ${m.color}`} />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.value}</p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Instance selector */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Instances
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {INSTANCES.map((inst) => (
              <button
                key={inst}
                onClick={() => setActiveInstance(inst)}
                className={`rounded-lg px-2 py-1.5 text-center font-mono text-[11px] font-medium transition-colors ${
                  activeInstance === inst
                    ? 'bg-brand-500 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
            Selected:{' '}
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
              {activeInstance}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex border-b border-gray-100 px-1 dark:border-gray-800">
          {['Checks', 'Metrics', 'Instances'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'Checks' && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {CHECKS.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <HealthIcon state={c.state} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</p>
                    <p className="font-mono text-[10px] text-gray-400">{c.id}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATE_PILL[c.state]}`}
                  >
                    {c.state}
                  </span>
                </div>
              ))}
            </div>
          )}
          {activeTab !== 'Checks' && (
            <p className="py-8 text-center text-sm text-gray-400">{activeTab} content</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 3. ROOM VIEW TEMPLATE ─────────────────────────────────────────────────────

const MOCK_RACKS = [
  { id: 'r01', name: 'Rack 01', state: 'OK', u: '32/42' },
  { id: 'r02', name: 'Rack 02', state: 'WARN', u: '38/42' },
  { id: 'r03', name: 'Rack 03', state: 'CRIT', u: '40/42' },
  { id: 'r04', name: 'Rack 04', state: 'OK', u: '28/42' },
  { id: 'r05', name: 'Rack 05', state: 'UNKNOWN', u: '30/42' },
  { id: 'r06', name: 'Rack 06', state: 'OK', u: '35/42' },
  { id: 'r07', name: 'Rack 07', state: 'WARN', u: '37/42' },
  { id: 'r08', name: 'Rack 08', state: 'OK', u: '33/42' },
];

export const RoomViewTemplate = () => {
  usePageTitle('Room View — Template');
  const [selectedRack, setSelectedRack] = useState<string | null>(null);
  const counts = { OK: 5, WARN: 2, CRIT: 1, UNKNOWN: 1 };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Room A</h2>
          <nav className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <span className="text-brand-500">Map</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-gray-700 dark:text-gray-200">Room A</span>
          </nav>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5">
          <RotateCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Health summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(counts).map(([state, count]) => (
          <div
            key={state}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: HC[state] }}
              />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{state}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
          </div>
        ))}
      </div>

      {/* Floor plan + detail panel */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Rack grid */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-4 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Aisle 01 — {MOCK_RACKS.length} racks
          </p>
          <div className="grid grid-cols-4 gap-3">
            {MOCK_RACKS.map((rack) => (
              <button
                key={rack.id}
                onClick={() => setSelectedRack(selectedRack === rack.id ? null : rack.id)}
                className={`cursor-pointer rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${
                  selectedRack === rack.id ? 'ring-brand-500 ring-2 ring-offset-1' : ''
                }`}
                style={{ borderColor: HC[rack.state] }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                    {rack.id}
                  </span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: HC[rack.state] }}
                  />
                </div>
                <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{rack.name}</p>
                <p className="mt-1 text-[10px] text-gray-400">{rack.u}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected rack detail */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          {selectedRack ? (
            <>
              <p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {MOCK_RACKS.find((r) => r.id === selectedRack)?.name}
              </p>
              <div style={{ height: 300 }}>
                <RackElevation
                  rack={{
                    ...MOCK_RACK,
                    id: selectedRack,
                    name: MOCK_RACKS.find((r) => r.id === selectedRack)?.name ?? '',
                  }}
                  catalog={MOCK_CATALOG}
                  health={MOCK_RACKS.find((r) => r.id === selectedRack)?.state}
                  nodesData={{}}
                  isRearView={false}
                  infraComponents={[]}
                  sideComponents={MOCK_SIDE_COMPS}
                  allowInfraOverlap={false}
                  pduMetrics={undefined}
                  onDeviceClick={() => {
                    /* noop */
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
              <Server className="h-10 w-10 text-gray-200 dark:text-gray-700" />
              <p className="text-sm text-gray-400">Click a rack to see its elevation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
