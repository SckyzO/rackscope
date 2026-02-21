import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  DoorOpen,
  AlignJustify,
  Server,
  GripVertical,
  Plus,
  Check,
  X,
  Loader2,
  AlertTriangle,
  ExternalLink,
  GitBranch,
  Wand2,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Site, Room, Aisle, Rack, RackTemplate } from '../../../types';

// ─── SaveBadge ───────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SaveBadge = ({ status }: { status: SaveStatus }) => {
  if (status === 'idle') return null;
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
      </span>
    );
  if (status === 'saved')
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-400">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-400">
      <AlertTriangle className="h-3 w-3" /> Error
    </span>
  );
};

// ─── InlineForm ──────────────────────────────────────────────────────────────

type InlineFormProps = {
  placeholder: string;
  onSave: (name: string, id: string) => void;
  onCancel: () => void;
};

const InlineForm = ({ placeholder, onSave, onCancel }: InlineFormProps) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [showId, setShowId] = useState(false);

  return (
    <div className="border-brand-500/30 bg-brand-500/5 space-y-2 rounded-xl border p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) onSave(name.trim(), id.trim());
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        className="focus:border-brand-500 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
      />
      {showId && (
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Custom ID (optional)"
          className="focus:border-brand-500 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 placeholder:text-gray-500 focus:outline-none"
        />
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowId((p) => !p)}
          className="text-[11px] text-gray-500 hover:text-gray-300"
        >
          {showId ? 'Hide custom ID' : 'Set custom ID'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-600"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim()) onSave(name.trim(), id.trim());
            }}
            disabled={!name.trim()}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── RackCard ─────────────────────────────────────────────────────────────────

type RackCardProps = {
  rack: Rack;
  selected: boolean;
  dragging: boolean;
  rackTemplates: RackTemplate[];
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
};

const RackCard = ({
  rack,
  selected,
  dragging,
  rackTemplates,
  onSelect,
  onDragStart,
}: RackCardProps) => {
  const tpl = rackTemplates.find((t) => t.id === rack.template_id);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all ${
        selected
          ? 'border-brand-500 bg-brand-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-600 group-hover:text-gray-400" />
      <Server className="h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{rack.name || rack.id}</p>
        <p className="truncate font-mono text-[10px] text-gray-500">{rack.id}</p>
        <p className="truncate text-[10px] text-gray-600">{tpl?.name ?? rack.template_id ?? '—'}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[10px] text-gray-500">{rack.u_height}U</p>
        <p className="text-[10px] text-gray-600">{rack.devices.length} dev</p>
      </div>
    </div>
  );
};

// ─── AisleColumn ─────────────────────────────────────────────────────────────

type AisleColumnProps = {
  aisle: Aisle;
  selectedRackId: string | null;
  dragRackId: string | null;
  dragOverAisleId: string | null;
  rackTemplates: RackTemplate[];
  standaloneRacks: Rack[];
  addingRackInAisle: string | null;
  onRackSelect: (rackId: string) => void;
  onRackDragStart: (e: React.DragEvent, rackId: string, aisleId: string) => void;
  onDragOver: (e: React.DragEvent, aisleId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, aisleId: string) => void;
  onAddRack: (aisleId: string) => void;
  onCancelAddRack: () => void;
  onPickStandalone: (aisleId: string, rackId: string) => void;
};

const AisleColumn = ({
  aisle,
  selectedRackId,
  dragRackId,
  dragOverAisleId,
  rackTemplates,
  standaloneRacks,
  addingRackInAisle,
  onRackSelect,
  onRackDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddRack,
  onCancelAddRack,
  onPickStandalone,
}: AisleColumnProps) => {
  const isDropTarget = dragOverAisleId === aisle.id;
  const isAddingHere = addingRackInAisle === aisle.id;

  return (
    <div
      className={`flex min-h-[200px] w-80 shrink-0 flex-col rounded-2xl border-2 transition-all ${
        isDropTarget ? 'border-brand-500 bg-brand-500/5' : 'border-gray-800 bg-gray-900'
      }`}
      onDragOver={(e) => onDragOver(e, aisle.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, aisle.id)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlignJustify className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-white">{aisle.name}</span>
        </div>
        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
          {aisle.racks.length}
        </span>
      </div>

      {/* Racks */}
      <div className="flex-1 space-y-2 p-3">
        {aisle.racks.map((rack) => (
          <RackCard
            key={rack.id}
            rack={rack}
            selected={selectedRackId === rack.id}
            dragging={dragRackId === rack.id}
            rackTemplates={rackTemplates}
            onSelect={() => onRackSelect(rack.id)}
            onDragStart={(e) => onRackDragStart(e, rack.id, aisle.id)}
          />
        ))}
        {aisle.racks.length === 0 && (
          <div
            className={`flex h-20 items-center justify-center rounded-xl border-2 border-dashed text-xs ${
              isDropTarget
                ? 'border-brand-500/50 text-brand-500/70'
                : 'border-gray-800 text-gray-600'
            }`}
          >
            {isDropTarget ? 'Drop rack here' : 'No racks'}
          </div>
        )}
      </div>

      {/* Add rack area */}
      <div className="border-t border-gray-800 p-3">
        {isAddingHere ? (
          <div className="space-y-2">
            {standaloneRacks.length > 0 ? (
              <>
                <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                  Available racks
                </p>
                {standaloneRacks.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onPickStandalone(aisle.id, r.id)}
                    className="hover:border-brand-500/50 hover:bg-brand-500/10 flex w-full items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-left"
                  >
                    <Server className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{r.name || r.id}</p>
                      <p className="truncate font-mono text-[10px] text-gray-500">{r.id}</p>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-700 p-3 text-center text-[11px] text-gray-500">
                No standalone racks available.
                <br />
                Create a rack in the YAML config first.
              </p>
            )}
            <button
              onClick={onCancelAddRack}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-700 py-1.5 text-xs text-gray-500 hover:text-gray-400"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddRack(aisle.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-700 py-2 text-xs text-gray-500 hover:border-gray-600 hover:text-gray-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add Rack
          </button>
        )}
      </div>
    </div>
  );
};

// ─── RackDetailPanel ─────────────────────────────────────────────────────────

type RackDetailPanelProps = {
  rack: Rack;
  aisle: Aisle;
  rackTemplates: RackTemplate[];
  onSaveTemplate: (templateId: string | null) => void;
  onNavigateToRack: () => void;
  saving: boolean;
};

const RackDetailPanel = ({
  rack,
  aisle,
  rackTemplates,
  onSaveTemplate,
  onNavigateToRack,
  saving,
}: RackDetailPanelProps) => {
  const [templateId, setTemplateId] = useState(rack.template_id ?? '');
  const dirty = templateId !== (rack.template_id ?? '');

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-semibold text-white">{rack.name || rack.id}</h3>
        <p className="font-mono text-xs text-gray-400">
          {rack.id} · {rack.u_height}U · {aisle.name}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          Rack Template
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="focus:border-brand-500 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">— No template —</option>
          {rackTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {dirty && (
          <button
            onClick={() => onSaveTemplate(templateId || null)}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save Template
          </button>
        )}
      </div>

      <div className="space-y-1.5 rounded-xl border border-gray-800 p-3">
        {[
          { label: 'Height', value: `${rack.u_height}U` },
          { label: 'Devices', value: rack.devices.length },
          { label: 'Aisle', value: aisle.name },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-300">{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNavigateToRack}
        className="border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium"
      >
        <ExternalLink className="h-4 w-4" />
        Open in Rack Editor
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const CosmosTopologyEditorPage = () => {
  const navigate = useNavigate();

  // Data
  const [topology, setTopology] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Navigation (left panel)
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Selection (right panel)
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);

  // DnD
  const [dragRackId, setDragRackId] = useState<string | null>(null);
  const [dragFromAisleId, setDragFromAisleId] = useState<string | null>(null);
  const [dragOverAisleId, setDragOverAisleId] = useState<string | null>(null);

  // Inline create forms
  const [addingSiteForm, setAddingSiteForm] = useState(false);
  const [addingRoomFor, setAddingRoomFor] = useState<string | null>(null);
  const [addingAisleFor, setAddingAisleFor] = useState(false);
  const [addingRackInAisle, setAddingRackInAisle] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const reload = async () => {
    const [sites, catalog] = await Promise.all([api.getSites(), api.getCatalog()]);
    setTopology(Array.isArray(sites) ? sites : []);
    setRackTemplates(catalog?.rack_templates ?? []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [sites, catalog] = await Promise.all([api.getSites(), api.getCatalog()]);
        if (!active) return;
        setTopology(Array.isArray(sites) ? sites : []);
        setRackTemplates(catalog?.rack_templates ?? []);
        setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Auto-select first room after initial load
  useEffect(() => {
    if (loading || selectedRoomId || topology.length === 0) return;
    const autoSelect = async () => {
      const firstSite = topology[0];
      if (firstSite.rooms.length > 0) {
        setSelectedRoomId(firstSite.rooms[0].id);
        setExpandedSites(new Set([firstSite.id]));
      }
    };
    autoSelect();
  }, [loading, topology, selectedRoomId]);

  // ── Derived values ────────────────────────────────────────────────────────

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    for (const site of topology) {
      const room = site.rooms.find((r) => r.id === selectedRoomId);
      if (room) return room;
    }
    return null;
  }, [topology, selectedRoomId]);

  const selectedRack = useMemo(() => {
    if (!selectedRackId || !selectedRoom) return null;
    return selectedRoom.aisles.flatMap((a) => a.racks).find((r) => r.id === selectedRackId) ?? null;
  }, [selectedRackId, selectedRoom]);

  const selectedRackAisle = useMemo(() => {
    if (!selectedRackId || !selectedRoom) return null;
    return selectedRoom.aisles.find((a) => a.racks.some((r) => r.id === selectedRackId)) ?? null;
  }, [selectedRackId, selectedRoom]);

  // ── Save helper ───────────────────────────────────────────────────────────

  const withSave = async (fn: () => Promise<void>) => {
    setSaveStatus('saving');
    try {
      await fn();
      await reload();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const handleRackDragStart = (e: React.DragEvent, rackId: string, aisleId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragRackId(rackId);
    setDragFromAisleId(aisleId);
  };

  const handleAisleDragOver = (e: React.DragEvent, aisleId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverAisleId(aisleId);
  };

  const handleAisleDragLeave = () => setDragOverAisleId(null);

  const handleAisleDrop = async (e: React.DragEvent, targetAisleId: string) => {
    e.preventDefault();
    setDragOverAisleId(null);
    if (!dragRackId || !dragFromAisleId || !selectedRoom) {
      setDragRackId(null);
      return;
    }
    if (dragFromAisleId === targetAisleId) {
      setDragRackId(null);
      return;
    }
    const newAisles: Record<string, string[]> = {};
    selectedRoom.aisles.forEach((a) => {
      if (a.id === dragFromAisleId) {
        newAisles[a.id] = a.racks.filter((r) => r.id !== dragRackId).map((r) => r.id);
      } else if (a.id === targetAisleId) {
        newAisles[a.id] = [...a.racks.map((r) => r.id), dragRackId!];
      } else {
        newAisles[a.id] = a.racks.map((r) => r.id);
      }
    });
    setDragRackId(null);
    setDragFromAisleId(null);
    await withSave(() => api.updateRoomAisles(selectedRoom.id, newAisles));
  };

  // ── Action handlers ───────────────────────────────────────────────────────

  const selectRoom = (room: Room, siteId: string) => {
    setSelectedRoomId(room.id);
    setExpandedSites((prev) => new Set([...prev, siteId]));
    setSelectedRackId(null);
  };

  const handleCreateSite = async (name: string, id: string) => {
    setAddingSiteForm(false);
    await withSave(() => api.createSite({ id: id || null, name }));
  };

  const handleCreateRoom = async (siteId: string, name: string, id: string) => {
    setAddingRoomFor(null);
    await withSave(() => api.createRoom(siteId, { id: id || null, name }));
  };

  const handleCreateAisle = async (name: string, id: string) => {
    if (!selectedRoom) return;
    setAddingAisleFor(false);
    await withSave(() => api.createRoomAisles(selectedRoom.id, [{ id: id || null, name }]));
  };

  const handleSaveRackTemplate = async (templateId: string | null) => {
    if (!selectedRackId) return;
    await withSave(() => api.updateRackTemplate(selectedRackId, templateId));
  };

  const handleMoveStandaloneToAisle = async (aisleId: string, rackId: string) => {
    if (!selectedRoom) return;
    setAddingRackInAisle(null);
    const newAisles: Record<string, string[]> = {};
    selectedRoom.aisles.forEach((a) => {
      newAisles[a.id] =
        a.id === aisleId ? [...a.racks.map((r) => r.id), rackId] : a.racks.map((r) => r.id);
    });
    await withSave(() => api.updateRoomAisles(selectedRoom.id, newAisles));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-brand-500 h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <GitBranch className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Topology Editor</h1>
            <p className="text-xs text-gray-500">Manage your datacenter hierarchy</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveBadge status={saveStatus} />
          <button
            disabled
            title="Creation wizard — coming soon"
            className="border-brand-500/30 bg-brand-500/5 text-brand-400/50 flex cursor-not-allowed items-center gap-2 rounded-xl border border-dashed px-4 py-2 text-sm font-medium"
          >
            <Wand2 className="h-4 w-4" />
            Create Wizard
          </button>
        </div>
      </div>

      {/* 3-column body */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: Site/Room tree */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-gray-800 bg-gray-950">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Sites &amp; Rooms
            </span>
            <button
              onClick={() => setAddingSiteForm(true)}
              className="hover:text-brand-500 text-gray-500"
              aria-label="Add site"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-1 p-3">
            {addingSiteForm && (
              <InlineForm
                placeholder="Site name..."
                onSave={handleCreateSite}
                onCancel={() => setAddingSiteForm(false)}
              />
            )}

            {topology.map((site) => (
              <div key={site.id}>
                {/* Site row */}
                <div
                  role="button"
                  tabIndex={0}
                  className="group flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-gray-800"
                  onClick={() =>
                    setExpandedSites((prev) => {
                      const next = new Set(prev);
                      if (next.has(site.id)) next.delete(site.id);
                      else next.add(site.id);
                      return next;
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      setExpandedSites((prev) => {
                        const next = new Set(prev);
                        if (next.has(site.id)) next.delete(site.id);
                        else next.add(site.id);
                        return next;
                      });
                  }}
                >
                  {expandedSites.has(site.id) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                  )}
                  <Building2 className="text-brand-400 h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-sm text-gray-300">{site.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingRoomFor(site.id);
                    }}
                    className="hover:text-brand-500 text-gray-600 opacity-0 group-hover:opacity-100"
                    aria-label="Add room"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Rooms */}
                {expandedSites.has(site.id) && (
                  <div className="ml-3 space-y-0.5">
                    {addingRoomFor === site.id && (
                      <InlineForm
                        placeholder="Room name..."
                        onSave={(name, id) => handleCreateRoom(site.id, name, id)}
                        onCancel={() => setAddingRoomFor(null)}
                      />
                    )}
                    {site.rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => selectRoom(room, site.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                          selectedRoomId === room.id
                            ? 'border-brand-500 bg-brand-500/15 text-brand-400 border-l-2'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                      >
                        <DoorOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">{room.name}</span>
                        <span className="text-[10px] text-gray-600">
                          {room.aisles.flatMap((a) => a.racks).length}r
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {topology.length === 0 && !addingSiteForm && (
              <p className="px-2 py-4 text-center text-xs text-gray-600">
                No sites yet — click + to create one
              </p>
            )}
          </div>
        </aside>

        {/* CENTER: Kanban board */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-950">
          {!selectedRoom ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <DoorOpen className="mx-auto h-12 w-12 text-gray-700" />
                <p className="mt-3 text-sm font-medium text-gray-500">Select a room</p>
                <p className="text-xs text-gray-600">Click a room in the tree to view its aisles</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Room header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-6 py-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{selectedRoom.name}</h2>
                  <p className="text-xs text-gray-500">
                    {selectedRoom.aisles.length} aisles &middot;{' '}
                    {selectedRoom.aisles.flatMap((a) => a.racks).length} racks
                  </p>
                </div>
                <button
                  onClick={() => setAddingAisleFor(true)}
                  className="bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Aisle
                </button>
              </div>

              {/* Kanban scroll area */}
              <div className="flex-1 overflow-x-auto p-6">
                <div className="flex h-full gap-4">
                  {addingAisleFor && (
                    <div className="w-64 shrink-0">
                      <InlineForm
                        placeholder="Aisle name..."
                        onSave={(name, id) => handleCreateAisle(name, id)}
                        onCancel={() => setAddingAisleFor(false)}
                      />
                    </div>
                  )}

                  {selectedRoom.aisles.map((aisle) => (
                    <AisleColumn
                      key={aisle.id}
                      aisle={aisle}
                      selectedRackId={selectedRackId}
                      dragRackId={dragRackId}
                      dragOverAisleId={dragOverAisleId}
                      rackTemplates={rackTemplates}
                      standaloneRacks={selectedRoom.standalone_racks ?? []}
                      addingRackInAisle={addingRackInAisle}
                      onRackSelect={setSelectedRackId}
                      onRackDragStart={handleRackDragStart}
                      onDragOver={handleAisleDragOver}
                      onDragLeave={handleAisleDragLeave}
                      onDrop={handleAisleDrop}
                      onAddRack={(aisleId) => setAddingRackInAisle(aisleId)}
                      onCancelAddRack={() => setAddingRackInAisle(null)}
                      onPickStandalone={handleMoveStandaloneToAisle}
                    />
                  ))}

                  {selectedRoom.aisles.length === 0 && !addingAisleFor && (
                    <div className="flex flex-1 items-center justify-center text-sm text-gray-600">
                      No aisles yet — click &ldquo;Add Aisle&rdquo; to create one
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: Detail panel */}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-gray-800 bg-gray-950">
          {selectedRack && selectedRackAisle ? (
            <RackDetailPanel
              key={selectedRack.id}
              rack={selectedRack}
              aisle={selectedRackAisle}
              rackTemplates={rackTemplates}
              onSaveTemplate={handleSaveRackTemplate}
              onNavigateToRack={() => navigate(`/cosmos/editors/rack?rackId=${selectedRack.id}`)}
              saving={saveStatus === 'saving'}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <Server className="h-10 w-10 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">No rack selected</p>
              <p className="text-xs text-gray-600">Click a rack card to see details</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
