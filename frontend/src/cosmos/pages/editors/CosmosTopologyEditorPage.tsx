import React, { useState, useEffect, useRef } from 'react';
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
  GripVertical,
  Check,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Site, Room, Aisle, Rack, RackTemplate } from '../../../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function findRoom(topology: Site[], roomId: string): Room | null {
  for (const site of topology) {
    const room = (site.rooms ?? []).find((r) => r.id === roomId);
    if (room) return room;
  }
  return null;
}

function totalRacksInRoom(room: Room): number {
  const fromAisles = (room.aisles ?? []).reduce((acc, a) => acc + (a.racks ?? []).length, 0);
  return fromAisles + (room.standalone_racks ?? []).length;
}

function totalRacksInSite(site: Site): number {
  return (site.rooms ?? []).reduce((acc, r) => acc + totalRacksInRoom(r), 0);
}

// ─── InlineCreateForm ───────────────────────────────────────────────────────

type InlineCreateFormProps = {
  placeholder: string;
  onSave: (name: string, id: string | null) => Promise<void>;
  onCancel: () => void;
};

const InlineCreateForm = ({ placeholder, onSave, onCancel }: InlineCreateFormProps) => {
  const [name, setName] = useState('');
  const [customId, setCustomId] = useState('');
  const [showId, setShowId] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim(), customId.trim() || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="mx-3 my-1.5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 dark:bg-red-500/10">
          <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
          <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}
      <input
        ref={nameRef}
        type="text"
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="focus:border-brand-400 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      {showId && (
        <input
          type="text"
          placeholder="Custom ID (optional)"
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          onKeyDown={handleKeyDown}
          className="focus:border-brand-400 mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-mono text-xs text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      )}
      {!showId && (
        <button
          onClick={() => setShowId(true)}
          className="mt-1 text-[10px] text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
        >
          Set custom ID
        </button>
      )}
      <div className="mt-2.5 flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─── SaveStatusBadge ────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type SaveStatusBadgeProps = { status: SaveStatus };

const SaveStatusBadge = ({ status }: SaveStatusBadgeProps) => {
  if (status === 'idle') return null;
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  if (status === 'saved')
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
      <AlertCircle className="h-3 w-3" />
      Error
    </span>
  );
};

// ─── RackItem ───────────────────────────────────────────────────────────────

type RackItemProps = {
  rack: Rack;
  aisleId: string;
  roomId: string;
  templateName: string | undefined;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent, rack: Rack, aisleId: string, roomId: string) => void;
};

