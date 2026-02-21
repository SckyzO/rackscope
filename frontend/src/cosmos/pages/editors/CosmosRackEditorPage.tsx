import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Server,
  Layers,
  Network,
  Zap,
  Thermometer,
  GripVertical,
  X,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Rack, Device, DeviceTemplate } from '../../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const U_PX = 24; // pixels per U (matches RackElevation scale)

const TYPE_BG: Record<string, string> = {
  server: '#0d1f3c',
  storage: '#241a04',
  network: '#071d27',
  pdu: '#241f03',
  cooling: '#051d1d',
  other: '#141a22',
};
const TYPE_BORDER: Record<string, string> = {
  server: '#2563eb',
  storage: '#d97706',
  network: '#0891b2',
  pdu: '#ca8a04',
  cooling: '#0d9488',
  other: '#374151',
};
const TYPE_TEXT: Record<string, string> = {
  server: '#60a5fa',
  storage: '#fbbf24',
  network: '#38bdf8',
  pdu: '#facc15',
  cooling: '#2dd4bf',
  other: '#9ca3af',
};

// ── TypeIcon ──────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  server: Server,
  storage: Layers,
  network: Network,
  pdu: Zap,
  cooling: Thermometer,
};

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  const Icon = ICONS[type] ?? Server;
  return <Icon className={className} />;
};

// ── TemplateCard ──────────────────────────────────────────────────────────────

type TemplateCardProps = {
  template: DeviceTemplate;
  onDragStart: (e: React.DragEvent) => void;
};

const TemplateCard = ({ template, onDragStart }: TemplateCardProps) => (
  <div
    draggable
    onDragStart={onDragStart}
    className="flex cursor-grab items-center gap-2.5 rounded-xl border border-gray-800 bg-gray-900 p-3 transition-all hover:border-gray-600 active:cursor-grabbing active:opacity-60"
  >
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{
        backgroundColor: TYPE_BG[template.type] ?? TYPE_BG.other,
        border: `1px solid ${TYPE_BORDER[template.type] ?? TYPE_BORDER.other}`,
      }}
    >
      <TypeIcon
        type={template.type}
        className="h-4 w-4"
        style={{ color: TYPE_TEXT[template.type] ?? TYPE_TEXT.other }}
      />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-semibold text-gray-300">{template.name}</p>
      <p className="text-[10px] text-gray-600">
        {template.type} · {template.u_height}U
      </p>
    </div>
    <GripVertical className="h-4 w-4 shrink-0 text-gray-700" />
  </div>
);

// ── DeviceSlot — placed device in the rack ────────────────────────────────────

type DeviceSlotProps = {
  device: Device;
  template: DeviceTemplate | undefined;
  uHeight: number;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
};

