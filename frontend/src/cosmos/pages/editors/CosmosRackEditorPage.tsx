/**
 * CosmosRackEditorPage — rebuilt from scratch
 *
 * Layout: PageHeader (EmptyPage template) + 3-panel workspace
 *   Left  (~260px) : Tabs [Racks | Templates]
 *   Center (flex)  : Rack visualization — always dark, hero of the page
 *   Right (~280px) : Context panel — placement form / device editor / empty state
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Server,
  HardDrive,
  Network,
  Zap,
  Thermometer,
  Box,
  GripVertical,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Rack, Device, DeviceTemplate } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';

// ── Constants ─────────────────────────────────────────────────────────────────

const U_PX_MAX = 32;
const U_PX_MIN = 10;

const DEVICE_TYPES = ['server', 'storage', 'network', 'pdu', 'cooling'] as const;

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  server:  { bg: '#0d1f3c', border: '#2563eb', text: '#60a5fa' },
  storage: { bg: '#241a04', border: '#d97706', text: '#fbbf24' },
  network: { bg: '#071d27', border: '#0891b2', text: '#38bdf8' },
  pdu:     { bg: '#241f03', border: '#ca8a04', text: '#facc15' },
  cooling: { bg: '#051d1d', border: '#0d9488', text: '#2dd4bf' },
  other:   { bg: '#141a22', border: '#374151', text: '#9ca3af' },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  server: Server,
  storage: HardDrive,
  network: Network,
  pdu: Zap,
  cooling: Thermometer,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TypeIcon = ({
  type,
  className,
  style,
}: {
  type: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const Icon = TYPE_ICONS[type] ?? Box;
  return <Icon className={className} style={style} />;
};

const c = (type: string) => TYPE_COLORS[type] ?? TYPE_COLORS.other;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RackEntry {
  id: string;
  name: string;
  roomName: string;
  aisleName: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const RackListItem = ({
  rack,
  selected,
  onClick,
}: {
  rack: RackEntry;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={[
      'flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all',
      selected
        ? 'bg-brand-50 dark:bg-brand-500/10'
        : 'hover:bg-gray-50 dark:hover:bg-white/5',
    ].join(' ')}
  >
    <span
      className={`truncate text-xs font-semibold ${
        selected
          ? 'text-brand-600 dark:text-brand-400'
          : 'text-gray-700 dark:text-gray-300'
      }`}
    >
      {rack.name}
    </span>
    <span className="truncate text-[10px] text-gray-400 dark:text-gray-600">
      {rack.roomName} › {rack.aisleName}
    </span>
  </button>
);

const TemplateCard = ({
  template,
  onDragStart,
}: {
  template: DeviceTemplate;
  onDragStart: (e: React.DragEvent) => void;
}) => {
  const col = c(template.type);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex cursor-grab items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-gray-200 hover:shadow-sm active:cursor-grabbing active:opacity-70 dark:border-gray-800 dark:bg-gray-800/60 dark:hover:border-gray-700"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}
      >
        <TypeIcon type={template.type} className="h-4 w-4" style={{ color: col.text }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
          {template.name}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
          {template.type} · {template.u_height}U
        </p>
      </div>
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
    </div>
  );
};

// ── Form field helper ─────────────────────────────────────────────────────────

const FormField = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-gray-400 dark:text-gray-600">{hint}</p>}
  </div>
);

const inputCls =
  'focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600';

// ── Main component ────────────────────────────────────────────────────────────

export const CosmosRackEditorPage = () => {
  const [searchParams] = useSearchParams();
  const initialRackId = searchParams.get('rackId');

  // ── State ─────────────────────────────────────────────────────────────────

  const [allRacks, setAllRacks] = useState<RackEntry[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(initialRackId);
  const [rack, setRack] = useState<Rack | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [draftDevices, setDraftDevices] = useState<Device[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Left panel
  const [leftTab, setLeftTab] = useState<'racks' | 'templates'>('racks');
  const [rackSearch, setRackSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // DnD
  const dragTemplateRef = useRef<DeviceTemplate | null>(null);
  const dragDeviceRef = useRef<Device | null>(null);
  const [dragHoverU, setDragHoverU] = useState<number | null>(null);
  const [dragTemplate, setDragTemplate] = useState<DeviceTemplate | null>(null);
  const [dragDevice, setDragDevice] = useState<Device | null>(null);

  // Placement form (shown after template drop)
  const [placing, setPlacing] = useState<{ template: DeviceTemplate; u: number } | null>(null);
  const [placingForm, setPlacingForm] = useState({ name: '', id: '', instance: '' });

  // Selected device + edit form
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editForm, setEditForm] = useState({ name: '', id: '', instance: '' });
  const [editDirty, setEditDirty] = useState(false);

  // Canvas sizing
  const rackContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasH, setCanvasH] = useState(600);
  const deviceCounterRef = useRef(0);

  // Undo — single-level, clears after 5 s
  const [undoItem, setUndoItem] = useState<Device | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Page title ────────────────────────────────────────────────────────────

  usePageTitle(rack ? `${rack.name} — Rack Editor` : 'Rack Editor');

  // ── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [rooms, catalog] = await Promise.all([api.getRooms(), api.getCatalog()]);
        if (!active) return;

        const racks: RackEntry[] = [];
        (Array.isArray(rooms) ? rooms : []).forEach((room) => {
          (room.aisles ?? []).forEach((aisle) => {
            (aisle.racks ?? []).forEach((r) => {
              racks.push({ id: r.id, name: r.name || r.id, roomName: room.name, aisleName: aisle.name });
            });
          });
          (room.standalone_racks ?? []).forEach((r) => {
            racks.push({ id: r.id, name: r.name || r.id, roomName: room.name, aisleName: 'Standalone' });
          });
        });
        setAllRacks(racks);

        const dc: Record<string, DeviceTemplate> = {};
        (catalog?.device_templates ?? []).forEach((t: DeviceTemplate) => { dc[t.id] = t; });
        setDeviceCatalog(dc);

        // Auto-select: URL param → first rack
        if (!selectedRackId && racks.length > 0) setSelectedRackId(racks[0].id);
      } catch { /* noop */ }
    };
    void load();
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load selected rack ────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedRackId) return;
    let active = true;
    api.getRack(selectedRackId)
      .then((data) => {
        if (!active) return;
        setRack(data);
        setDraftDevices(data?.devices ?? []);
        setDirty(false);
        setSelectedDevice(null);
        setPlacing(null);
        setEditDirty(false);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedRackId]);

  // ── Sync edit form when device selected ──────────────────────────────────

  useEffect(() => {
    if (!selectedDevice) return;
    setEditForm({
      name: selectedDevice.name || '',
      id: selectedDevice.id || '',
      instance:
        typeof selectedDevice.instance === 'string'
          ? selectedDevice.instance
          : selectedDevice.instance
          ? JSON.stringify(selectedDevice.instance)
          : '',
    });
    setEditDirty(false);
  }, [selectedDevice]);

  // ── Navigation warning ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ── Canvas resize ─────────────────────────────────────────────────────────

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setCanvasH(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const uMap = useMemo(() => {
    const map = new Map<number, Device>();
    draftDevices.forEach((dev) => {
      const h = deviceCatalog[dev.template_id]?.u_height ?? 1;
      for (let u = dev.u_position; u < dev.u_position + h; u++) map.set(u, dev);
    });
    return map;
  }, [draftDevices, deviceCatalog]);

  const totalU = rack?.u_height ?? 42;
  const usedU = draftDevices.reduce((acc, d) => acc + (deviceCatalog[d.template_id]?.u_height ?? 1), 0);
  const density = totalU > 0 ? usedU / totalU : 0;
  const uPx = Math.max(U_PX_MIN, Math.min(U_PX_MAX, Math.floor(canvasH / totalU)));

  const filteredRacks = useMemo(() => {
    if (!rackSearch.trim()) return allRacks;
    const q = rackSearch.toLowerCase();
    return allRacks.filter(
      (r) => r.name.toLowerCase().includes(q) || r.roomName.toLowerCase().includes(q)
    );
  }, [allRacks, rackSearch]);

  const racksByRoom = useMemo(() => {
    const groups = new Map<string, RackEntry[]>();
    filteredRacks.forEach((r) => {
      const g = groups.get(r.roomName) ?? [];
      g.push(r);
      groups.set(r.roomName, g);
    });
    return groups;
  }, [filteredRacks]);

  const filteredTemplates = useMemo(
    () =>
      Object.values(deviceCatalog).filter(
        (t) =>
          (!templateSearch ||
            t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
            t.id.toLowerCase().includes(templateSearch.toLowerCase())) &&
          (!typeFilter || t.type === typeFilter)
      ),
    [deviceCatalog, templateSearch, typeFilter]
  );

  // ── DnD handlers ─────────────────────────────────────────────────────────

  const handleTemplateDragStart = (e: React.DragEvent, tpl: DeviceTemplate) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', tpl.id);
    dragTemplateRef.current = tpl;
    dragDeviceRef.current = null;
    setDragTemplate(tpl);
    setDragDevice(null);
  };

  const handleDeviceDragStart = (e: React.DragEvent, device: Device) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', device.id);
    dragDeviceRef.current = device;
    dragTemplateRef.current = null;
    setDragDevice(device);
    setDragTemplate(null);
  };

  const handleDragEnd = () => {
    dragTemplateRef.current = null;
    dragDeviceRef.current = null;
    setDragTemplate(null);
    setDragDevice(null);
    setDragHoverU(null);
  };

  const handleSlotDragEnter = (u: number) => {
    if (dragTemplateRef.current || dragDeviceRef.current) setDragHoverU(u);
  };

  const handleSlotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragDeviceRef.current ? 'move' : 'copy';
  };

  const handleSlotDrop = (e: React.DragEvent, u: number) => {
    e.preventDefault();
    if (!rack) { setDragHoverU(null); return; }

    let activeDevice = dragDeviceRef.current;
    const activeTpl = dragTemplateRef.current;

    // Recover device from dataTransfer if ref was lost (cross-component drop)
    if (!activeDevice && !activeTpl) {
      const id = e.dataTransfer.getData('text/plain');
      activeDevice = draftDevices.find((d) => d.id === id) ?? null;
    }

    if (activeDevice) {
      const h = deviceCatalog[activeDevice.template_id]?.u_height ?? 1;
      const own = new Set(Array.from({ length: h }, (_, i) => activeDevice!.u_position + i));
      const valid = Array.from({ length: h }, (_, i) => u + i).every(
        (slot) => slot >= 1 && slot <= rack.u_height && (!uMap.has(slot) || own.has(slot))
      );
      if (valid && u !== activeDevice.u_position) {
        setDraftDevices((prev) =>
          prev.map((d) => (d.id === activeDevice!.id ? { ...d, u_position: u } : d))
        );
        setDirty(true);
        if (selectedDevice?.id === activeDevice.id)
          setSelectedDevice((prev) => (prev ? { ...prev, u_position: u } : null));
      }
      dragDeviceRef.current = null;
      setDragDevice(null);
      setDragHoverU(null);
      return;
    }

    if (!activeTpl) { setDragHoverU(null); return; }

    const h = activeTpl.u_height ?? 1;
    const valid = Array.from({ length: h }, (_, i) => u + i).every(
      (slot) => slot >= 1 && slot <= rack.u_height && !uMap.has(slot)
    );
    if (!valid) { setDragHoverU(null); return; }

    deviceCounterRef.current += 1;
    setPlacing({ template: activeTpl, u });
    setPlacingForm({ name: activeTpl.name, id: `dev-${deviceCounterRef.current}`, instance: '' });
    dragTemplateRef.current = null;
    setDragTemplate(null);
    setDragHoverU(null);
    setSelectedDevice(null);
  };

  const handleRackDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (!rackContainerRef.current?.contains(related)) setDragHoverU(null);
  };

  // ── Device CRUD ───────────────────────────────────────────────────────────

  const confirmPlacement = () => {
    if (!placing || !rack) return;
    const newDev: Device = {
      id: placingForm.id.trim() || `dev-${deviceCounterRef.current}`,
      name: placingForm.name.trim() || placing.template.name,
      template_id: placing.template.id,
      u_position: placing.u,
      instance: placingForm.instance.trim() || null,
      nodes: null,
      labels: null,
    };
    setDraftDevices((prev) => [...prev, newDev]);
    setDirty(true);
    setPlacing(null);
    setSelectedDevice(newDev);
  };

  const deleteDevice = (deviceId: string) => {
    const found = draftDevices.find((d) => d.id === deviceId);
    setDraftDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setDirty(true);
    setSelectedDevice((prev) => (prev?.id === deviceId ? null : prev));
    // Set undo — auto-clears after 5 s
    if (found) {
      setUndoItem(found);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);
    }
  };

  const handleUndo = () => {
    if (!undoItem) return;
    setDraftDevices((prev) => [...prev, undoItem]);
    setUndoItem(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setDirty(true);
  };

  // Cleanup undo timer on unmount
  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const applyDeviceEdit = () => {
    if (!selectedDevice) return;
    const updated: Device = {
      ...selectedDevice,
      name: editForm.name.trim() || selectedDevice.name,
      id: editForm.id.trim() || selectedDevice.id,
      instance: editForm.instance.trim() || null,
    };
    setDraftDevices((prev) => prev.map((d) => (d.id === selectedDevice.id ? updated : d)));
    setSelectedDevice(updated);
    setDirty(true);
    setEditDirty(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedRackId) return;
    setSaveStatus('saving');
    try {
      await api.updateRackDevices(selectedRackId, draftDevices);
      setDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ── Keyboard shortcuts (declared after handleSave + deleteDevice) ────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty) void handleSave();
        return;
      }
      if (e.key === 'Escape') { setSelectedDevice(null); setPlacing(null); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDevice && !isInput) {
        deleteDevice(selectedDevice.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dirty, selectedDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rack slot helpers ─────────────────────────────────────────────────────

  const slots = Array.from({ length: totalU }, (_, i) => i + 1);
  const selectedRackEntry = allRacks.find((r) => r.id === selectedRackId);

  const dragH = dragTemplate
    ? (dragTemplate.u_height ?? 1)
    : dragDevice
    ? (deviceCatalog[dragDevice.template_id]?.u_height ?? 1)
    : 0;

  const isSlotHovered = (u: number) =>
    (dragTemplate !== null || dragDevice !== null) &&
    dragHoverU !== null &&
    u >= dragHoverU &&
    u < dragHoverU + dragH;

  const isHoverValid = (u: number) =>
    dragHoverU !== null &&
    Array.from({ length: dragH }, (_, i) => dragHoverU + i).every((slot) =>
      slot >= 1 &&
      slot <= totalU &&
      (dragDevice
        ? !uMap.has(slot) || uMap.get(slot)?.id === dragDevice.id
        : !uMap.has(slot))
    ) &&
    isSlotHovered(u);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <PageHeader
          title="Rack Editor"
          breadcrumb={
            <PageBreadcrumb
              items={[
                { label: 'Home', href: '/cosmos' },
                { label: 'Editors' },
                ...(selectedRackEntry
                  ? [
                      {
                        label: selectedRackEntry.roomName,
                        onClick: () => { /* Could navigate to datacenter editor */ },
                      },
                      { label: rack?.name ?? selectedRackId ?? 'Rack' },
                    ]
                  : [{ label: 'Rack Editor' }]),
              ]}
            />
          }
          actions={
            <div className="flex items-center gap-2">
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" /> Save failed
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-xs text-green-500 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
              {dirty && (
                <button
                  onClick={() => void handleSave()}
                  disabled={saveStatus === 'saving'}
                  className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {saveStatus === 'saving' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* ── 3-panel workspace ──────────────────────────────────────────────── */}
      <div className="mt-5 flex min-h-0 flex-1 gap-5">

        {/* ── LEFT PANEL: Racks + Templates ─────────────────────────────── */}

        <div className="flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-gray-100 dark:border-gray-800">
            {(['racks', 'templates'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={[
                  'flex-1 py-3 text-xs font-semibold capitalize transition-colors',
                  leftTab === tab
                    ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Racks tab ────────────────────────────────────────────────── */}
          {leftTab === 'racks' && (
            <>
              <div className="shrink-0 p-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={rackSearch}
                    onChange={(e) => setRackSearch(e.target.value)}
                    placeholder="Search racks…"
                    className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-2 pr-3 pl-8 text-xs placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-3">
                {Array.from(racksByRoom.entries()).map(([roomName, racks]) => (
                  <div key={roomName}>
                    <p className="mt-2 mb-1 px-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600 first:mt-0">
                      {roomName}
                    </p>
                    {racks.map((r) => (
                      <RackListItem
                        key={r.id}
                        rack={r}
                        selected={selectedRackId === r.id}
                        onClick={() => {
                          if (dirty && !confirm('Unsaved changes — switch racks anyway?')) return;
                          setSelectedRackId(r.id);
                        }}
                      />
                    ))}
                  </div>
                ))}
                {filteredRacks.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-gray-400">No racks found</p>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 dark:text-gray-600">
                  {allRacks.length} rack{allRacks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}

          {/* ── Templates tab ────────────────────────────────────────────── */}
          {leftTab === 'templates' && (
            <>
              <div className="shrink-0 space-y-2 p-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-2 pr-3 pl-8 text-xs placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['', ...DEVICE_TYPES] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={[
                        'rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize transition-colors',
                        typeFilter === t
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700',
                      ].join(' ')}
                    >
                      {t || 'All'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
                {filteredTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onDragStart={(e) => handleTemplateDragStart(e, t)}
                  />
                ))}
                {filteredTemplates.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">No templates found</p>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 dark:text-gray-600">
                  Drag a template onto a free rack slot
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── CENTER: Rack canvas ────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-rack-interior)] transition-colors duration-500">
          {!rack ? (
            <div className="flex flex-1 items-center justify-center">
              {allRacks.length === 0 ? (
                <div className="text-center">
                  <Server className="mx-auto mb-3 h-10 w-10 text-gray-700" />
                  <p className="text-sm text-gray-600">No racks in topology</p>
                  <p className="mt-1 text-xs text-gray-700">
                    Add racks in the Datacenter Editor first
                  </p>
                </div>
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              )}
            </div>
          ) : (
            <>
              {/* Rack info bar */}
              <div className="shrink-0 border-b border-[var(--color-border)]/20 px-5 py-3 transition-colors duration-500">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-[var(--color-text-base)]">{rack.name}</h2>
                  <span className="rounded-full bg-[var(--color-border)]/20 px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-base)] opacity-50">
                    {rack.id}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-base)] opacity-40">{totalU}U</span>
                  <span className="text-[11px] text-[var(--color-text-base)] opacity-40">
                    {draftDevices.length} device{draftDevices.length !== 1 ? 's' : ''}
                  </span>

                  {/* Density bar */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] text-[var(--color-text-base)] opacity-40">{usedU}/{totalU}U</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-border)]/30">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, density * 100)}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-[10px] text-[var(--color-text-base)] opacity-40">
                      {Math.round(density * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Rack visualization */}
              <div ref={canvasRef} className="relative flex-1 overflow-hidden py-5">
                <div className="mx-auto h-full w-full max-w-sm px-6">
                  <div
                    ref={rackContainerRef}
                    onDragLeave={handleRackDragLeave}
                    onDragEnd={handleDragEnd}
                    className="relative flex flex-col-reverse rounded-sm border-x-[24px] border-[var(--color-rack-frame)] bg-[var(--color-rack-frame)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-colors duration-500"
                  >
                    {slots.map((u) => {
                      const dev = uMap.get(u);
                      const isStart = !dev || dev.u_position === u;
                      if (!isStart) return null;

                      const tpl = dev ? deviceCatalog[dev.template_id] : undefined;
                      const devH = tpl?.u_height ?? 1;
                      const col = c(tpl?.type ?? 'other');
                      const hovered = isSlotHovered(u);
                      const valid = hovered && isHoverValid(u);

                      // U rail number — shown on both sides inside border-x
                      const UNum = ({ align }: { align: 'left' | 'right' }) => (
                        <div
                          className={`pointer-events-none absolute top-0 flex h-full w-[20px] items-center justify-center font-mono text-[8px] font-black select-none text-[var(--color-text-base)] opacity-40 ${align === 'left' ? '-left-[20px]' : '-right-[20px]'}`}
                        >
                          {u}
                        </div>
                      );

                      if (dev) {
                        return (
                          <div
                            key={u}
                            style={{ flex: `0 0 ${devH * uPx}px` }}
                            className="relative flex min-h-0 w-full items-center border-b border-gray-800/40"
                            onDragEnter={() => handleSlotDragEnter(u)}
                            onDragOver={handleSlotDragOver}
                            onDrop={(e) => handleSlotDrop(e, u)}
                          >
                            <UNum align="left" />
                            <UNum align="right" />

                            <div className="h-full w-full px-0.5 py-[1px]">
                              <div
                                draggable
                                onDragStart={(e) => handleDeviceDragStart(e, dev)}
                                onClick={() =>
                                  setSelectedDevice(dev.id === selectedDevice?.id ? null : dev)
                                }
                                style={{ opacity: dragDevice?.id === dev.id ? 0.25 : 1 }}
                                className="group/dev relative flex h-full w-full cursor-grab items-center bg-[var(--color-device-surface)] transition-all hover:brightness-110 active:cursor-grabbing rounded-[2px]"
                              >
                                {/* Left status bar — same pattern as rack view */}
                                <div
                                  className="absolute left-0 top-0 h-full w-1.5 shrink-0 rounded-l-[2px] opacity-90"
                                  style={{ backgroundColor: col.border }}
                                >
                                  <div
                                    className="absolute inset-0 opacity-40"
                                    style={{ filter: 'blur(4px)', backgroundColor: col.border }}
                                  />
                                </div>

                                {/* Selected outline */}
                                {selectedDevice?.id === dev.id && (
                                  <div
                                    className="pointer-events-none absolute inset-0 rounded-[2px]"
                                    style={{ outline: `2px solid ${col.border}`, outlineOffset: '1px' }}
                                  />
                                )}

                                {/* Content */}
                                <div className="min-w-0 flex-1 pl-4 pr-2">
                                  <p
                                    className="truncate text-xs font-semibold"
                                    style={{ color: col.text }}
                                  >
                                    {dev.name || dev.id}
                                  </p>
                                  {devH > 1 && (
                                    <p className="truncate font-mono text-[10px] text-[var(--color-text-base)] opacity-40">
                                      {dev.id}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDevice(dev.id);
                                  }}
                                  title="Remove device (Del)"
                                  className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-500/20 text-red-400 opacity-0 transition-all hover:bg-red-500 hover:text-white group-hover/dev:opacity-100"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Empty slot
                      return (
                        <div
                          key={u}
                          style={{ flex: `0 0 ${uPx}px` }}
                          className={[
                            'relative flex min-h-0 w-full items-center border-b border-[var(--color-border)]/10 transition-colors',
                            hovered
                              ? valid
                                ? 'bg-brand-500/20'
                                : 'bg-red-500/15'
                              : '',
                          ].join(' ')}
                          onDragEnter={() => handleSlotDragEnter(u)}
                          onDragOver={handleSlotDragOver}
                          onDrop={(e) => handleSlotDrop(e, u)}
                        >
                          <UNum align="left" />
                          <UNum align="right" />

                          {/* Empty slot fill */}
                          {!hovered && (
                            <div className="absolute inset-0 bg-[var(--color-empty-slot)] opacity-30" />
                          )}

                          {hovered && (
                            <div className="pointer-events-none absolute inset-0 flex items-center px-3">
                              <span
                                className={`font-mono text-[10px] font-bold ${
                                  valid ? 'text-brand-400' : 'text-red-400'
                                }`}
                              >
                                {valid
                                  ? `U${dragHoverU} — ${dragTemplate?.name ?? dragDevice?.name ?? ''}`
                                  : 'Slot occupied'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Undo toast — floats over rack canvas */}
                {undoItem && (
                  <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 shadow-2xl">
                    <span className="text-xs text-gray-400">
                      <span className="font-semibold text-white">{undoItem.name || undoItem.id}</span>{' '}
                      removed
                    </span>
                    <button
                      onClick={handleUndo}
                      className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT PANEL: Context ───────────────────────────────────────── */}
        <div className="flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

          {/* ── Placement form ─────────────────────────────────────────── */}
          {placing ? (
            <div className="flex flex-1 flex-col">
              <div className="shrink-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Place device</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {placing.template.name} at U{placing.u}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {/* Template preview badge */}
                <div
                  className="flex items-center gap-2.5 rounded-xl p-3"
                  style={{
                    backgroundColor: c(placing.template.type).bg,
                    border: `1px solid ${c(placing.template.type).border}`,
                  }}
                >
                  <TypeIcon
                    type={placing.template.type}
                    className="h-4 w-4 shrink-0"
                    style={{ color: c(placing.template.type).text }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: c(placing.template.type).text }}>
                    {placing.template.name}
                  </span>
                  <span className="text-[10px] text-gray-600">{placing.template.u_height}U</span>
                </div>

                <FormField label="Device name">
                  <input
                    autoFocus
                    value={placingForm.name}
                    onChange={(e) => setPlacingForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={placing.template.name}
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Device ID">
                  <input
                    value={placingForm.id}
                    onChange={(e) => setPlacingForm((f) => ({ ...f, id: e.target.value }))}
                    placeholder="dev-001"
                    className={`${inputCls} font-mono text-xs`}
                  />
                </FormField>

                <FormField
                  label="Instance / node"
                  hint="Maps this device to Prometheus metrics. Supports patterns: compute[001-004]"
                >
                  <input
                    value={placingForm.instance}
                    onChange={(e) => setPlacingForm((f) => ({ ...f, instance: e.target.value }))}
                    placeholder="compute001"
                    className={`${inputCls} font-mono text-xs`}
                  />
                </FormField>
              </div>

              <div className="shrink-0 flex items-center gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
                <button
                  onClick={() => setPlacing(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPlacement}
                  className="bg-brand-500 hover:bg-brand-600 flex-1 rounded-xl py-2 text-sm font-semibold text-white transition-colors"
                >
                  Place
                </button>
              </div>
            </div>

          /* ── Device edit panel ────────────────────────────────────────── */
          ) : selectedDevice ? (
            (() => {
              const tpl = deviceCatalog[selectedDevice.template_id];
              const type = tpl?.type ?? 'other';
              const col = c(type);
              return (
                <div className="flex flex-1 flex-col">
                  {/* Device header */}
                  <div
                    className="shrink-0 flex items-center gap-2.5 px-5 py-4"
                    style={{ borderBottom: `2px solid ${col.border}` }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}
                    >
                      <TypeIcon type={type} className="h-4 w-4" style={{ color: col.text }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                        {selectedDevice.name || selectedDevice.id}
                      </p>
                      <p className="text-[10px] capitalize text-gray-400">
                        {type} · U{selectedDevice.u_position} · {tpl?.u_height ?? 1}U
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDevice(null)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Editable fields */}
                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    <FormField label="Device name">
                      <input
                        value={editForm.name}
                        onChange={(e) => { setEditForm((f) => ({ ...f, name: e.target.value })); setEditDirty(true); }}
                        placeholder={selectedDevice.id}
                        className={inputCls}
                      />
                    </FormField>

                    <FormField label="Device ID">
                      <input
                        value={editForm.id}
                        onChange={(e) => { setEditForm((f) => ({ ...f, id: e.target.value })); setEditDirty(true); }}
                        placeholder="dev-001"
                        className={`${inputCls} font-mono text-xs`}
                      />
                    </FormField>

                    <FormField
                      label="Instance / node"
                      hint="Prometheus identity. Supports patterns: compute[001-004]"
                    >
                      <input
                        value={editForm.instance}
                        onChange={(e) => { setEditForm((f) => ({ ...f, instance: e.target.value })); setEditDirty(true); }}
                        placeholder="compute001"
                        className={`${inputCls} font-mono text-xs`}
                      />
                    </FormField>

                    {/* Read-only info */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
                      {[
                        { label: 'Template', value: tpl?.name ?? selectedDevice.template_id },
                        { label: 'U position', value: `U${selectedDevice.u_position}` },
                        { label: 'Height', value: `${tpl?.u_height ?? 1}U` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-1 text-xs">
                          <span className="text-gray-400">{label}</span>
                          <span className="font-mono text-gray-600 dark:text-gray-400">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 space-y-2 border-t border-gray-100 p-4 dark:border-gray-800">
                    {editDirty && (
                      <button
                        onClick={applyDeviceEdit}
                        className="bg-brand-500 hover:bg-brand-600 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white transition-colors"
                      >
                        <Check className="h-4 w-4" /> Apply changes
                      </button>
                    )}
                    <button
                      onClick={() => deleteDevice(selectedDevice.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" /> Remove device
                    </button>
                  </div>
                </div>
              );
            })()

          /* ── Empty state ──────────────────────────────────────────────── */
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <Server className="h-6 w-6 text-gray-300 dark:text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  No device selected
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                  Click a device to view and edit it, or drag a template from the library
                </p>
              </div>
              {rack && (
                <div className="mt-2 space-y-1 text-left w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-600">Shortcuts</p>
                  {[
                    ['Del', 'Remove selected device'],
                    ['Esc', 'Deselect / cancel'],
                    ['⌘S', 'Save changes'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 dark:text-gray-500">{desc}</span>
                      <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">{key}</kbd>
                    </div>
                  ))}
                </div>
              )}
              {!rack && allRacks.length > 0 && (
                <button
                  onClick={() => setLeftTab('racks')}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Select a rack
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
