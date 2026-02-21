import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Building2,
  Layers,
  Server,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Save,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Site, Room, Aisle, Rack } from '../../../types';

// ─── Module-level sub-components ────────────────────────────────────────────

type TreeItemProps = {
  label: string;
  count?: string;
  depth: number;
  active?: boolean;
  expanded?: boolean;
  hasChildren?: boolean;
  onClick: () => void;
  onToggle?: () => void;
  icon: React.ElementType;
};

const TreeItem = ({
  label,
  count,
  depth,
  active,
  expanded,
  hasChildren,
  onClick,
  onToggle,
  icon: Icon,
}: TreeItemProps) => (
  <div
    className={`group flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
      active
        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
    style={{ paddingLeft: `${8 + depth * 14}px` }}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick()}
  >
    {hasChildren ? (
      <button
        className="shrink-0 p-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
    ) : (
      <span className="w-4 shrink-0" />
    )}
    <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
    <span className="flex-1 truncate text-xs font-medium">{label}</span>
    {count && (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
        {count}
      </span>
    )}
  </div>
);

type InlineFormProps = {
  title: string;
  idValue: string;
  nameValue: string;
  onIdChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
};

const InlineForm = ({
  title,
  idValue,
  nameValue,
  onIdChange,
  onNameChange,
  onSave,
  onCancel,
  busy,
  error,
}: InlineFormProps) => (
  <div className="mx-2 my-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <p className="mb-3 text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</p>
    {error && (
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-2 py-1.5 dark:bg-red-500/10">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      </div>
    )}
    <div className="space-y-2">
      <input
        type="text"
        placeholder="ID (optional)"
        value={idValue}
        onChange={(e) => onIdChange(e.target.value)}
        className="focus:border-brand-400 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-mono text-xs text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <input
        type="text"
        placeholder="Name *"
        value={nameValue}
        onChange={(e) => onNameChange(e.target.value)}
        className="focus:border-brand-400 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
    </div>
    <div className="mt-3 flex gap-2">
      <button
        onClick={onSave}
        disabled={busy || !nameValue.trim()}
        className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        Save
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <X className="h-3 w-3" />
        Cancel
      </button>
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

type SelectedItem =
  | { kind: 'site'; id: string }
  | { kind: 'room'; siteId: string; roomId: string }
  | null;

type FormKind = 'site' | 'room' | null;

export const CosmosTopologyEditorPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const [formKind, setFormKind] = useState<FormKind>(null);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getSites();
        setSites(Array.isArray(data) ? data : []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load sites');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const reloadSites = async () => {
    try {
      const data = await api.getSites();
      setSites(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore reload errors
    }
  };

  const handleToggleSite = (siteId: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const handleToggleRoom = (roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const openForm = (kind: FormKind) => {
    setFormKind(kind);
    setFormId('');
    setFormName('');
    setFormError(null);
  };

  const closeForm = () => {
    setFormKind(null);
    setFormId('');
    setFormName('');
    setFormError(null);
  };

  const handleSaveSite = async () => {
    if (!formName.trim()) return;
    setFormBusy(true);
    setFormError(null);
    try {
      await api.createSite({ id: formId.trim() || null, name: formName.trim() });
      closeForm();
      await reloadSites();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setFormBusy(false);
    }
  };

  const handleSaveRoom = async () => {
    if (!formName.trim() || selected?.kind !== 'site') return;
    setFormBusy(true);
    setFormError(null);
    try {
      await api.createRoom(selected.id, {
        id: formId.trim() || null,
        name: formName.trim(),
      });
      closeForm();
      await reloadSites();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setFormBusy(false);
    }
  };

  const selectedSite =
    selected?.kind === 'site' ? (sites.find((s) => s.id === selected.id) ?? null) : null;

  const selectedRoom =
    selected?.kind === 'room'
      ? (sites
          .find((s) => s.id === selected.siteId)
          ?.rooms?.find((r: Room) => r.id === selected.roomId) ?? null)
      : null;

  const totalRacks = (room: Room): number => {
    const fromAisles = (room.aisles || []).reduce(
      (acc: number, a: Aisle) => acc + (a.racks || []).length,
      0
    );
    const standalone = (room.standalone_racks || []).length;
    return fromAisles + standalone;
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-50 dark:bg-brand-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <MapPin className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Topology</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage sites, rooms, aisles and racks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openForm('site')}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Site
          </button>
          {selected?.kind === 'site' && (
            <button
              onClick={() => openForm('room')}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Left tree panel */}
        <div className="flex w-[320px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Hierarchy
            </p>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : sites.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <FolderOpen className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400">No sites configured</p>
              </div>
            ) : (
              sites.map((site) => {
                const siteExpanded = expandedSites.has(site.id);
                const siteActive = selected?.kind === 'site' && selected.id === site.id;
                return (
                  <div key={site.id}>
                    <TreeItem
                      label={site.name}
                      count={`${site.rooms?.length ?? 0} rooms`}
                      depth={0}
                      active={siteActive}
                      expanded={siteExpanded}
                      hasChildren={(site.rooms?.length ?? 0) > 0}
                      icon={MapPin}
                      onClick={() => setSelected({ kind: 'site', id: site.id })}
                      onToggle={() => handleToggleSite(site.id)}
                    />
                    {siteExpanded &&
                      (site.rooms || []).map((room: Room) => {
                        const roomExpanded = expandedRooms.has(room.id);
                        const roomActive = selected?.kind === 'room' && selected.roomId === room.id;
                        const aisleCount = (room.aisles || []).length;
                        const rackCount = totalRacks(room);
                        return (
                          <div key={room.id}>
                            <TreeItem
                              label={room.name}
                              count={`${aisleCount}a / ${rackCount}r`}
                              depth={1}
                              active={roomActive}
                              expanded={roomExpanded}
                              hasChildren={aisleCount > 0}
                              icon={Building2}
                              onClick={() =>
                                setSelected({ kind: 'room', siteId: site.id, roomId: room.id })
                              }
                              onToggle={() => handleToggleRoom(room.id)}
                            />
                            {roomExpanded &&
                              (room.aisles || []).map((aisle: Aisle) => (
                                <div key={aisle.id}>
                                  <TreeItem
                                    label={aisle.name}
                                    count={`${(aisle.racks || []).length} racks`}
                                    depth={2}
                                    active={false}
                                    expanded={false}
                                    hasChildren={(aisle.racks || []).length > 0}
                                    icon={Layers}
                                    onClick={() => {}}
                                    onToggle={() => {}}
                                  />
                                  {(aisle.racks || []).map((rack: Rack) => (
                                    <TreeItem
                                      key={rack.id}
                                      label={rack.name}
                                      depth={3}
                                      active={false}
                                      icon={Server}
                                      onClick={() => {}}
                                    />
                                  ))}
                                </div>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}

            {/* Inline create forms */}
            {formKind === 'site' && (
              <InlineForm
                title="New Site"
                idValue={formId}
                nameValue={formName}
                onIdChange={setFormId}
                onNameChange={setFormName}
                onSave={handleSaveSite}
                onCancel={closeForm}
                busy={formBusy}
                error={formError}
              />
            )}
            {formKind === 'room' && selected?.kind === 'site' && (
              <InlineForm
                title={`New Room in ${sites.find((s) => s.id === selected.id)?.name ?? selected.id}`}
                idValue={formId}
                nameValue={formName}
                onIdChange={setFormId}
                onNameChange={setFormName}
                onSave={handleSaveRoom}
                onCancel={closeForm}
                busy={formBusy}
                error={formError}
              />
            )}
          </div>

          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {sites.length} site{sites.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
          {selectedRoom ? (
            <div className="mx-auto w-full max-w-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedRoom.name}
                </h2>
                {selectedRoom.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedRoom.description}
                  </p>
                )}
                <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                  ID: {selectedRoom.id}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(selectedRoom.aisles || []).length}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Aisles</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalRacks(selectedRoom)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Total Racks</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(selectedRoom.standalone_racks || []).length}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Standalone Racks
                  </p>
                </div>
              </div>

              {(selectedRoom.aisles || []).length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Aisles
                  </p>
                  <div className="space-y-2">
                    {(selectedRoom.aisles || []).map((aisle: Aisle) => (
                      <div
                        key={aisle.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {aisle.name}
                            </p>
                            <p className="font-mono text-[11px] text-gray-400">{aisle.id}</p>
                          </div>
                        </div>
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {(aisle.racks || []).length} racks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : selectedSite ? (
            <div className="mx-auto w-full max-w-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedSite.name}
                </h2>
                {selectedSite.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedSite.description}
                  </p>
                )}
                <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                  ID: {selectedSite.id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(selectedSite.rooms || []).length}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Rooms</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(selectedSite.rooms || []).reduce(
                      (acc: number, r: Room) => acc + totalRacks(r),
                      0
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Total Racks</p>
                </div>
              </div>

              {(selectedSite.rooms || []).length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Rooms
                  </p>
                  <div className="space-y-2">
                    {(selectedSite.rooms || []).map((room: Room) => (
                      <button
                        key={room.id}
                        onClick={() =>
                          setSelected({ kind: 'room', siteId: selectedSite.id, roomId: room.id })
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {room.name}
                            </p>
                            <p className="font-mono text-[11px] text-gray-400">{room.id}</p>
                          </div>
                        </div>
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {(room.aisles || []).length} aisles
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Select an item
              </h3>
              <p className="mt-1 max-w-xs text-sm text-gray-400 dark:text-gray-500">
                Click a site or room in the tree to view details, or use the buttons above to create
                new entries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
