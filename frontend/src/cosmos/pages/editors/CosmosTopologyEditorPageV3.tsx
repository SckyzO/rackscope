import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Building2,
  Layers,
  Server,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  Save,
  X,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import type { Site, Room, Aisle, Rack, RackTemplate } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const VARIANT_LINKS = [
  { label: 'V1', path: '/cosmos/editors/topology-v1' },
  { label: 'V2', path: '/cosmos/editors/topology-v2' },
  { label: 'V3', path: '/cosmos/editors/topology-v3' },
  { label: 'V4', path: '/cosmos/editors/topology-v4' },
  { label: 'V5', path: '/cosmos/editors/topology-v5' },
];

type DrillLevel = 'sites' | 'rooms' | 'aisles' | 'racks';

// ─── Module-level sub-components ─────────────────────────────────────────────

type VariantSwitcherProps = { active: string };

const VariantSwitcher = ({ active }: VariantSwitcherProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
      {VARIANT_LINKS.map((v) => (
        <button
          key={v.label}
          onClick={() => navigate(v.path)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
            v.label === active
              ? 'bg-[#465fff] text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
};

type BreadcrumbProps = {
  items: { label: string; onClick: () => void }[];
};

const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <nav className="flex items-center gap-1">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
        <button
          onClick={item.onClick}
          className={`rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
            i === items.length - 1
              ? 'bg-[#465fff]/10 text-[#465fff]'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {item.label}
        </button>
      </React.Fragment>
    ))}
  </nav>
);

type AddCardProps = { label: string; onClick: () => void };

const AddCard = ({ label, onClick }: AddCardProps) => (
  <button
    onClick={onClick}
    className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-transparent text-gray-400 transition-colors hover:border-[#465fff] hover:text-[#465fff] dark:border-gray-700 dark:hover:border-[#465fff]"
  >
    <Plus className="h-6 w-6" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

type InlineEditFormProps = {
  title: string;
  initialName: string;
  initialId?: string;
  onSave: (name: string, id: string) => Promise<void>;
  onCancel: () => void;
};

const InlineEditForm = ({
  title,
  initialName,
  initialId = '',
  onSave,
  onCancel,
}: InlineEditFormProps) => {
  const [name, setName] = useState(initialName);
  const [id, setId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim(), id.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#465fff]/50 bg-[#465fff]/5 p-4">
      <p className="mb-3 text-xs font-bold text-gray-700 dark:text-gray-300">{title}</p>
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 dark:bg-red-500/10">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#465fff] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          autoFocus
        />
        <input
          type="text"
          placeholder="ID (optional)"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-[#465fff] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-[#465fff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
};

type SiteCardProps = {
  site: Site;
  totalRacks: number;
  onOpen: () => void;
  onEdit: () => void;
};

const SiteCard = ({ site, totalRacks, onOpen, onEdit }: SiteCardProps) => (
  <div className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#465fff]/10">
        <MapPin className="h-5 w-5 text-[#465fff]" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-gray-900 dark:text-white">{site.name}</h3>
        <p className="font-mono text-[11px] text-gray-400">{site.id}</p>
      </div>
    </div>
    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span>{(site.rooms || []).length} rooms</span>
      <span>{totalRacks} racks</span>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <button
        onClick={onOpen}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#465fff] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        Open
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  </div>
);

type RoomCardProps = {
  room: Room;
  totalRacks: number;
  onOpen: () => void;
  onEdit: () => void;
};

const RoomCard = ({ room, totalRacks, onOpen, onEdit }: RoomCardProps) => (
  <div className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
        <Building2 className="h-5 w-5 text-purple-500" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-gray-900 dark:text-white">{room.name}</h3>
        <p className="font-mono text-[11px] text-gray-400">{room.id}</p>
      </div>
    </div>
    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span>{(room.aisles || []).length} aisles</span>
      <span>{totalRacks} racks</span>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <button
        onClick={onOpen}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#465fff] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        Open
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  </div>
);

type AisleCardProps = {
  aisle: Aisle;
  onOpen: () => void;
  onEdit: () => void;
};

const AisleCard = ({ aisle, onOpen, onEdit }: AisleCardProps) => (
  <div className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
        <Layers className="h-5 w-5 text-amber-500" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-gray-900 dark:text-white">{aisle.name}</h3>
        <p className="font-mono text-[11px] text-gray-400">{aisle.id}</p>
      </div>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">
      <span>{(aisle.racks || []).length} racks</span>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <button
        onClick={onOpen}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#465fff] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        Open
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  </div>
);

type RackHCardProps = {
  rack: Rack;
  rackTemplates: RackTemplate[];
  onTemplateChange: (templateId: string | null) => Promise<void>;
  onOpen: () => void;
};

const RackHCard = ({ rack, rackTemplates, onTemplateChange, onOpen }: RackHCardProps) => {
  const [saving, setSaving] = useState(false);

  const handleChange = async (val: string) => {
    setSaving(true);
    try {
      await onTemplateChange(val || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-48 shrink-0 flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {rack.name}
          </p>
          <p className="font-mono text-[10px] text-gray-400">{rack.id}</p>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {(rack.devices || []).length} devices
      </div>
      <div className="flex items-center gap-1">
        <select
          value={rack.template_id ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-1 text-[11px] text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          <option value="">No template</option>
          {rackTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-[#465fff]" />}
      </div>
      <button
        onClick={onOpen}
        className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 py-1 text-[11px] text-gray-500 transition-colors hover:border-[#465fff] hover:text-[#465fff] dark:border-gray-600 dark:hover:border-[#465fff]"
      >
        <ExternalLink className="h-3 w-3" />
        Open
      </button>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const CosmosTopologyEditorPageV3: React.FC = () => {
  const navigate = useNavigate();
  const [topology, setTopology] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [drillLevel, setDrillLevel] = useState<DrillLevel>('sites');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedAisle, setSelectedAisle] = useState<Aisle | null>(null);

  const [addingCard, setAddingCard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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

  const countRacksInRoom = (room: Room): number =>
    (room.aisles || []).reduce((acc, a) => acc + (a.racks || []).length, 0) +
    (room.standalone_racks || []).length;

  const countRacksInSite = (site: Site): number =>
    (site.rooms || []).reduce((acc, r) => acc + countRacksInRoom(r), 0);

  const handleDrillSite = (site: Site) => {
    setSelectedSite(site);
    setSelectedRoom(null);
    setSelectedAisle(null);
    setDrillLevel('rooms');
    setAddingCard(false);
    setEditingId(null);
  };

  const handleDrillRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedAisle(null);
    setDrillLevel('aisles');
    setAddingCard(false);
    setEditingId(null);
  };

  const handleDrillAisle = (aisle: Aisle) => {
    setSelectedAisle(aisle);
    setDrillLevel('racks');
    setAddingCard(false);
    setEditingId(null);
  };

  const handleBreadcrumbSites = () => {
    setDrillLevel('sites');
    setSelectedSite(null);
    setSelectedRoom(null);
    setSelectedAisle(null);
    setAddingCard(false);
    setEditingId(null);
  };

  const handleBreadcrumbRooms = () => {
    setDrillLevel('rooms');
    setSelectedRoom(null);
    setSelectedAisle(null);
    setAddingCard(false);
    setEditingId(null);
  };

  const handleBreadcrumbAisles = () => {
    setDrillLevel('aisles');
    setSelectedAisle(null);
    setAddingCard(false);
    setEditingId(null);
  };

  const handleAddSite = async (name: string, id: string) => {
    await withSave(() => api.createSite({ id: id || null, name }));
    setAddingCard(false);
  };

  const handleAddRoom = async (name: string, id: string) => {
    if (!selectedSite) return;
    await withSave(() => api.createRoom(selectedSite.id, { id: id || null, name }));
    setAddingCard(false);
  };

  const handleAddAisle = async (name: string, id: string) => {
    if (!selectedRoom) return;
    await withSave(() => api.createRoomAisles(selectedRoom.id, [{ id: id || null, name }]));
    setAddingCard(false);
  };

  const handleRackTemplateChange = async (rackId: string, templateId: string | null) => {
    await withSave(() => api.updateRackTemplate(rackId, templateId));
  };

  const breadcrumbItems = (() => {
    const items = [{ label: 'Sites', onClick: handleBreadcrumbSites }];
    if (selectedSite) items.push({ label: selectedSite.name, onClick: handleBreadcrumbRooms });
    if (selectedRoom) items.push({ label: selectedRoom.name, onClick: handleBreadcrumbAisles });
    if (selectedAisle) items.push({ label: selectedAisle.name, onClick: () => {} });
    return items;
  })();

  const gridCols = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#465fff]/10">
            <MapPin className="h-5 w-5 text-[#465fff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Topology Editor</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dashboard drill-down — V3</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus !== 'idle' && (
            <span
              className={`text-xs font-medium ${
                saveStatus === 'saving'
                  ? 'text-gray-400'
                  : saveStatus === 'saved'
                    ? 'text-[#22c55e]'
                    : 'text-[#ef4444]'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Error'}
            </span>
          )}
          <VariantSwitcher active="V3" />
        </div>
      </div>

      {/* Breadcrumb + Content */}
      <div className="flex-1 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Breadcrumb bar */}
        <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Card grid */}
        <div className="p-6">
          {/* Level: Sites */}
          {drillLevel === 'sites' && (
            <div className={gridCols}>
              {topology.map((site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  totalRacks={countRacksInSite(site)}
                  onOpen={() => handleDrillSite(site)}
                  onEdit={() => setEditingId(editingId === site.id ? null : site.id)}
                />
              ))}
              {addingCard ? (
                <InlineEditForm
                  title="New Site"
                  initialName=""
                  onSave={handleAddSite}
                  onCancel={() => setAddingCard(false)}
                />
              ) : (
                <AddCard label="Add Site" onClick={() => setAddingCard(true)} />
              )}
            </div>
          )}

          {/* Level: Rooms */}
          {drillLevel === 'rooms' && selectedSite && (
            <div className={gridCols}>
              {(selectedSite.rooms || []).map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  totalRacks={countRacksInRoom(room)}
                  onOpen={() => handleDrillRoom(room)}
                  onEdit={() => setEditingId(editingId === room.id ? null : room.id)}
                />
              ))}
              {addingCard ? (
                <InlineEditForm
                  title="New Room"
                  initialName=""
                  onSave={handleAddRoom}
                  onCancel={() => setAddingCard(false)}
                />
              ) : (
                <AddCard label="Add Room" onClick={() => setAddingCard(true)} />
              )}
            </div>
          )}

          {/* Level: Aisles */}
          {drillLevel === 'aisles' && selectedRoom && (
            <div className={gridCols}>
              {(selectedRoom.aisles || []).map((aisle) => (
                <AisleCard
                  key={aisle.id}
                  aisle={aisle}
                  onOpen={() => handleDrillAisle(aisle)}
                  onEdit={() => setEditingId(editingId === aisle.id ? null : aisle.id)}
                />
              ))}
              {addingCard ? (
                <InlineEditForm
                  title="New Aisle"
                  initialName=""
                  onSave={handleAddAisle}
                  onCancel={() => setAddingCard(false)}
                />
              ) : (
                <AddCard label="Add Aisle" onClick={() => setAddingCard(true)} />
              )}
            </div>
          )}

          {/* Level: Racks */}
          {drillLevel === 'racks' && selectedAisle && (
            <div className="flex flex-wrap gap-4">
              {(selectedAisle.racks || []).map((rack) => (
                <RackHCard
                  key={rack.id}
                  rack={rack}
                  rackTemplates={rackTemplates}
                  onTemplateChange={(tId) => handleRackTemplateChange(rack.id, tId)}
                  onOpen={() => navigate(`/cosmos/views/rack/${rack.id}`)}
                />
              ))}
              {addingCard ? (
                <div className="w-48">
                  <InlineEditForm
                    title="New Rack"
                    initialName=""
                    onSave={async (name) => {
                      setAddingCard(false);
                      void name;
                    }}
                    onCancel={() => setAddingCard(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAddingCard(true)}
                  className="flex h-full min-h-[140px] w-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[#465fff] hover:text-[#465fff] dark:border-gray-700"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Add Rack</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
