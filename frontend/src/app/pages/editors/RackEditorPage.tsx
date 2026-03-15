/**
 * RackEditorPage
 *
 * Layout: PageHeader (EmptyPage template) + 3-panel workspace
 *   Left  (~260px) : Tabs [Racks | Templates]
 *   Center (flex)  : Rack visualization — always dark, hero of the page
 *   Right (~280px) : Context panel — placement form / device editor / empty state
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  ChevronDown,
  Plus,
  ExternalLink,
  FileCode2,
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import * as jsYaml from 'js-yaml';
import { api } from '@src/services/api';
import type { Rack, Device, DeviceTemplate, RackTemplate } from '@src/types';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';
import { PageActionButton } from '@app/components/PageActionButton';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  server: { bg: '#0d1f3c', border: '#2563eb', text: '#60a5fa' },
  storage: { bg: '#241a04', border: '#d97706', text: '#fbbf24' },
  network: { bg: '#071d27', border: '#0891b2', text: '#38bdf8' },
  pdu: { bg: '#241f03', border: '#ca8a04', text: '#facc15' },
  cooling: { bg: '#051d1d', border: '#0d9488', text: '#2dd4bf' },
  other: { bg: '#141a22', border: '#374151', text: '#9ca3af' },
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

type RackEntry = {
  id: string;
  name: string;
  roomId: string;
  roomName: string;
  aisleId: string;
  aisleName: string;
};

type AisleEntry = {
  id: string;
  name: string;
  roomName: string;
};

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
      selected ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
    ].join(' ')}
  >
    <span
      className={`truncate text-xs font-semibold ${
        selected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'
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
        <p className="text-xs leading-snug font-semibold text-gray-800 dark:text-gray-200">
          {template.name}
        </p>
        <p className="text-[10px] text-gray-400 capitalize dark:text-gray-500">
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

export const RackEditorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  // Accordion open rooms (flush style)
  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set());
  const [openTemplateTypes, setOpenTemplateTypes] = useState<Set<string>>(new Set());

  // Rack templates + aisle list (for New Rack wizard)
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [allAisles, setAllAisles] = useState<AisleEntry[]>([]);

  // New Rack wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardForm, setWizardForm] = useState({
    name: '',
    id: '',
    uHeight: '42',
    templateId: '',
    aisleId: '',
  });
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

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
  const [yamlDrawerOpen, setYamlDrawerOpen] = useState(false);

  // Canvas sizing
  const rackContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
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
        const aisles: AisleEntry[] = [];
        (Array.isArray(rooms) ? rooms : []).forEach((room) => {
          (room.aisles ?? []).forEach((aisle) => {
            aisles.push({ id: aisle.id, name: aisle.name, roomName: room.name });
            (aisle.racks ?? []).forEach((r) => {
              racks.push({
                id: r.id,
                name: r.name || r.id,
                roomId: room.id,
                roomName: room.name,
                aisleId: aisle.id,
                aisleName: aisle.name,
              });
            });
          });
          (room.standalone_racks ?? []).forEach((r) => {
            racks.push({
              id: r.id,
              name: r.name || r.id,
              roomId: room.id,
              roomName: room.name,
              aisleId: '',
              aisleName: 'Standalone',
            });
          });
        });
        setAllRacks(racks);
        setAllAisles(aisles);

        const dc: Record<string, DeviceTemplate> = {};
        (catalog?.device_templates ?? []).forEach((t: DeviceTemplate) => {
          dc[t.id] = t;
        });
        setDeviceCatalog(dc);
        setRackTemplates(catalog?.rack_templates ?? []);

        // Auto-select: URL param → first rack
        if (!selectedRackId && racks.length > 0) setSelectedRackId(racks[0].id);
      } catch {
        /* noop */
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load selected rack ────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedRackId) return;
    let active = true;
    api
      .getRack(selectedRackId)
      .then((data) => {
        if (!active) return;
        setRack(data);
        setDraftDevices(data?.devices ?? []);
        setDirty(false);
        setSelectedDevice(null);
        setPlacing(null);
        setEditDirty(false);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
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
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

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
  const usedU = draftDevices.reduce(
    (acc, d) => acc + (deviceCatalog[d.template_id]?.u_height ?? 1),
    0
  );
  const density = totalU > 0 ? usedU / totalU : 0;

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
          !templateSearch ||
          t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
          t.id.toLowerCase().includes(templateSearch.toLowerCase())
      ),
    [deviceCatalog, templateSearch]
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
    if (!rack) {
      setDragHoverU(null);
      return;
    }

    let activeDevice = dragDeviceRef.current;
    const activeTpl = dragTemplateRef.current;

    // Recover device from dataTransfer if ref was lost (cross-component drop)
    if (!activeDevice && !activeTpl) {
      const id = e.dataTransfer.getData('text/plain');
      activeDevice = draftDevices.find((d) => d.id === id) ?? null;
    }

    if (activeDevice) {
      const ad = activeDevice; // narrowed const to avoid non-null assertions in callbacks
      const h = deviceCatalog[ad.template_id]?.u_height ?? 1;
      const own = new Set(Array.from({ length: h }, (_, i) => ad.u_position + i));
      const valid = Array.from({ length: h }, (_, i) => u + i).every(
        (slot) => slot >= 1 && slot <= rack.u_height && (!uMap.has(slot) || own.has(slot))
      );
      if (valid && u !== ad.u_position) {
        setDraftDevices((prev) => prev.map((d) => (d.id === ad.id ? { ...d, u_position: u } : d)));
        setDirty(true);
        if (selectedDevice?.id === ad.id)
          setSelectedDevice((prev) => (prev ? { ...prev, u_position: u } : null));
      }
      dragDeviceRef.current = null;
      setDragDevice(null);
      setDragHoverU(null);
      return;
    }

    if (!activeTpl) {
      setDragHoverU(null);
      return;
    }

    const h = activeTpl.u_height ?? 1;
    const valid = Array.from({ length: h }, (_, i) => u + i).every(
      (slot) => slot >= 1 && slot <= rack.u_height && !uMap.has(slot)
    );
    if (!valid) {
      setDragHoverU(null);
      return;
    }

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

  // Parse the instance textarea value back to its original type.
  // The textarea may contain a JSON array, object, or plain string (pattern / node name).
  const parseInstance = (raw: string): string | Record<string, string> | string[] => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      return JSON.parse(trimmed) as Record<string, string> | string[];
    } catch {
      return trimmed;
    }
  };

  const confirmPlacement = () => {
    if (!placing || !rack) return;
    const newDev: Device = {
      id: placingForm.id.trim() || `dev-${deviceCounterRef.current}`,
      name: placingForm.name.trim() || placing.template.name,
      template_id: placing.template.id,
      u_position: placing.u,
      instance: parseInstance(placingForm.instance),
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
  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    []
  );

  const applyDeviceEdit = () => {
    if (!selectedDevice) return;
    const updated: Device = {
      ...selectedDevice,
      name: editForm.name.trim() || selectedDevice.name,
      id: editForm.id.trim() || selectedDevice.id,
      instance: parseInstance(editForm.instance),
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

  // ── New Rack wizard ───────────────────────────────────────────────────────

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  const handleWizardCreate = async () => {
    if (!wizardForm.name.trim()) {
      setWizardError('Rack name is required');
      return;
    }
    if (!wizardForm.aisleId) {
      setWizardError('Please select an aisle');
      return;
    }
    setWizardSaving(true);
    setWizardError(null);
    try {
      const result = await api.createRack(wizardForm.aisleId, {
        name: wizardForm.name.trim(),
        id: wizardForm.id.trim() || null,
        u_height: parseInt(wizardForm.uHeight, 10) || 42,
        template_id: wizardForm.templateId || null,
      });
      setWizardOpen(false);
      setWizardForm({ name: '', id: '', uHeight: '42', templateId: '', aisleId: '' });
      // Reload rack list and select new rack
      const rooms = await api.getRooms();
      const racks: RackEntry[] = [];
      const aisles: AisleEntry[] = [];
      (Array.isArray(rooms) ? rooms : []).forEach((room) => {
        (room.aisles ?? []).forEach((aisle) => {
          aisles.push({ id: aisle.id, name: aisle.name, roomName: room.name });
          (aisle.racks ?? []).forEach((r) => {
            racks.push({
              id: r.id,
              name: r.name || r.id,
              roomId: room.id,
              roomName: room.name,
              aisleId: aisle.id,
              aisleName: aisle.name,
            });
          });
        });
        (room.standalone_racks ?? []).forEach((r) => {
          racks.push({
            id: r.id,
            name: r.name || r.id,
            roomId: room.id,
            roomName: room.name,
            aisleId: '',
            aisleName: 'Standalone',
          });
        });
      });
      setAllRacks(racks);
      setAllAisles(aisles);
      setSelectedRackId(result.rack_id);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Failed to create rack');
    } finally {
      setWizardSaving(false);
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
      if (e.key === 'Escape') {
        setSelectedDevice(null);
        setPlacing(null);
        return;
      }
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
    Array.from({ length: dragH }, (_, i) => dragHoverU + i).every(
      (slot) =>
        slot >= 1 &&
        slot <= totalU &&
        (dragDevice ? !uMap.has(slot) || uMap.get(slot)?.id === dragDevice.id : !uMap.has(slot))
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
                { label: 'Home', href: '/' },
                { label: 'Editors' },
                ...(selectedRackEntry
                  ? [
                      {
                        label: selectedRackEntry.roomName,
                        onClick: () => {
                          /* Could navigate to datacenter editor */
                        },
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
              {rack && (
                <PageActionButton icon={FileCode2} onClick={() => setYamlDrawerOpen(true)}>
                  Edit YAML
                </PageActionButton>
              )}
              <PageActionButton variant="primary" icon={Plus} onClick={() => setWizardOpen(true)}>
                New Rack
              </PageActionButton>
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

        <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Tabs */}
          <div className="flex shrink-0 border-b border-gray-100 dark:border-gray-800">
            {(['racks', 'templates'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={[
                  'flex-1 py-3 text-xs font-semibold capitalize transition-colors',
                  leftTab === tab
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400 border-b-2'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Racks tab ─────────────────────────────────────────────────── */}
          {leftTab === 'racks' && (
            <>
              {/* Search */}
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

              {/* Accordion — card style, collapsed by default */}
              <div className="flex-1 overflow-y-auto">
                {filteredRacks.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">No racks found</p>
                ) : (
                  <div className="space-y-1 p-2">
                    {Array.from(racksByRoom.entries()).map(([roomName, racks]) => {
                      const isOpen = openRooms.has(roomName);
                      return (
                        <div
                          key={roomName}
                          className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
                        >
                          <button
                            onClick={() =>
                              setOpenRooms((prev) => {
                                const next = new Set(prev);
                                if (isOpen) {
                                  next.delete(roomName);
                                } else {
                                  next.add(roomName);
                                }
                                return next;
                              })
                            }
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                          >
                            <div className="bg-brand-500/60 h-2 w-2 shrink-0 rounded-full" />
                            <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {roomName}
                            </span>
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              {racks.length}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isOpen && (
                            <div className="border-t border-gray-100 dark:border-gray-800">
                              {(() => {
                                const byAisle = new Map<
                                  string,
                                  { aisleName: string; racks: RackEntry[] }
                                >();
                                racks.forEach((r) => {
                                  const key = r.aisleId || 'standalone';
                                  const existing = byAisle.get(key) ?? {
                                    aisleName: r.aisleName,
                                    racks: [],
                                  };
                                  existing.racks.push(r);
                                  byAisle.set(key, existing);
                                });
                                return Array.from(byAisle.entries()).map(
                                  ([aisleKey, { aisleName, racks: aisleRacks }]) => (
                                    <div key={aisleKey} className="pt-1 pb-2">
                                      <p className="mb-0.5 px-3 text-[10px] font-medium tracking-wide text-gray-400 dark:text-gray-600">
                                        {aisleName}
                                      </p>
                                      {aisleRacks.map((r) => (
                                        <RackListItem
                                          key={r.id}
                                          rack={r}
                                          selected={selectedRackId === r.id}
                                          onClick={() => {
                                            if (
                                              dirty &&
                                              !confirm('Unsaved changes — switch racks anyway?')
                                            )
                                              return;
                                            setSelectedRackId(r.id);
                                          }}
                                        />
                                      ))}
                                    </div>
                                  )
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 dark:text-gray-600">
                  {allRacks.length} rack{allRacks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}

          {/* ── Templates tab — accordion by type, collapsed by default ───── */}
          {leftTab === 'templates' && (
            <>
              <div className="shrink-0 p-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-2 pr-3 pl-8 text-xs placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-400">No templates found</p>
                ) : (
                  (() => {
                    // Group by type
                    const byType = new Map<string, DeviceTemplate[]>();
                    filteredTemplates.forEach((t) => {
                      const g = byType.get(t.type) ?? [];
                      g.push(t);
                      byType.set(t.type, g);
                    });
                    return (
                      <div className="space-y-1 p-2">
                        {Array.from(byType.entries()).map(([type, templates]) => {
                          const isOpen = openTemplateTypes.has(type);
                          const col = TYPE_COLORS[type] ?? TYPE_COLORS.other;
                          return (
                            <div
                              key={type}
                              className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
                            >
                              <button
                                onClick={() =>
                                  setOpenTemplateTypes((prev) => {
                                    const next = new Set(prev);
                                    if (isOpen) {
                                      next.delete(type);
                                    } else {
                                      next.add(type);
                                    }
                                    return next;
                                  })
                                }
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                              >
                                <div
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: col.border }}
                                />
                                <span className="flex-1 text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                                  {type}
                                </span>
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                  {templates.length}
                                </span>
                                <ChevronDown
                                  className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                />
                              </button>
                              {isOpen && (
                                <div className="space-y-1.5 border-t border-gray-100 p-2 dark:border-gray-800">
                                  {templates.map((t) => (
                                    <TemplateCard
                                      key={t.id}
                                      template={t}
                                      onDragStart={(e) => handleTemplateDragStart(e, t)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
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
                <Loader2 className="text-brand-500 h-8 w-8 animate-spin" />
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
                  <span className="text-[11px] text-[var(--color-text-base)] opacity-40">
                    {totalU}U
                  </span>
                  <span className="text-[11px] text-[var(--color-text-base)] opacity-40">
                    {draftDevices.length} device{draftDevices.length !== 1 ? 's' : ''}
                  </span>

                  {/* Density bar */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] text-[var(--color-text-base)] opacity-40">
                      {usedU}/{totalU}U
                    </span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-border)]/30">
                      <div
                        className="from-brand-500 to-brand-400 h-full rounded-full bg-gradient-to-r transition-all duration-500"
                        style={{ width: `${Math.min(100, density * 100)}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-[10px] text-[var(--color-text-base)] opacity-40">
                      {Math.round(density * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Rack visualization — rack fills full height via flex distribution */}
              <div ref={canvasRef} className="relative flex-1 overflow-hidden py-5">
                <div className="mx-auto flex h-full w-full max-w-sm flex-col px-6">
                  <div
                    ref={rackContainerRef}
                    onDragLeave={handleRackDragLeave}
                    onDragEnd={handleDragEnd}
                    className="relative flex flex-1 flex-col-reverse rounded-sm border-x-[24px] border-[var(--color-rack-frame)] bg-[var(--color-rack-frame)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-colors duration-500"
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
                          className={`pointer-events-none absolute top-0 flex h-full w-[20px] items-center justify-center font-mono text-[8px] font-black text-[var(--color-text-base)] opacity-40 select-none ${align === 'left' ? '-left-[20px]' : '-right-[20px]'}`}
                        >
                          {u}
                        </div>
                      );

                      if (dev) {
                        return (
                          <div
                            key={u}
                            style={{ flex: devH }}
                            className="relative flex min-h-0 w-full items-center border-b border-[var(--color-border)]/10"
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
                                className="group/dev relative flex h-full w-full cursor-grab items-center rounded-[2px] bg-[var(--color-device-surface)] transition-all hover:brightness-110 active:cursor-grabbing"
                              >
                                {/* Left status bar — same pattern as rack view */}
                                <div
                                  className="absolute top-0 left-0 h-full w-1.5 shrink-0 rounded-l-[2px] opacity-90"
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
                                    style={{
                                      outline: `2px solid ${col.border}`,
                                      outlineOffset: '1px',
                                    }}
                                  />
                                )}

                                {/* Content */}
                                <div className="min-w-0 flex-1 pr-2 pl-4">
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
                                  className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-500/20 text-red-400 opacity-0 transition-all group-hover/dev:opacity-100 hover:bg-red-500 hover:text-white"
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
                          style={{ flex: 1 }}
                          className={[
                            'relative flex min-h-0 w-full items-center border-b border-[var(--color-border)]/10 transition-colors',
                            hovered ? (valid ? 'bg-brand-500/20' : 'bg-red-500/15') : '',
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
                      <span className="font-semibold text-white">
                        {undoItem.name || undoItem.id}
                      </span>{' '}
                      removed
                    </span>
                    <button
                      onClick={handleUndo}
                      className="bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-1 text-xs font-semibold text-white transition-colors"
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
        <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
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
                  <span
                    className="min-w-0 flex-1 truncate text-xs font-semibold"
                    style={{ color: c(placing.template.type).text }}
                  >
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
                  hint="Prometheus identity. Supports patterns: compute[001-004] or JSON slot maps."
                >
                  <textarea
                    value={placingForm.instance}
                    onChange={(e) => setPlacingForm((f) => ({ ...f, instance: e.target.value }))}
                    placeholder='compute001  or  {"1":"compute055","2":"compute056"}'
                    rows={3}
                    className={`${inputCls} min-h-[60px] resize-y font-mono text-xs`}
                  />
                </FormField>
              </div>

              <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
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
          ) : /* ── Device edit panel ────────────────────────────────────────── */
          selectedDevice ? (
            (() => {
              const tpl = deviceCatalog[selectedDevice.template_id];
              const type = tpl?.type ?? 'other';
              const col = c(type);
              return (
                <div className="flex flex-1 flex-col">
                  {/* Device header */}
                  <div
                    className="flex shrink-0 items-center gap-2.5 px-5 py-4"
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
                      <p className="text-[10px] text-gray-400 capitalize">
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
                        onChange={(e) => {
                          setEditForm((f) => ({ ...f, name: e.target.value }));
                          setEditDirty(true);
                        }}
                        placeholder={selectedDevice.id}
                        className={inputCls}
                      />
                    </FormField>

                    <FormField label="Device ID">
                      <input
                        value={editForm.id}
                        onChange={(e) => {
                          setEditForm((f) => ({ ...f, id: e.target.value }));
                          setEditDirty(true);
                        }}
                        placeholder="dev-001"
                        className={`${inputCls} font-mono text-xs`}
                      />
                    </FormField>

                    <FormField
                      label="Instance / node"
                      hint="Prometheus identity. Supports patterns: compute[001-004] or JSON slot maps."
                    >
                      <textarea
                        value={editForm.instance}
                        onChange={(e) => {
                          setEditForm((f) => ({ ...f, instance: e.target.value }));
                          setEditDirty(true);
                        }}
                        placeholder='compute001  or  {"1":"compute055","2":"compute056"}'
                        rows={3}
                        className={`${inputCls} min-h-[60px] resize-y font-mono text-xs`}
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
                          <span className="font-mono text-gray-600 dark:text-gray-400">
                            {value}
                          </span>
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
                      onClick={() => navigate('/editors/templates')}
                      title="Open this template in the Device Template editor"
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <ExternalLink className="h-4 w-4" /> Open template editor
                    </button>
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
          ) : (
            /* ── Empty state ──────────────────────────────────────────────── */
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
                <div className="mt-2 w-full space-y-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                    Shortcuts
                  </p>
                  {[
                    ['Del', 'Remove selected device'],
                    ['Esc', 'Deselect / cancel'],
                    ['⌘S', 'Save changes'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 dark:text-gray-500">{desc}</span>
                      <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {key}
                      </kbd>
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

      {/* ── New Rack Wizard Modal ──────────────────────────────────────────── */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <button
              onClick={() => {
                setWizardOpen(false);
                setWizardError(null);
              }}
              className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Rack</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create an empty rack and add it to an aisle
            </p>

            <div className="mt-5 space-y-4">
              {/* Name */}
              <FormField label="Rack name *">
                <input
                  autoFocus
                  value={wizardForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setWizardForm((f) => ({
                      ...f,
                      name,
                      id: f.id || slugify(name),
                    }));
                  }}
                  placeholder="Rack XH3000 Compute 01"
                  className={inputCls}
                />
              </FormField>

              {/* ID */}
              <FormField label="Rack ID" hint="Auto-generated — used in YAML files and URLs">
                <input
                  value={wizardForm.id}
                  onChange={(e) => setWizardForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="rack-compute-01"
                  className={`${inputCls} font-mono text-xs`}
                />
              </FormField>

              {/* U-height + template side by side */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="U Height">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={wizardForm.uHeight}
                    onChange={(e) => setWizardForm((f) => ({ ...f, uHeight: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Rack template">
                  <select
                    value={wizardForm.templateId}
                    onChange={(e) => setWizardForm((f) => ({ ...f, templateId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {rackTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Target aisle */}
              <FormField label="Add to aisle *">
                <select
                  value={wizardForm.aisleId}
                  onChange={(e) => setWizardForm((f) => ({ ...f, aisleId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Select an aisle —</option>
                  {allAisles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.roomName} › {a.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {wizardError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  <p className="text-xs text-red-600 dark:text-red-400">{wizardError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setWizardOpen(false);
                  setWizardError(null);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleWizardCreate()}
                disabled={wizardSaving}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              >
                {wizardSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {wizardSaving ? 'Creating…' : 'Create Rack'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── YAML Drawer ─────────────────────────────────────────────────────── */}
      {rack && (
        <RackYamlDrawer
          open={yamlDrawerOpen}
          rack={rack}
          onSave={async (updated) => {
            // Bulk-replace all devices, then reload
            await api.updateRackDevices(rack.id, updated.devices ?? []);
            const refreshed = await api.getRack(rack.id);
            setRack(refreshed);
          }}
          onClose={() => setYamlDrawerOpen(false)}
        />
      )}
    </div>
  );
};

// ── RackYamlDrawer ─────────────────────────────────────────────────────────────

type RackYamlDrawerProps = {
  open: boolean;
  rack: Rack;
  onSave: (parsed: Rack) => Promise<void>;
  onClose: () => void;
};

const RackYamlDrawer = ({ open, rack, onSave, onClose }: RackYamlDrawerProps) => {
  const toYaml = (r: Rack) =>
    jsYaml.dump(
      {
        id: r.id,
        name: r.name,
        u_height: r.u_height,
        template_id: r.template_id ?? null,
        devices: (r.devices ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          template_id: d.template_id,
          u_position: d.u_position,
          ...(d.instance !== undefined && d.instance !== null ? { instance: d.instance } : {}),
        })),
      },
      { lineWidth: 120, quotingType: '"' }
    );

  const [value, setValue] = useState(() => toYaml(rack));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setValue(toYaml(rack));
    setSaved(false);
    setParseError(null);
    setSaveError(null);
  }, [rack, open]); // rack reference changes when loaded — recompute YAML

  const handleChange = (val: string | undefined) => {
    const v = val ?? '';
    setValue(v);
    try {
      jsYaml.load(v);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid YAML');
    }
  };

  const handleSave = async () => {
    if (parseError) return;
    setSaving(true);
    setSaveError(null);
    try {
      const parsed = jsYaml.load(value) as Rack;
      await onSave(parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-[680px] flex-col border-l border-gray-800 bg-gray-950 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-white">{rack.name} — YAML</span>
            {parseError && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                Invalid YAML
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white/10 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <MonacoEditor
            height="100%"
            defaultLanguage="yaml"
            theme="vs-dark"
            value={value}
            onChange={handleChange}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'off',
              tabSize: 2,
            }}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-800 px-5 py-3">
          <div className="text-xs text-gray-500">
            Editing <code className="text-gray-400">{rack.id}</code> — devices are bulk-replaced on
            save
          </div>
          <div className="flex items-center gap-2">
            {saveError && <span className="text-xs text-red-400">{saveError}</span>}
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5"
            >
              Close
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !!parseError}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