const RackItem = ({
  rack,
  aisleId,
  roomId,
  templateName,
  isSelected,
  onSelect,
  onDragStart,
}: RackItemProps) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, rack, aisleId, roomId)}
    onClick={onSelect}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
      isSelected
        ? 'border-brand-500 bg-brand-500/10 text-brand-400 border-l-2'
        : 'text-gray-500 hover:bg-gray-800 dark:text-gray-500'
    }`}
    style={{ paddingLeft: '52px' }}
  >
    <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-gray-600 opacity-0 group-hover:opacity-100" />
    <Server className="h-3.5 w-3.5 shrink-0 opacity-70" />
    <span className="flex-1 truncate text-xs font-medium">{rack.name}</span>
    <div className="flex items-center gap-1">
      {templateName && (
        <span className="hidden rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400 group-hover:inline">
          {templateName}
        </span>
      )}
      <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
        {(rack.devices ?? []).length}d
      </span>
    </div>
  </div>
);

// ─── AisleNode ──────────────────────────────────────────────────────────────

type AisleNodeProps = {
  aisle: Aisle;
  roomId: string;
  isExpanded: boolean;
  isSelected: boolean;
  isDragOver: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddAisle: () => void;
  onDragOver: (e: React.DragEvent, aisleId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetAisleId: string, roomId: string) => void;
  onRackSelect: (rackId: string) => void;
  onRackDragStart: (e: React.DragEvent, rack: Rack, aisleId: string, roomId: string) => void;
  selectedRackId: string | null;
  rackTemplates: RackTemplate[];
};

const AisleNode = ({
  aisle,
  roomId,
  isExpanded,
  isSelected,
  isDragOver,
  onToggle,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onRackSelect,
  onRackDragStart,
  selectedRackId,
  rackTemplates,
}: AisleNodeProps) => (
  <div>
    <div
      onDragOver={(e) => onDragOver(e, aisle.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, aisle.id, roomId)}
      className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
        isDragOver
          ? 'border-brand-500 bg-brand-500/15 border border-dashed'
          : isSelected
            ? 'border-brand-500 bg-brand-500/10 text-brand-400 border-l-2'
            : 'text-gray-400 hover:bg-gray-800 dark:text-gray-400'
      }`}
      style={{ paddingLeft: '32px' }}
    >
      <button
        className="shrink-0 p-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      <div
        className="flex flex-1 items-center gap-1.5"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      >
        <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="flex-1 truncate text-xs font-medium">{aisle.name}</span>
        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
          {(aisle.racks ?? []).length}r
        </span>
      </div>
    </div>
    {isExpanded &&
      (aisle.racks ?? []).map((rack) => (
        <RackItem
          key={rack.id}
          rack={rack}
          aisleId={aisle.id}
          roomId={roomId}
          templateName={rackTemplates.find((t) => t.id === rack.template_id)?.name}
          isSelected={selectedRackId === rack.id}
          onSelect={() => onRackSelect(rack.id)}
          onDragStart={onRackDragStart}
        />
      ))}
  </div>
);

// ─── RoomNode ────────────────────────────────────────────────────────────────

type RoomNodeProps = {
  room: Room;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddAisle: (roomId: string) => void;
  addingAisleForRoom: string | null;
  onAisleCancelCreate: () => void;
  onAisleCreate: (roomId: string, name: string, id: string | null) => Promise<void>;
  aisleExpanded: Set<string>;
  onAisleToggle: (aisleId: string) => void;
  selectedAisleId: string | null;
  onAisleSelect: (aisleId: string) => void;
  selectedRackId: string | null;
  onRackSelect: (rackId: string) => void;
  dragOverAisle: string | null;
  onAisleDragOver: (e: React.DragEvent, aisleId: string) => void;
  onAisleDragLeave: () => void;
  onAisleDrop: (e: React.DragEvent, targetAisleId: string, roomId: string) => void;
  onRackDragStart: (e: React.DragEvent, rack: Rack, aisleId: string, roomId: string) => void;
  rackTemplates: RackTemplate[];
};

