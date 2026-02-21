import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Server,
  Layers,
  Plus,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Device, DeviceTemplate, Rack, RoomSummary } from '../../../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const U_SLOT_HEIGHT = 28;

const DEVICE_TYPE_COLORS: Record<string, string> = {
  server: 'bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30',
  switch: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30',
  storage: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
  pdu: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/30',
};

const DEVICE_TYPE_LABEL_COLORS: Record<string, string> = {
  server: 'text-brand-600 dark:text-brand-400',
  switch: 'text-blue-600 dark:text-blue-400',
  storage: 'text-amber-600 dark:text-amber-400',
  pdu: 'text-yellow-600 dark:text-yellow-400',
};

// ─── Module-level sub-components ────────────────────────────────────────────

type RackOptionSelectorProps = {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
};

const RackOptionSelector = ({ options, value, onChange }: RackOptionSelectorProps) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="focus:border-brand-400 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
  >
    {options.length === 0 && <option value="">No racks available</option>}
    {options.map((o) => (
      <option key={o.id} value={o.id}>
        {o.label}
      </option>
    ))}
  </select>
);

type TemplateLibraryItemProps = {
  template: DeviceTemplate;
  onClick: () => void;
};

const TemplateLibraryItem = ({ template, onClick }: TemplateLibraryItemProps) => (
  <button
    onClick={onClick}
    className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
  >
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${DEVICE_TYPE_COLORS[template.type] ?? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}
    >
      <Server
        className={`h-3.5 w-3.5 ${DEVICE_TYPE_LABEL_COLORS[template.type] ?? 'text-gray-500'}`}
      />
    </div>
    <div className="min-w-0">
      <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
        {template.name}
      </p>
      <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
        {template.type} · {template.u_height}U
      </p>
    </div>
  </button>
);

type SlotRowProps = {
  u: number;
  device: Device | null;
  template: DeviceTemplate | undefined;
  selected: boolean;
  spanned: boolean;
  onClickEmpty: () => void;
  onClickDevice: () => void;
};