const DeviceSlot = ({
  device,
  template,
  uHeight,
  selected,
  onClick,
  onDelete,
}: DeviceSlotProps) => {
  const type = template?.type ?? 'other';
  return (
    <div
      onClick={onClick}
      style={{
        height: uHeight * U_PX,
        backgroundColor: TYPE_BG[type] ?? TYPE_BG.other,
        borderLeft: `3px solid ${TYPE_BORDER[type] ?? TYPE_BORDER.other}`,
        outline: selected ? `2px solid ${TYPE_BORDER[type] ?? TYPE_BORDER.other}` : undefined,
        outlineOffset: selected ? '1px' : undefined,
      }}
      className="relative flex w-full cursor-pointer items-center gap-2 px-2 transition-all hover:brightness-125"
    >
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-xs font-semibold"
          style={{ color: TYPE_TEXT[type] ?? TYPE_TEXT.other }}
        >
          {device.name || device.id}
        </p>
        {uHeight > 1 && <p className="truncate font-mono text-[10px] text-gray-600">{device.id}</p>}
      </div>
      {/* Delete button — always visible */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-500/20 text-red-400 transition-colors hover:bg-red-500 hover:text-white"
        title="Remove device"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const CosmosRackEditorPage = () => {
  const [allRacks, setAllRacks] = useState<
    Array<{ id: string; name: string; roomName: string; aisleName: string }>
  >([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [rack, setRack] = useState<Rack | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [draftDevices, setDraftDevices] = useState<Device[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dragTemplate, setDragTemplate] = useState<DeviceTemplate | null>(null);
  const [dragHoverU, setDragHoverU] = useState<number | null>(null);
  const rackContainerRef = useRef<HTMLDivElement>(null);
  const deviceCounterRef = useRef(0);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [placingTemplate, setPlacingTemplate] = useState<{
    template: DeviceTemplate;
    u: number;
  } | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceInstance, setNewDeviceInstance] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');

  // Load all racks + catalog
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [rooms, catalog] = await Promise.all([api.getRooms(), api.getCatalog()]);
        if (!active) return;
        const racks: Array<{ id: string; name: string; roomName: string; aisleName: string }> = [];
        (Array.isArray(rooms) ? rooms : []).forEach((room) => {
          (room.aisles ?? []).forEach((aisle) => {
            (aisle.racks ?? []).forEach((r) => {
              racks.push({
                id: r.id,
                name: r.name || r.id,
                roomName: room.name,
                aisleName: aisle.name,
              });
            });
          });
          (room.standalone_racks ?? []).forEach((r) => {
            racks.push({
              id: r.id,
              name: r.name || r.id,
              roomName: room.name,
              aisleName: 'Standalone',
            });
          });
        });
        setAllRacks(racks);
        const dc: Record<string, DeviceTemplate> = {};
        (catalog?.device_templates ?? []).forEach((t: DeviceTemplate) => {
          dc[t.id] = t;
        });
        setDeviceCatalog(dc);
        if (racks.length > 0 && !selectedRackId) setSelectedRackId(racks[0].id);
      } catch {
        /* ignore */
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [selectedRackId]);

  // Load rack on selection change
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
        setPlacingTemplate(null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedRackId]);

  // U occupancy map
  const uMap = useMemo(() => {
    const map = new Map<number, Device>();
    draftDevices.forEach((dev) => {
      const tpl = deviceCatalog[dev.template_id];
      const h = tpl?.u_height ?? 1;
      for (let u = dev.u_position; u < dev.u_position + h; u++) map.set(u, dev);
    });
    return map;
  }, [draftDevices, deviceCatalog]);

  // DnD
  const handleDragStart = (e: React.DragEvent, tpl: DeviceTemplate) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', tpl.id);
    setDragTemplate(tpl);
  };

  const handleDragEnd = () => {
    setDragTemplate(null);
    setDragHoverU(null);
  };

  const handleSlotDragEnter = (u: number) => {
    if (dragTemplate) setDragHoverU(u);
  };

  const handleSlotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleSlotDrop = (e: React.DragEvent, u: number) => {
    e.preventDefault();
    if (!dragTemplate || !rack) {
      setDragTemplate(null);
      setDragHoverU(null);
      return;
    }
    const h = dragTemplate.u_height ?? 1;
    const valid = Array.from({ length: h }, (_, i) => u + i).every(
      (slot) => slot >= 1 && slot <= rack.u_height && !uMap.has(slot)
    );
    if (!valid) {
      setDragHoverU(null);
      return;
    }
    setPlacingTemplate({ template: dragTemplate, u });
    setNewDeviceName(dragTemplate.name);
    setNewDeviceInstance('');
    deviceCounterRef.current += 1;
    setNewDeviceId(`dev-${deviceCounterRef.current}`);
    setDragTemplate(null);
    setDragHoverU(null);
  };

  const handleRackContainerDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (!rackContainerRef.current?.contains(related)) {
      setDragHoverU(null);
    }
  };

  const confirmPlacement = () => {
    if (!placingTemplate || !rack) return;
    const newDev: Device = {
      id: newDeviceId || `dev-${deviceCounterRef.current}`,
      name: newDeviceName || placingTemplate.template.name,
      template_id: placingTemplate.template.id,
      u_position: placingTemplate.u,
      instance: newDeviceInstance.trim() || null,
      nodes: null,
      labels: null,
    };
    setDraftDevices((prev) => [...prev, newDev]);
    setDirty(true);
    setPlacingTemplate(null);
    setSelectedDevice(newDev);
  };

  const deleteDevice = (deviceId: string) => {
    setDraftDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setDirty(true);
    if (selectedDevice?.id === deviceId) setSelectedDevice(null);
  };

  const handleSave = async () => {
    if (!selectedRackId) return;
    setSaveStatus('saving');
    try {
      await api.updateRackDevices(selectedRackId, draftDevices);
      setDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const uHeight = rack?.u_height ?? 42;
  const slots = Array.from({ length: uHeight }, (_, i) => i + 1);
  const filteredTemplates = Object.values(deviceCatalog).filter(
    (t) =>
      (!search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || t.type === typeFilter)
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <Server className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Rack Editor</h1>
            <p className="text-xs text-gray-500">Drag templates onto rack slots to place devices</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedRackId ?? ''}
            onChange={(e) => setSelectedRackId(e.target.value)}
            className="focus:border-brand-500 max-w-xs truncate rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none"
          >
            {allRacks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomName} / {r.aisleName} / {r.name}
              </option>
            ))}
          </select>
          {dirty && (
            <button
              onClick={() => void handleSave()}
              disabled={saveStatus === 'saving'}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save
            </button>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Error
            </span>
          )}
        </div>
      </div>

      {/* 3-column body */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: Template library */}
        <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-gray-800 bg-gray-950">
          <div className="space-y-2 border-b border-gray-800 p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="focus:border-brand-500 w-full rounded-xl border border-gray-800 bg-gray-900 py-2 pr-3 pl-9 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {['', 'server', 'storage', 'network', 'pdu'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${typeFilter === t ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
                >
                  {t || 'All'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
            {filteredTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} onDragStart={(e) => handleDragStart(e, t)} />
            ))}
          </div>
          <div className="border-t border-gray-800 px-4 py-2">
            <p className="text-[10px] text-gray-700">Drag a template onto a rack slot</p>
          </div>
        </aside>

        {/* CENTER: Rack visualization — same style as RackElevation */}
        <main className="min-h-0 flex-1 overflow-hidden bg-[var(--color-bg-base)]">
          {!rack ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-brand-500 h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-gray-800 px-6 py-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-white">{rack.name}</h2>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 font-mono text-[10px] text-gray-500">
                    {rack.id}
                  </span>
                  <span className="text-xs text-gray-600">{uHeight}U</span>
                  <span className="text-xs text-gray-600">
                    {draftDevices.length} device{draftDevices.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-6">
                <div className="mx-auto max-w-xl px-12">
                  {/* Rack frame: border-x-[24px] = side rails, flex-col-reverse = U1 bottom */}
                  <div
                    ref={rackContainerRef}
                    onDragLeave={handleRackContainerDragLeave}
                    onDragEnd={handleDragEnd}
                    className="relative flex flex-col-reverse rounded-sm border-x-[24px] border-gray-700 bg-gray-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  >
                    {slots.map((u) => {
                      const dev = uMap.get(u);
                      const isStart = !dev || dev.u_position === u;
                      if (!isStart) return null;

                      const tpl = dev ? deviceCatalog[dev.template_id] : undefined;
                      const devUHeight = tpl?.u_height ?? 1;
                      const isHover =
                        dragTemplate !== null &&
                        dragHoverU !== null &&
                        u >= dragHoverU &&
                        u < dragHoverU + (dragTemplate.u_height ?? 1);

                      if (dev) {
                        return (
                          <div
                            key={u}
                            style={{ flex: `0 0 ${devUHeight * U_PX}px` }}
                            className="relative flex min-h-0 w-full items-center border-b border-white/5"
                          >
                            <div className="pointer-events-none absolute -left-[20px] z-10 flex h-full w-4 items-center justify-center font-mono text-[9px] font-black text-white opacity-40 select-none">
                              {u}
                            </div>
                            <div className="pointer-events-none absolute -right-[20px] z-10 flex h-full w-4 items-center justify-center font-mono text-[9px] font-black text-white opacity-40 select-none">
                              {u}
                            </div>
                            <div className="relative h-full w-full px-0.5 py-[1px]">
                              <DeviceSlot
                                device={dev}
                                template={tpl}
                                uHeight={devUHeight}
                                selected={selectedDevice?.id === dev.id}
                                onClick={() => setSelectedDevice(dev)}
                                onDelete={() => deleteDevice(dev.id)}
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={u}
                          style={{ flex: `0 0 ${U_PX}px` }}
                          className={`relative flex min-h-0 w-full items-center border-b border-white/5 transition-colors ${isHover ? 'bg-brand-500/20' : 'bg-[var(--color-empty-slot)]/5'}`}
                          onDragEnter={() => handleSlotDragEnter(u)}
                          onDragOver={handleSlotDragOver}
                          onDrop={(e) => handleSlotDrop(e, u)}
                        >
                          <div className="pointer-events-none absolute -left-[20px] z-10 flex h-full w-4 items-center justify-center font-mono text-[9px] font-black text-white opacity-40 select-none">
                            {u}
                          </div>
                          <div className="pointer-events-none absolute -right-[20px] z-10 flex h-full w-4 items-center justify-center font-mono text-[9px] font-black text-white opacity-40 select-none">
                            {u}
                          </div>
                          {isHover && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="text-brand-400 font-mono text-[10px] font-bold">
                                Drop — {dragTemplate?.name}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: Detail / placement form */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-gray-800 bg-gray-950">
          {placingTemplate ? (
            <div className="space-y-4 p-5">
              <div>
                <h3 className="text-sm font-bold text-white">Place device</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {placingTemplate.template.name} at U{placingTemplate.u}
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Device name</label>
                  <input
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Device ID</label>
                  <input
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                    placeholder="auto-generated"
                    className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Instance / node name</label>
                  <input
                    value={newDeviceInstance}
                    onChange={(e) => setNewDeviceInstance(e.target.value)}
                    placeholder="e.g. compute001 or compute[001-004]"
                    className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-700">
                    Maps this device to Prometheus metrics
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPlacingTemplate(null)}
                  className="flex-1 rounded-xl border border-gray-700 py-2 text-sm text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPlacement}
                  className="bg-brand-500 hover:bg-brand-600 flex-1 rounded-xl py-2 text-sm font-semibold text-white"
                >
                  Place
                </button>
              </div>
            </div>
          ) : selectedDevice ? (
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectedDevice.name || selectedDevice.id}
                  </h3>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500">{selectedDevice.id}</p>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-gray-600 hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-900 p-3">
                {[
                  { label: 'U Position', value: `U${selectedDevice.u_position}` },
                  {
                    label: 'Template',
                    value:
                      deviceCatalog[selectedDevice.template_id]?.name ?? selectedDevice.template_id,
                  },
                  { label: 'Type', value: deviceCatalog[selectedDevice.template_id]?.type ?? '—' },
                  {
                    label: 'Height',
                    value: `${deviceCatalog[selectedDevice.template_id]?.u_height ?? 1}U`,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-mono text-gray-300">{value}</span>
                  </div>
                ))}
                {selectedDevice.instance && (
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="shrink-0 text-gray-500">Instance</span>
                    <span className="text-right font-mono break-all text-gray-300">
                      {typeof selectedDevice.instance === 'string'
                        ? selectedDevice.instance
                        : JSON.stringify(selectedDevice.instance)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteDevice(selectedDevice.id)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20"
              >
                <X className="h-4 w-4" /> Remove Device
              </button>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <Server className="h-10 w-10 text-gray-800" />
              <p className="text-sm text-gray-600">No device selected</p>
              <p className="text-xs text-gray-700">
                Drag a template onto a free slot, or click a device
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