const RoomNode = ({
  room,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onAddAisle,
  addingAisleForRoom,
  onAisleCreate,
  onAisleCancelCreate,
  aisleExpanded,
  onAisleToggle,
  selectedAisleId,
  onAisleSelect,
  selectedRackId,
  onRackSelect,
  dragOverAisle,
  onAisleDragOver,
  onAisleDragLeave,
  onAisleDrop,
  onRackDragStart,
  rackTemplates,
}: RoomNodeProps) => (
  <div>
    <div
      className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
        isSelected
          ? 'border-brand-500 bg-brand-500/10 text-brand-400 border-l-2'
          : 'text-gray-400 hover:bg-gray-800 dark:text-gray-400'
      }`}
      style={{ paddingLeft: '16px' }}
    >
      <button
        className="shrink-0 p-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      <div
        className="flex flex-1 items-center gap-1.5"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="flex-1 truncate text-xs font-medium">{room.name}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddAisle(room.id);
        }}
        className="hidden rounded p-0.5 text-gray-500 group-hover:flex hover:bg-gray-700 hover:text-gray-300"
        title="Add Aisle"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
    {isExpanded && (
      <div>
        {(room.aisles ?? []).map((aisle) => (
          <AisleNode
            key={aisle.id}
            aisle={aisle}
            roomId={room.id}
            isExpanded={aisleExpanded.has(aisle.id)}
            isSelected={selectedAisleId === aisle.id}
            isDragOver={dragOverAisle === aisle.id}
            onToggle={() => onAisleToggle(aisle.id)}
            onSelect={() => onAisleSelect(aisle.id)}
            onAddAisle={() => {}}
            onDragOver={onAisleDragOver}
            onDragLeave={onAisleDragLeave}
            onDrop={onAisleDrop}
            onRackSelect={onRackSelect}
            onRackDragStart={onRackDragStart}
            selectedRackId={selectedRackId}
            rackTemplates={rackTemplates}
          />
        ))}
        {addingAisleForRoom === room.id && (
          <InlineCreateForm
            placeholder="Aisle name *"
            onSave={(name, id) => onAisleCreate(room.id, name, id)}
            onCancel={onAisleCancelCreate}
          />
        )}
      </div>
    )}
  </div>
);

// ─── SiteNode ────────────────────────────────────────────────────────────────

type SiteNodeProps = {
  site: Site;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddRoom: (siteId: string) => void;
  addingRoomForSite: string | null;
  onRoomCreate: (siteId: string, name: string, id: string | null) => Promise<void>;
  onRoomCancelCreate: () => void;
  roomExpanded: Set<string>;
  onRoomToggle: (roomId: string) => void;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string, siteId: string) => void;
  addingAisleForRoom: string | null;
  onAddAisle: (roomId: string) => void;
  onAisleCreate: (roomId: string, name: string, id: string | null) => Promise<void>;
  onAisleCancelCreate: () => void;
  aisleExpanded: Set<string>;
  onAisleToggle: (aisleId: string) => void;
  selectedAisleId: string | null;
  onAisleSelect: (aisleId: string) => void;
  selectedRackId: string | null;
  onRackSelect: (rackId: string) => void;
  dragOverAisle: string | null;
  onAisleDragOver: (e: React.DragEvent, aisleId: string) => void;
  onAisleDragLeave: () => void;
  onAisleDrop: (e: React.DragEvent, targetAisleId: string, roomId: string) => void;
  onRackDragStart: (e: React.DragEvent, rack: Rack, aisleId: string, roomId: string) => void;
  rackTemplates: RackTemplate[];
};

const SiteNode = ({
  site,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onAddRoom,
  addingRoomForSite,
  onRoomCreate,
  onRoomCancelCreate,
  roomExpanded,
  onRoomToggle,
  selectedRoomId,
  onRoomSelect,
  addingAisleForRoom,
  onAddAisle,
  onAisleCreate,
  onAisleCancelCreate,
  aisleExpanded,
  onAisleToggle,
  selectedAisleId,
  onAisleSelect,
  selectedRackId,
  onRackSelect,
  dragOverAisle,
  onAisleDragOver,
  onAisleDragLeave,
  onAisleDrop,
  onRackDragStart,
  rackTemplates,
}: SiteNodeProps) => (
  <div>
    <div
      className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
        isSelected
          ? 'border-brand-500 bg-brand-500/10 text-brand-400 border-l-2'
          : 'text-gray-300 hover:bg-gray-800 dark:text-gray-300'
      }`}
    >
      <button
        className="shrink-0 p-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      <div
        className="flex flex-1 items-center gap-1.5"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="flex-1 truncate text-xs font-semibold">{site.name}</span>
        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
          {totalRacksInSite(site)}r
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddRoom(site.id);
        }}
        className="hidden rounded p-0.5 text-gray-500 group-hover:flex hover:bg-gray-700 hover:text-gray-300"
        title="Add Room"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
    {isExpanded && (
      <div>
        {(site.rooms ?? []).map((room) => (
          <RoomNode
            key={room.id}
            room={room}
            isExpanded={roomExpanded.has(room.id)}
            isSelected={selectedRoomId === room.id}
            onToggle={() => onRoomToggle(room.id)}
            onSelect={() => onRoomSelect(room.id, site.id)}
            onAddAisle={onAddAisle}
            addingAisleForRoom={addingAisleForRoom}
            onAisleCreate={onAisleCreate}
            onAisleCancelCreate={onAisleCancelCreate}
            aisleExpanded={aisleExpanded}
            onAisleToggle={onAisleToggle}
            selectedAisleId={selectedAisleId}
            onAisleSelect={onAisleSelect}
            selectedRackId={selectedRackId}
            onRackSelect={onRackSelect}
            dragOverAisle={dragOverAisle}
            onAisleDragOver={onAisleDragOver}
            onAisleDragLeave={onAisleDragLeave}
            onAisleDrop={onAisleDrop}
            onRackDragStart={onRackDragStart}
            rackTemplates={rackTemplates}
          />
        ))}
        {addingRoomForSite === site.id && (
          <InlineCreateForm
            placeholder="Room name *"
            onSave={(name, id) => onRoomCreate(site.id, name, id)}
            onCancel={onRoomCancelCreate}
          />
        )}
      </div>
    )}
  </div>
);