const SlotRow = ({
  u,
  device,
  template,
  selected,
  spanned,
  onClickEmpty,
  onClickDevice,
}: SlotRowProps) => {
  if (spanned) return null;

  if (!device) {
    return (
      <div
        style={{ height: `${U_SLOT_HEIGHT}px` }}
        className="flex cursor-pointer items-center gap-2 border-b border-dashed border-gray-200 px-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        onClick={onClickEmpty}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClickEmpty()}
      >
        <span className="w-7 shrink-0 text-right font-mono text-[10px] text-gray-300 dark:text-gray-700">
          U{u}
        </span>
        <span className="text-[10px] text-gray-300 dark:text-gray-700">—</span>
      </div>
    );
  }

  const uHeight = template?.u_height ?? 1;
  const typeColor =
    DEVICE_TYPE_COLORS[template?.type ?? ''] ??
    'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
  const labelColor =
    DEVICE_TYPE_LABEL_COLORS[template?.type ?? ''] ?? 'text-gray-500 dark:text-gray-400';

  return (
    <div
      style={{ height: `${U_SLOT_HEIGHT * uHeight}px` }}
      className={`flex cursor-pointer items-center gap-2 border-b border-l-2 px-3 transition-colors ${
        selected
          ? 'border-brand-300 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
          : `${typeColor} hover:opacity-80`
      } border-b-gray-200 dark:border-b-gray-800`}
      onClick={onClickDevice}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClickDevice()}
    >
      <span className="w-7 shrink-0 text-right font-mono text-[10px] text-gray-400 dark:text-gray-500">
        U{u}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-semibold ${labelColor}`}>{device.name}</p>
        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
          {template?.type ?? '?'} · {uHeight}U
        </p>
      </div>
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildRackOptions = (rooms: RoomSummary[]) => {
  const opts: { id: string; label: string }[] = [];
  rooms.forEach((room) => {
    (room.aisles || []).forEach((aisle) => {
      aisle.racks.forEach((rack) => {
        opts.push({ id: rack.id, label: `${room.name} / ${aisle.name} / ${rack.name}` });
      });
    });
  });
  return opts;
};

const idFromName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ─── Main component ──────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AddFormState = {
  u: number;
  templateId: string;
  name: string;
  instance: string;
  busy: boolean;
  error: string | null;
};

export const CosmosRackEditorPage: React.FC = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [selectedRackId, setSelectedRackId] = useState('');
  const [rack, setRack] = useState<Rack | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [addForm, setAddForm] = useState<AddFormState | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [roomsData, catalog] = await Promise.all([api.getRooms(), api.getCatalog()]);
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setDeviceTemplates(catalog.device_templates || []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const rackOptions = useMemo(() => buildRackOptions(rooms), [rooms]);

  useEffect(() => {
    if (!selectedRackId && rackOptions.length > 0) {
      setSelectedRackId(rackOptions[0].id);
    }
  }, [rackOptions, selectedRackId]);

  const loadRack = useCallback(async (rackId: string) => {
    if (!rackId) return;
    try {
      const data = await api.getRack(rackId);
      setRack(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load rack');
    }
  }, []);

  useEffect(() => {
    if (selectedRackId) {
      loadRack(selectedRackId);
      setSelectedDeviceId(null);
      setAddForm(null);
    }
  }, [selectedRackId, loadRack]);

  const templateById = useMemo(() => {
    const map = new Map<string, DeviceTemplate>();
    deviceTemplates.forEach((t) => map.set(t.id, t));
    return map;
  }, [deviceTemplates]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.toLowerCase();
    return q
      ? deviceTemplates.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q)
        )
      : deviceTemplates;
  }, [deviceTemplates, templateSearch]);

  const uHeight = rack?.u_height ?? 42;

  // Build a map: U → device (and track spanned U slots)
  const deviceAtU = useMemo(() => {
    const map = new Map<number, Device | 'spanned'>();
    (rack?.devices ?? []).forEach((dev) => {
      const tpl = templateById.get(dev.template_id);
      const height = tpl?.u_height ?? 1;
      for (let i = 0; i < height; i++) {
        if (i === 0) {
          map.set(dev.u_position + i, dev);
        } else {
          map.set(dev.u_position + i, 'spanned');
        }
      }
    });
    return map;
  }, [rack, templateById]);

  const selectedDevice = rack?.devices.find((d) => d.id === selectedDeviceId) ?? null;
  const selectedDeviceTemplate = selectedDevice
    ? templateById.get(selectedDevice.template_id)
    : null;

  const handleSlotClick = (u: number) => {
    setSelectedDeviceId(null);
    const defaultTpl = filteredTemplates[0];
    setAddForm({
      u,
      templateId: defaultTpl?.id ?? '',
      name: '',
      instance: '',
      busy: false,
      error: null,
    });
  };

  const handleAddDevice = async () => {
    if (!addForm || !selectedRackId) return;
    setAddForm((prev) => prev && { ...prev, busy: true, error: null });

    const tpl = templateById.get(addForm.templateId);
    const devId = idFromName(addForm.name) || `device-u${addForm.u}`;

    try {
      await api.addRackDevice(selectedRackId, {
        id: devId,
        name: addForm.name || `Device U${addForm.u}`,
        template_id: addForm.templateId,
        u_position: addForm.u,
        instance: addForm.instance.trim() || null,
      });
      setAddForm(null);
      await loadRack(selectedRackId);
      void tpl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add device';
      setAddForm((prev) => prev && { ...prev, busy: false, error: msg });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!selectedRackId) return;
    try {
      await api.deleteRackDevice(selectedRackId, deviceId);
      setSelectedDeviceId(null);
      await loadRack(selectedRackId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete device');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const handleSave = async () => {
    if (!rack || !selectedRackId) return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await api.updateRackDevices(selectedRackId, rack.devices);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveError(msg);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const getSaveButtonContent = () => {
    if (saveStatus === 'saving')
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      );
    if (saveStatus === 'saved')
      return (
        <>
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </>
      );
    if (saveStatus === 'error')
      return (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Error</span>
        </>
      );
    return (
      <>
        <Save className="h-4 w-4" />
        <span>Save</span>
      </>
    );
  };

  const getSaveButtonStyle = () => {
    if (saveStatus === 'saved') return 'bg-green-500 hover:bg-green-600 text-white';
    if (saveStatus === 'error') return 'bg-red-500 hover:bg-red-600 text-white';
    return 'bg-brand-500 hover:bg-brand-600 text-white';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-50 dark:bg-brand-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Layers className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rack Editor</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add and remove devices from racks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RackOptionSelector
            options={rackOptions}
            value={selectedRackId}
            onChange={setSelectedRackId}
          />
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !rack}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${getSaveButtonStyle()}`}
          >
            {getSaveButtonContent()}
          </button>
        </div>
      </div>

      {/* Error banners */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
        </div>
      )}
      {saveError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Error</p>
            <p className="mt-0.5 font-mono text-xs text-red-600 dark:text-red-500">{saveError}</p>
          </div>
        </div>
      )}

      {/* Three-column layout */}
      <div className="flex flex-1 gap-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Left: template library */}
        <div className="flex w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Template Library
            </p>
            <div className="relative">
              <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="focus:border-brand-400 w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pr-2 pl-7 text-xs text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              {templateSearch && (
                <button
                  onClick={() => setTemplateSearch('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredTemplates.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No templates found</p>
            ) : (
              filteredTemplates.map((tpl) => (
                <TemplateLibraryItem
                  key={tpl.id}
                  template={tpl}
                  onClick={() => {
                    setAddForm(null);
                    setSelectedDeviceId(null);
                  }}
                />
              ))
            )}
          </div>

          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Click a slot to place a device
            </p>
          </div>
        </div>

        {/* Center: rack visualization */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              {rack ? `${rack.name} (${uHeight}U)` : 'Rack'}
            </p>
          </div>

          {rack ? (
            <div className="flex-1 overflow-y-auto">
              {Array.from({ length: uHeight }, (_, i) => uHeight - i).map((u) => {
                const entry = deviceAtU.get(u);
                const device = entry && entry !== 'spanned' ? entry : null;
                const spanned = entry === 'spanned';
                const isAddTarget = addForm?.u === u;

                return (
                  <React.Fragment key={u}>
                    <SlotRow
                      u={u}
                      device={device}
                      template={device ? templateById.get(device.template_id) : undefined}
                      selected={selectedDeviceId === device?.id}
                      spanned={spanned}
                      onClickEmpty={() => handleSlotClick(u)}
                      onClickDevice={() => {
                        setAddForm(null);
                        setSelectedDeviceId(device?.id ?? null);
                      }}
                    />
                    {isAddTarget && addForm && (
                      <div className="border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10 border-b px-4 py-3">
                        <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Add device at U{u}
                        </p>
                        {addForm.error && (
                          <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-2 py-1.5 dark:bg-red-500/10">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            <p className="text-[11px] text-red-600 dark:text-red-400">
                              {addForm.error}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={addForm.templateId}
                            onChange={(e) =>
                              setAddForm((prev) =>
                                prev ? { ...prev, templateId: e.target.value } : prev
                              )
                            }
                            className="focus:border-brand-400 col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {deviceTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.type}, {t.u_height}U)
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Device name *"
                            value={addForm.name}
                            onChange={(e) =>
                              setAddForm((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev
                              )
                            }
                            className="focus:border-brand-400 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          />
                          <input
                            type="text"
                            placeholder="Instance (optional)"
                            value={addForm.instance}
                            onChange={(e) =>
                              setAddForm((prev) =>
                                prev ? { ...prev, instance: e.target.value } : prev
                              )
                            }
                            className="focus:border-brand-400 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          />
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={handleAddDevice}
                            disabled={addForm.busy || !addForm.name.trim()}
                            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                          >
                            {addForm.busy ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            Add
                          </button>
                          <button
                            onClick={() => setAddForm(null)}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-gray-400">Select a rack to edit</p>
            </div>
          )}
        </div>

        {/* Right: device details */}
        <div className="flex w-[220px] shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Device Details
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedDevice ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {selectedDevice.name}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400">{selectedDevice.id}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                      Template
                    </p>
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                      {selectedDeviceTemplate?.name ?? selectedDevice.template_id}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                      U Position
                    </p>
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                      U{selectedDevice.u_position}
                    </p>
                  </div>
                  {selectedDeviceTemplate && (
                    <>
                      <div>
                        <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                          Type
                        </p>
                        <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                          {selectedDeviceTemplate.type}
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                          Height
                        </p>
                        <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                          {selectedDeviceTemplate.u_height}U
                        </p>
                      </div>
                    </>
                  )}
                  {selectedDevice.instance && (
                    <div>
                      <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                        Instance
                      </p>
                      <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                        {typeof selectedDevice.instance === 'string'
                          ? selectedDevice.instance
                          : JSON.stringify(selectedDevice.instance)}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteDevice(selectedDevice.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Device
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Server className="h-8 w-8 text-gray-300 dark:text-gray-700" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Click a device to see details
                </p>
              </div>
            )}
          </div>

          {rack && (
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {rack.devices.length} device{rack.devices.length !== 1 ? 's' : ''} installed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