// ─── Context Panels ──────────────────────────────────────────────────────────

type WelcomePanelProps = { onAddSite: () => void };

const WelcomePanel = ({ onAddSite }: WelcomePanelProps) => (
  <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800">
      <MapPin className="h-8 w-8 text-gray-600" />
    </div>
    <div>
      <h3 className="text-base font-semibold text-gray-200">Select an item</h3>
      <p className="mt-1 max-w-xs text-sm text-gray-500">
        Click any item in the tree to inspect or edit it.
      </p>
    </div>
    <button
      onClick={onAddSite}
      className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
    >
      <Plus className="h-4 w-4" />
      Add Site
    </button>
  </div>
);

// ─── Site Panel ──────────────────────────────────────────────────────────────

type SitePanelProps = {
  site: Site;
  onAddRoom: () => void;
};

const SitePanel = ({ site, onAddRoom }: SitePanelProps) => (
  <div className="space-y-6">
    <div>
      <div className="flex items-center gap-3">
        <div className="bg-brand-500/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <MapPin className="text-brand-400 h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">{site.name}</h2>
          <p className="font-mono text-xs text-gray-500">{site.id}</p>
        </div>
      </div>
      {site.description && <p className="mt-3 text-sm text-gray-400">{site.description}</p>}
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
        <p className="text-2xl font-bold text-gray-100">{(site.rooms ?? []).length}</p>
        <p className="mt-0.5 text-xs text-gray-500">Rooms</p>
      </div>
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
        <p className="text-2xl font-bold text-gray-100">{totalRacksInSite(site)}</p>
        <p className="mt-0.5 text-xs text-gray-500">Total Racks</p>
      </div>
    </div>

    {site.location && (
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
        <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Location
        </p>
        <div className="space-y-1 text-sm text-gray-300">
          {site.location.address && <p>{site.location.address}</p>}
          <p className="font-mono text-xs text-gray-500">
            {site.location.lat}, {site.location.lon}
          </p>
        </div>
      </div>
    )}

    {(site.rooms ?? []).length > 0 && (
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-300">Rooms</p>
        <div className="space-y-2">
          {(site.rooms ?? []).map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-200">{room.name}</p>
                  <p className="font-mono text-[11px] text-gray-500">{room.id}</p>
                </div>
              </div>
              <span className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-400">
                {totalRacksInRoom(room)} racks
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    <button
      onClick={onAddRoom}
      className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
    >
      <Plus className="h-4 w-4" />
      Add Room
    </button>
  </div>
);

// ─── Room Panel ──────────────────────────────────────────────────────────────

type RoomPanelProps = {
  room: Room;
  onAddAisle: () => void;
};

const RoomPanel = ({ room, onAddAisle }: RoomPanelProps) => (
  <div className="space-y-6">
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800">
          <Building2 className="h-5 w-5 text-gray-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">{room.name}</h2>
          <p className="font-mono text-xs text-gray-500">{room.id}</p>
        </div>
      </div>
      {room.description && <p className="mt-3 text-sm text-gray-400">{room.description}</p>}
    </div>

    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
        <p className="text-2xl font-bold text-gray-100">{(room.aisles ?? []).length}</p>
        <p className="mt-0.5 text-xs text-gray-500">Aisles</p>
      </div>
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
        <p className="text-2xl font-bold text-gray-100">{totalRacksInRoom(room)}</p>
        <p className="mt-0.5 text-xs text-gray-500">Total Racks</p>
      </div>
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
        <p className="text-2xl font-bold text-gray-100">{(room.standalone_racks ?? []).length}</p>
        <p className="mt-0.5 text-xs text-gray-500">Standalone</p>
      </div>
    </div>

    {(room.aisles ?? []).length > 0 && (
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-300">Aisles</p>
        <div className="space-y-2">
          {(room.aisles ?? []).map((aisle) => (
            <div
              key={aisle.id}
              className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-200">{aisle.name}</p>
                  <p className="font-mono text-[11px] text-gray-500">{aisle.id}</p>
                </div>
              </div>
              <span className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-400">
                {(aisle.racks ?? []).length} racks
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    <button
      onClick={onAddAisle}
      className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
    >
      <Plus className="h-4 w-4" />
      Add Aisle
    </button>
  </div>
);

// ─── Aisle Panel ─────────────────────────────────────────────────────────────

type AislePanelProps = {
  aisle: Aisle;
  rackTemplates: RackTemplate[];
};

const AislePanel = ({ aisle, rackTemplates }: AislePanelProps) => (
  <div className="space-y-6">
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800">
          <Layers className="h-5 w-5 text-gray-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">{aisle.name}</h2>
          <p className="font-mono text-xs text-gray-500">{aisle.id}</p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
      <p className="text-2xl font-bold text-gray-100">{(aisle.racks ?? []).length}</p>
      <p className="mt-0.5 text-xs text-gray-500">Racks — drag between aisles in tree</p>
    </div>

    {(aisle.racks ?? []).length > 0 && (
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-300">Racks</p>
        <div className="space-y-2">
          {(aisle.racks ?? []).map((rack) => {
            const tpl = rackTemplates.find((t) => t.id === rack.template_id);
            return (
              <div
                key={rack.id}
                className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Server className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">{rack.name}</p>
                    <p className="font-mono text-[11px] text-gray-500">{rack.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tpl && (
                    <span className="rounded-lg bg-gray-700 px-2 py-0.5 text-[11px] text-gray-400">
                      {tpl.name}
                    </span>
                  )}
                  <span className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-400">
                    {(rack.devices ?? []).length}d
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

// ─── Rack Panel ──────────────────────────────────────────────────────────────

type RackPanelProps = {
  rack: Rack;
  rackTemplates: RackTemplate[];
  onSaveTemplate: (templateId: string | null) => Promise<void>;
  saveStatus: SaveStatus;
};

const RackPanel = ({ rack, rackTemplates, onSaveTemplate, saveStatus }: RackPanelProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(rack.template_id ?? '');

  const isDirty = selectedTemplate !== (rack.template_id ?? '');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800">
            <Server className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100">{rack.name}</h2>
            <p className="font-mono text-xs text-gray-500">{rack.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-2xl font-bold text-gray-100">{rack.u_height}U</p>
          <p className="mt-0.5 text-xs text-gray-500">Height</p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-2xl font-bold text-gray-100">{(rack.devices ?? []).length}</p>
          <p className="mt-0.5 text-xs text-gray-500">Devices</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
        <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Rack Template
        </p>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="focus:border-brand-400 w-full rounded-xl border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition-colors outline-none"
        >
          <option value="">— None —</option>
          {rackTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {isDirty && (
          <button
            onClick={() => onSaveTemplate(selectedTemplate || null)}
            disabled={saveStatus === 'saving'}
            className="bg-brand-500 hover:bg-brand-600 mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Template
          </button>
        )}
      </div>

      <a
        href={`/rack/${rack.id}/editor`}
        className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
      >
        <ExternalLink className="h-4 w-4" />
        Open in Rack Editor
      </a>
    </div>
  );
};

// ─── Types ───────────────────────────────────────────────────────────────────

type SelectionType =
  | { type: 'site'; id: string }
  | { type: 'room'; id: string; siteId: string }
  | { type: 'aisle'; id: string; roomId: string }
  | { type: 'rack'; id: string; aisleId: string; roomId: string }
  | null;

type AddingState =
  | { type: 'site' }
  | { type: 'room'; parentId: string }
  | { type: 'aisle'; parentId: string }
  | null;

type DragState = {
  rackId: string;
  fromAisleId: string;
  fromRoomId: string;
} | null;

// ─── Main Component ──────────────────────────────────────────────────────────

export const CosmosTopologyEditorPage: React.FC = () => {
  const [topology, setTopology] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [selected, setSelected] = useState<SelectionType>(null);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedAisles, setExpandedAisles] = useState<Set<string>>(new Set());

  const [adding, setAdding] = useState<AddingState>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [dragOverAisle, setDragOverAisle] = useState<string | null>(null);

  const reload = async () => {
    const [sites, catalog] = await Promise.all([api.getSites(), api.getCatalog()]);
    setTopology(Array.isArray(sites) ? sites : []);
    setRackTemplates(catalog?.rack_templates ?? []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [sites, catalog] = await Promise.all([api.getSites(), api.getCatalog()]);
        if (!active) return;
        setTopology(Array.isArray(sites) ? sites : []);
        setRackTemplates(catalog?.rack_templates ?? []);
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load topology');
      } finally {
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

  // ── Tree toggle helpers ──────────────────────────────────────────────────

  const toggleSite = (id: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRoom = (id: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAisle = (id: string) => {
    setExpandedAisles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Create handlers ──────────────────────────────────────────────────────

  const handleCreateSite = async (name: string, id: string | null) => {
    await withSave(async () => {
      await api.createSite({ id, name });
      setAdding(null);
    });
  };

  const handleCreateRoom = async (siteId: string, name: string, id: string | null) => {
    await withSave(async () => {
      await api.createRoom(siteId, { id, name });
      setAdding(null);
      setExpandedSites((prev) => new Set(prev).add(siteId));
    });
  };

  const handleCreateAisle = async (roomId: string, name: string, id: string | null) => {
    await withSave(async () => {
      await api.createRoomAisles(roomId, [{ id, name }]);
      setAdding(null);
      setExpandedRooms((prev) => new Set(prev).add(roomId));
    });
  };

  // ── DnD handlers ─────────────────────────────────────────────────────────

  const handleRackDragStart = (e: React.DragEvent, rack: Rack, aisleId: string, roomId: string) => {
    e.dataTransfer.setData('text/plain', rack.id);
    setDragState({ rackId: rack.id, fromAisleId: aisleId, fromRoomId: roomId });
  };

  const handleAisleDragOver = (e: React.DragEvent, aisleId: string) => {
    e.preventDefault();
    setDragOverAisle(aisleId);
  };

  const handleAisleDragLeave = () => {
    setDragOverAisle(null);
  };

  const handleAisleDrop = async (e: React.DragEvent, targetAisleId: string, roomId: string) => {
    e.preventDefault();
    if (!dragState || dragState.fromAisleId === targetAisleId) {
      setDragState(null);
      setDragOverAisle(null);
      return;
    }
    const room = findRoom(topology, roomId);
    if (!room) {
      setDragState(null);
      setDragOverAisle(null);
      return;
    }
    const newAisles: Record<string, string[]> = {};
    (room.aisles ?? []).forEach((a) => {
      if (a.id === dragState.fromAisleId) {
        newAisles[a.id] = (a.racks ?? []).filter((r) => r.id !== dragState.rackId).map((r) => r.id);
      } else if (a.id === targetAisleId) {
        newAisles[a.id] = [...(a.racks ?? []).map((r) => r.id), dragState.rackId];
      } else {
        newAisles[a.id] = (a.racks ?? []).map((r) => r.id);
      }
    });
    const capturedDragState = dragState;
    setDragState(null);
    setDragOverAisle(null);
    await withSave(async () => {
      await api.updateRoomAisles(roomId, newAisles);
      if (selected?.type === 'rack' && selected.id === capturedDragState.rackId) {
        setSelected({ type: 'rack', id: capturedDragState.rackId, aisleId: targetAisleId, roomId });
      }
    });
  };

  // ── Save rack template ───────────────────────────────────────────────────

  const handleSaveRackTemplate = async (rackId: string, templateId: string | null) => {
    await withSave(() => api.updateRackTemplate(rackId, templateId));
  };

  // ── Derived selection ────────────────────────────────────────────────────

  const selectedSite =
    selected?.type === 'site' ? (topology.find((s) => s.id === selected.id) ?? null) : null;

  const selectedRoom =
    selected?.type === 'room'
      ? (topology.find((s) => s.id === selected.siteId)?.rooms?.find((r) => r.id === selected.id) ??
        null)
      : null;

  const selectedAisle =
    selected?.type === 'aisle'
      ? (() => {
          const room = findRoom(topology, selected.roomId);
          return room?.aisles?.find((a) => a.id === selected.id) ?? null;
        })()
      : null;

  const selectedRack =
    selected?.type === 'rack'
      ? (() => {
          const room = findRoom(topology, selected.roomId);
          const aisle = room?.aisles?.find((a) => a.id === selected.aisleId);
          return aisle?.racks?.find((r) => r.id === selected.id) ?? null;
        })()
      : null;

  // ── Adding state helpers ─────────────────────────────────────────────────

  const addingRoomForSite = adding?.type === 'room' ? adding.parentId : null;
  const addingAisleForRoom = adding?.type === 'aisle' ? adding.parentId : null;

  const selectedRoomId = selected?.type === 'room' ? selected.id : null;
  const selectedAisleId = selected?.type === 'aisle' ? selected.id : null;
  const selectedRackId = selected?.type === 'rack' ? selected.id : null;

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <MapPin className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Topology Editor</h1>
            <p className="text-sm text-gray-500">Manage sites, rooms, aisles and racks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatusBadge status={saveStatus} />
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{loadError}</p>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden rounded-2xl border border-gray-800">
        {/* Left panel */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Hierarchy</p>
              <button
                onClick={() => setAdding({ type: 'site' })}
                className="bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
              >
                <Plus className="h-3 w-3" />
                Site
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              </div>
            ) : topology.length === 0 && adding?.type !== 'site' ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <FolderOpen className="mb-3 h-8 w-8 text-gray-700" />
                <p className="text-xs text-gray-500">No sites configured</p>
                <button
                  onClick={() => setAdding({ type: 'site' })}
                  className="text-brand-400 hover:text-brand-300 mt-3 text-xs underline"
                >
                  Create first site
                </button>
              </div>
            ) : (
              <>
                {topology.map((site) => (
                  <SiteNode
                    key={site.id}
                    site={site}
                    isExpanded={expandedSites.has(site.id)}
                    isSelected={selected?.type === 'site' && selected.id === site.id}
                    onToggle={() => toggleSite(site.id)}
                    onSelect={() => {
                      setSelected({ type: 'site', id: site.id });
                      if (!expandedSites.has(site.id)) toggleSite(site.id);
                    }}
                    onAddRoom={(siteId) => {
                      setAdding({ type: 'room', parentId: siteId });
                      if (!expandedSites.has(siteId)) toggleSite(siteId);
                    }}
                    addingRoomForSite={addingRoomForSite}
                    onRoomCreate={handleCreateRoom}
                    onRoomCancelCreate={() => setAdding(null)}
                    roomExpanded={expandedRooms}
                    onRoomToggle={toggleRoom}
                    selectedRoomId={selectedRoomId}
                    onRoomSelect={(roomId, siteId) => {
                      setSelected({ type: 'room', id: roomId, siteId });
                      if (!expandedRooms.has(roomId)) toggleRoom(roomId);
                    }}
                    addingAisleForRoom={addingAisleForRoom}
                    onAddAisle={(roomId) => {
                      setAdding({ type: 'aisle', parentId: roomId });
                      if (!expandedRooms.has(roomId)) toggleRoom(roomId);
                    }}
                    onAisleCreate={handleCreateAisle}
                    onAisleCancelCreate={() => setAdding(null)}
                    aisleExpanded={expandedAisles}
                    onAisleToggle={toggleAisle}
                    selectedAisleId={selectedAisleId}
                    onAisleSelect={(aisleId) => {
                      const room = site.rooms?.find((r) => r.aisles?.some((a) => a.id === aisleId));
                      if (!room) return;
                      setSelected({ type: 'aisle', id: aisleId, roomId: room.id });
                      if (!expandedAisles.has(aisleId)) toggleAisle(aisleId);
                    }}
                    selectedRackId={selectedRackId}
                    onRackSelect={(rackId) => {
                      for (const room of site.rooms ?? []) {
                        for (const aisle of room.aisles ?? []) {
                          if (aisle.racks?.some((r) => r.id === rackId)) {
                            setSelected({
                              type: 'rack',
                              id: rackId,
                              aisleId: aisle.id,
                              roomId: room.id,
                            });
                            return;
                          }
                        }
                      }
                    }}
                    dragOverAisle={dragOverAisle}
                    onAisleDragOver={handleAisleDragOver}
                    onAisleDragLeave={handleAisleDragLeave}
                    onAisleDrop={handleAisleDrop}
                    onRackDragStart={handleRackDragStart}
                    rackTemplates={rackTemplates}
                  />
                ))}
                {adding?.type === 'site' && (
                  <InlineCreateForm
                    placeholder="Site name *"
                    onSave={handleCreateSite}
                    onCancel={() => setAdding(null)}
                  />
                )}
              </>
            )}
          </div>

          <div className="border-t border-gray-800 px-4 py-3">
            <p className="text-[11px] text-gray-600">
              {topology.length} site{topology.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-gray-950 p-6">
          {selectedRack ? (
            <div className="mx-auto w-full max-w-xl">
              <RackPanel
                key={selectedRack.id}
                rack={selectedRack}
                rackTemplates={rackTemplates}
                onSaveTemplate={(templateId) => handleSaveRackTemplate(selectedRack.id, templateId)}
                saveStatus={saveStatus}
              />
            </div>
          ) : selectedAisle ? (
            <div className="mx-auto w-full max-w-xl">
              <AislePanel aisle={selectedAisle} rackTemplates={rackTemplates} />
            </div>
          ) : selectedRoom ? (
            <div className="mx-auto w-full max-w-xl">
              <RoomPanel
                room={selectedRoom}
                onAddAisle={() => {
                  setAdding({ type: 'aisle', parentId: selectedRoom.id });
                  setExpandedRooms((prev) => new Set(prev).add(selectedRoom.id));
                }}
              />
            </div>
          ) : selectedSite ? (
            <div className="mx-auto w-full max-w-xl">
              <SitePanel
                site={selectedSite}
                onAddRoom={() => {
                  setAdding({ type: 'room', parentId: selectedSite.id });
                  setExpandedSites((prev) => new Set(prev).add(selectedSite.id));
                }}
              />
            </div>
          ) : (
            <WelcomePanel onAddSite={() => setAdding({ type: 'site' })} />
          )}
        </div>
      </div>
    </div>
  );
};
