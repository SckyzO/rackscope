import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GripVertical,
  Plus,
  X,
  FileCode,
  ExternalLink,
  Server,
  ChevronRight,
} from 'lucide-react';
import type { Room, Aisle, Rack, RackTemplate } from '../../../types';
import { api } from '../../../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface RoomEditorCanvasProps {
  room: Room;
  rackTemplates: RackTemplate[];
  onRoomUpdate: (updatedRoom: Room) => void;
}

// ── YamlDrawer ────────────────────────────────────────────────────────────────

interface YamlDrawerTarget {
  type: 'aisle';
  data: Aisle;
}

interface YamlDrawerProps {
  target: YamlDrawerTarget;
  onClose: () => void;
}

const YamlDrawer = ({ target, onClose }: YamlDrawerProps) => (
  <>
    {/* Overlay */}
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    />
    {/* Drawer */}
    <div className="dark:bg-gray-dark fixed top-0 right-0 z-50 flex h-full w-[480px] flex-col bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <FileCode className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {target.data.name}
          </h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {target.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
          Current aisle data (read-only preview)
        </p>
        <textarea
          readOnly
          value={JSON.stringify(target.data, null, 2)}
          className="h-full w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
          style={{ minHeight: '360px' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          onClick={onClose}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  </>
);

// ── RackCard ──────────────────────────────────────────────────────────────────

interface RackCardProps {
  rack: Rack;
  aisleId: string;
  isDragTarget: boolean;
  onDragStart: (rackId: string, aisleId: string) => void;
  onDragOver: (e: React.DragEvent, aisleId: string, rackId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetAisleId: string, afterRackId: string | null) => void;
  onDeleteRack: (aisleId: string, rackId: string) => void;
  onEditYaml: (rack: Rack) => void;
}

const RackCard = ({
  rack,
  aisleId,
  isDragTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDeleteRack,
  onEditYaml,
}: RackCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex-none"
      onDragOver={(e) => onDragOver(e, aisleId, rack.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, aisleId, rack.id)}
    >
      {/* Drop indicator line (before this card) */}
      {isDragTarget && (
        <div className="absolute -left-[3px] top-0 z-10 h-full w-[3px] rounded-full bg-blue-500" />
      )}

      <div
        draggable
        onDragStart={() => onDragStart(rack.id, aisleId)}
        className="group w-[148px] cursor-grab select-none rounded-xl border border-gray-200 bg-gray-50 p-2.5 transition-all active:cursor-grabbing active:opacity-70 dark:border-gray-700 dark:bg-gray-800/50"
      >
        {/* Drag handle row */}
        <div className="mb-2 flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
          <Server className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>

        {/* Rack ID */}
        <p className="truncate font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200">
          {rack.id}
        </p>

        {/* Rack name */}
        <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
          {rack.name}
        </p>

        {/* Stats row */}
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">
          {rack.u_height}U
          {rack.devices.length > 0 && (
            <> &middot; {rack.devices.length} dev</>
          )}
        </p>

        {/* Action buttons */}
        <div className="mt-2.5 flex items-center gap-1 border-t border-gray-100 pt-2 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditYaml(rack);
            }}
            title="View YAML"
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <FileCode className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/cosmos/editors/rack?rackId=${rack.id}`);
            }}
            title="Open in Rack Editor"
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRack(aisleId, rack.id);
            }}
            title="Remove from aisle"
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AddRackForm ───────────────────────────────────────────────────────────────

interface AddRackFormProps {
  aisleId: string;
  roomId: string;
  rackTemplates: RackTemplate[];
  existingRacks: Rack[];
  onAdd: (rack: Rack) => void;
  onAddAndEdit: (rack: Rack) => void;
  onCancel: () => void;
}

const AddRackForm = ({
  aisleId,
  rackTemplates,
  onAdd,
  onAddAndEdit,
  onCancel,
}: AddRackFormProps) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    id: '',
    name: '',
    u_height: '42',
    template_id: '',
  });

  const buildRack = (): Rack => ({
    id: form.id.trim(),
    name: form.name.trim() || form.id.trim(),
    u_height: parseInt(form.u_height, 10) || 42,
    template_id: form.template_id || undefined,
    devices: [],
  });

  const handleAdd = () => {
    if (!form.id.trim()) return;
    // TODO: api.createRack(aisleId, rackData) — backend endpoint needed
    onAdd(buildRack());
  };

  const handleAddAndEdit = () => {
    if (!form.id.trim()) return;
    // TODO: api.createRack(aisleId, rackData) — backend endpoint needed
    const rack = buildRack();
    onAddAndEdit(rack);
    navigate(`/cosmos/editors/rack?rackId=${rack.id}&aisleId=${aisleId}`);
  };

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
        Add Rack to {aisleId}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {/* ID */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            ID <span className="text-red-400">*</span>
          </label>
          <input
            autoFocus
            type="text"
            placeholder="r01-06"
            value={form.id}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            className="focus:border-brand-500 w-32 rounded-lg border border-gray-200 px-3 py-1.5 font-mono text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
          />
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Rack XH3000 Compute 06"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="focus:border-brand-500 w-52 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
          />
        </div>

        {/* U Height */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">U Height</label>
          <input
            type="number"
            min={1}
            max={52}
            value={form.u_height}
            onChange={(e) => setForm((f) => ({ ...f, u_height: e.target.value }))}
            className="focus:border-brand-500 w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Template */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Template</label>
          <select
            value={form.template_id}
            onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))}
            className="focus:border-brand-500 w-48 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">— No template —</option>
            {rackTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pb-0">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!form.id.trim()}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            Add Rack
          </button>
          <button
            onClick={handleAddAndEdit}
            disabled={!form.id.trim()}
            className="disabled:opacity-40 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Add &amp; Edit
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AisleBand ─────────────────────────────────────────────────────────────────

interface AisleBandProps {
  aisle: Aisle;
  room: Room;
  rackTemplates: RackTemplate[];
  isDragOverAisle: boolean;
  dragOverRack: { aisleId: string; rackId: string } | null;
  dragOverAisleEmpty: string | null;
  addingRack: string | null;
  onAisleDragStart: (aisleId: string) => void;
  onAisleDragOver: (e: React.DragEvent, aisleId: string) => void;
  onAisleDragLeave: () => void;
  onAisleDrop: (e: React.DragEvent, targetAisleId: string) => void;
  onRackDragStart: (rackId: string, fromAisleId: string) => void;
  onRackDragOver: (e: React.DragEvent, aisleId: string, rackId: string) => void;
  onRackDragLeave: () => void;
  onRackDrop: (e: React.DragEvent, targetAisleId: string, afterRackId: string | null) => void;
  onRackDropEmpty: (e: React.DragEvent, targetAisleId: string) => void;
  onSetAddingRack: (aisleId: string | null) => void;
  onAddRack: (aisleId: string, rack: Rack) => void;
  onDeleteAisle: (aisleId: string) => void;
  onDeleteRack: (aisleId: string, rackId: string) => void;
  onEditYamlAisle: (aisle: Aisle) => void;
  onEditYamlRack: (rack: Rack) => void;
}

const AisleBand = ({
  aisle,
  room,
  rackTemplates,
  isDragOverAisle,
  dragOverRack,
  dragOverAisleEmpty,
  addingRack,
  onAisleDragStart,
  onAisleDragOver,
  onAisleDragLeave,
  onAisleDrop,
  onRackDragStart,
  onRackDragOver,
  onRackDragLeave,
  onRackDrop,
  onRackDropEmpty,
  onSetAddingRack,
  onAddRack,
  onDeleteAisle,
  onDeleteRack,
  onEditYamlAisle,
  onEditYamlRack,
}: AisleBandProps) => {
  const isAddingHere = addingRack === aisle.id;

  return (
    <div
      draggable
      onDragStart={() => onAisleDragStart(aisle.id)}
      onDragOver={(e) => onAisleDragOver(e, aisle.id)}
      onDragLeave={onAisleDragLeave}
      onDrop={(e) => onAisleDrop(e, aisle.id)}
      className={[
        'rounded-2xl border p-4 transition-all',
        isDragOverAisle
          ? 'border-brand-500 border-dashed bg-brand-500/5 dark:bg-brand-500/5'
          : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
      ].join(' ')}
    >
      {/* Aisle header */}
      <div className="mb-3 flex items-center gap-2">
        {/* Drag handle */}
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing dark:text-gray-600" />

        {/* Aisle name */}
        <span className="flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
          {aisle.name}
        </span>

        {/* Rack count badge */}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {aisle.racks.length} rack{aisle.racks.length !== 1 ? 's' : ''}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditYamlAisle(aisle)}
            title="View YAML"
            className="flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <FileCode className="h-3.5 w-3.5" />
            YAML
          </button>
          <button
            onClick={() => onSetAddingRack(isAddingHere ? null : aisle.id)}
            title="Add rack to this aisle"
            className={[
              'flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors',
              isAddingHere
                ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/50'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800',
            ].join(' ')}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Rack
          </button>
          <button
            onClick={() => onDeleteAisle(aisle.id)}
            title="Delete aisle"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Rack row */}
      <div className="cosmos-scrollbar overflow-x-auto pb-1">
        <div className="flex items-start gap-2.5 pr-2">
          {aisle.racks.length === 0 ? (
            /* Empty aisle drop zone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => onRackDropEmpty(e, aisle.id)}
              className={[
                'flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed text-sm transition-all',
                dragOverAisleEmpty === aisle.id
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500 dark:border-brand-500/70 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-600',
              ].join(' ')}
            >
              Drop rack here
            </div>
          ) : (
            <>
              {aisle.racks.map((rack) => (
                <RackCard
                  key={rack.id}
                  rack={rack}
                  aisleId={aisle.id}
                  isDragTarget={
                    dragOverRack?.aisleId === aisle.id && dragOverRack?.rackId === rack.id
                  }
                  onDragStart={onRackDragStart}
                  onDragOver={onRackDragOver}
                  onDragLeave={onRackDragLeave}
                  onDrop={onRackDrop}
                  onDeleteRack={onDeleteRack}
                  onEditYaml={onEditYamlRack}
                />
              ))}

              {/* Drop zone at end of aisle */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => onRackDropEmpty(e, aisle.id)}
                className={[
                  'h-[120px] w-[40px] shrink-0 rounded-xl border-2 border-dashed transition-all',
                  dragOverAisleEmpty === aisle.id
                    ? 'border-brand-500 bg-brand-500/10 dark:border-brand-500/70 dark:bg-brand-500/10'
                    : 'border-gray-100 dark:border-gray-800',
                ].join(' ')}
              />
            </>
          )}
        </div>
      </div>

      {/* Add rack form */}
      {isAddingHere && (
        <AddRackForm
          aisleId={aisle.id}
          roomId={room.id}
          rackTemplates={rackTemplates}
          existingRacks={aisle.racks}
          onAdd={(rack) => onAddRack(aisle.id, rack)}
          onAddAndEdit={(rack) => onAddRack(aisle.id, rack)}
          onCancel={() => onSetAddingRack(null)}
        />
      )}
    </div>
  );
};

// ── RoomEditorCanvas (main export) ────────────────────────────────────────────

export const RoomEditorCanvas = ({ room, rackTemplates, onRoomUpdate }: RoomEditorCanvasProps) => {
  // ── Aisle DnD refs / state ────────────────────────────────────────────────
  const dragAisleRef = useRef<string | null>(null);
  const [dragOverAisle, setDragOverAisle] = useState<string | null>(null);

  // ── Rack DnD refs / state ─────────────────────────────────────────────────
  const dragRackRef = useRef<{ rackId: string; fromAisleId: string } | null>(null);
  const [dragOverRack, setDragOverRack] = useState<{ aisleId: string; rackId: string } | null>(
    null
  );
  const [dragOverAisleEmpty, setDragOverAisleEmpty] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [addingRack, setAddingRack] = useState<string | null>(null);
  const [yamlDrawerOpen, setYamlDrawerOpen] = useState(false);
  const [yamlTarget, setYamlTarget] = useState<YamlDrawerTarget | null>(null);

  // ── Aisle DnD handlers ────────────────────────────────────────────────────

  const handleAisleDragStart = (aisleId: string) => {
    dragAisleRef.current = aisleId;
    // Clear rack drag state so aisle drag takes precedence
    dragRackRef.current = null;
  };

  const handleAisleDragOver = (e: React.DragEvent, aisleId: string) => {
    // Only handle aisle drag-over when we're actually dragging an aisle
    if (!dragAisleRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragAisleRef.current !== aisleId) {
      setDragOverAisle(aisleId);
    }
  };

  const handleAisleDragLeave = () => {
    setDragOverAisle(null);
  };

  const handleAisleDrop = async (e: React.DragEvent, targetAisleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAisle(null);

    if (!dragAisleRef.current || dragAisleRef.current === targetAisleId) {
      dragAisleRef.current = null;
      return;
    }

    const newAisles = [...room.aisles];
    const fromIdx = newAisles.findIndex((a) => a.id === dragAisleRef.current);
    const toIdx = newAisles.findIndex((a) => a.id === targetAisleId);

    if (fromIdx === -1 || toIdx === -1) {
      dragAisleRef.current = null;
      return;
    }

    const [moved] = newAisles.splice(fromIdx, 1);
    newAisles.splice(toIdx, 0, moved);

    dragAisleRef.current = null;

    // Optimistic update
    onRoomUpdate({ ...room, aisles: newAisles });

    // Persist to API
    const aislesRecord: Record<string, string[]> = {};
    newAisles.forEach((a) => {
      aislesRecord[a.id] = a.racks.map((r) => r.id);
    });
    await api.updateRoomAisles(room.id, aislesRecord).catch((_err) => {
      /* ignore — optimistic update already applied */
    });
  };

  // ── Rack DnD handlers ─────────────────────────────────────────────────────

  const handleRackDragStart = (rackId: string, fromAisleId: string) => {
    // Clear aisle drag when starting a rack drag
    dragAisleRef.current = null;
    dragRackRef.current = { rackId, fromAisleId };
  };

  const handleRackDragOver = (e: React.DragEvent, aisleId: string, rackId: string) => {
    if (!dragRackRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverAisleEmpty(null);
    setDragOverRack({ aisleId, rackId });
  };

  const handleRackDragLeave = () => {
    setDragOverRack(null);
  };

  const handleRackDrop = async (
    e: React.DragEvent,
    targetAisleId: string,
    afterRackId: string | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverRack(null);
    setDragOverAisleEmpty(null);

    if (!dragRackRef.current) return;

    const { rackId, fromAisleId } = dragRackRef.current;
    dragRackRef.current = null;

    if (fromAisleId === targetAisleId && afterRackId === rackId) return;

    // Remove from source aisle
    const withRemoved = room.aisles.map((aisle) => {
      if (aisle.id === fromAisleId) {
        return { ...aisle, racks: aisle.racks.filter((r) => r.id !== rackId) };
      }
      return aisle;
    });

    // Insert into target aisle
    const newAisles = withRemoved.map((aisle) => {
      if (aisle.id === targetAisleId) {
        const movingRack = room.aisles.flatMap((a) => a.racks).find((r) => r.id === rackId);
        if (!movingRack) return aisle;
        const racks = [...aisle.racks.filter((r) => r.id !== rackId)];
        if (afterRackId === null) {
          racks.push(movingRack);
        } else {
          const idx = racks.findIndex((r) => r.id === afterRackId);
          racks.splice(idx + 1, 0, movingRack);
        }
        return { ...aisle, racks };
      }
      return aisle;
    });

    // Optimistic update
    onRoomUpdate({ ...room, aisles: newAisles });

    // Persist
    const targetAisle = newAisles.find((a) => a.id === targetAisleId);
    if (targetAisle) {
      await api
        .updateAisleRacks(
          targetAisleId,
          room.id,
          targetAisle.racks.map((r) => r.id)
        )
        .catch((_err) => { /* ignore — optimistic update already applied */ });
    }

    if (fromAisleId !== targetAisleId) {
      const sourceAisle = newAisles.find((a) => a.id === fromAisleId);
      if (sourceAisle) {
        await api
          .updateAisleRacks(
            fromAisleId,
            room.id,
            sourceAisle.racks.map((r) => r.id)
          )
          .catch((_err) => { /* ignore — optimistic update already applied */ });
      }
    }
  };

  const handleRackDropEmpty = async (e: React.DragEvent, targetAisleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAisleEmpty(null);
    await handleRackDrop(e, targetAisleId, null);
  };

  // ── Rack CRUD ─────────────────────────────────────────────────────────────

  const handleAddRack = async (aisleId: string, rack: Rack) => {
    const newAisles = room.aisles.map((aisle) => {
      if (aisle.id === aisleId) {
        return { ...aisle, racks: [...aisle.racks, rack] };
      }
      return aisle;
    });

    setAddingRack(null);
    onRoomUpdate({ ...room, aisles: newAisles });

    // Persist rack order to API
    const targetAisle = newAisles.find((a) => a.id === aisleId);
    if (targetAisle) {
      await api
        .updateAisleRacks(
          aisleId,
          room.id,
          targetAisle.racks.map((r) => r.id)
        )
        .catch((_err) => { /* ignore — optimistic update already applied */ });
    }
  };

  const handleDeleteRack = async (aisleId: string, rackId: string) => {
    const newAisles = room.aisles.map((aisle) => {
      if (aisle.id === aisleId) {
        return { ...aisle, racks: aisle.racks.filter((r) => r.id !== rackId) };
      }
      return aisle;
    });

    onRoomUpdate({ ...room, aisles: newAisles });

    const targetAisle = newAisles.find((a) => a.id === aisleId);
    if (targetAisle) {
      await api
        .updateAisleRacks(
          aisleId,
          room.id,
          targetAisle.racks.map((r) => r.id)
        )
        .catch((_err) => { /* ignore — optimistic update already applied */ });
    }
  };

  const handleDeleteAisle = async (aisleId: string) => {
    const newAisles = room.aisles.filter((a) => a.id !== aisleId);
    onRoomUpdate({ ...room, aisles: newAisles });

    const aislesRecord: Record<string, string[]> = {};
    newAisles.forEach((a) => {
      aislesRecord[a.id] = a.racks.map((r) => r.id);
    });
    await api.updateRoomAisles(room.id, aislesRecord).catch((_err) => { /* ignore — optimistic update already applied */ });
  };

  // ── YAML drawer handlers ──────────────────────────────────────────────────

  const handleEditYamlAisle = (aisle: Aisle) => {
    setYamlTarget({ type: 'aisle', data: aisle });
    setYamlDrawerOpen(true);
  };

  // For now rack YAML uses the same drawer pattern (aisle type wraps the rack data)
  const handleEditYamlRack = (rack: Rack) => {
    // Wrap as an aisle-shaped target for the drawer (reuse pattern)
    setYamlTarget({
      type: 'aisle',
      data: {
        id: rack.id,
        name: rack.name,
        racks: [rack],
      },
    });
    setYamlDrawerOpen(true);
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (room.aisles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 dark:border-gray-800">
        <Server className="mb-3 h-10 w-10 text-gray-200 dark:text-gray-700" />
        <p className="text-sm font-medium text-gray-400 dark:text-gray-600">No aisles yet</p>
        <p className="mt-1 text-xs text-gray-300 dark:text-gray-700">
          Add an aisle to start organizing racks
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-3">
        {room.aisles.map((aisle) => (
          <AisleBand
            key={aisle.id}
            aisle={aisle}
            room={room}
            rackTemplates={rackTemplates}
            isDragOverAisle={dragOverAisle === aisle.id}
            dragOverRack={dragOverRack}
            dragOverAisleEmpty={dragOverAisleEmpty}
            addingRack={addingRack}
            onAisleDragStart={handleAisleDragStart}
            onAisleDragOver={handleAisleDragOver}
            onAisleDragLeave={handleAisleDragLeave}
            onAisleDrop={handleAisleDrop}
            onRackDragStart={handleRackDragStart}
            onRackDragOver={handleRackDragOver}
            onRackDragLeave={handleRackDragLeave}
            onRackDrop={handleRackDrop}
            onRackDropEmpty={handleRackDropEmpty}
            onSetAddingRack={setAddingRack}
            onAddRack={handleAddRack}
            onDeleteAisle={handleDeleteAisle}
            onDeleteRack={handleDeleteRack}
            onEditYamlAisle={handleEditYamlAisle}
            onEditYamlRack={handleEditYamlRack}
          />
        ))}
      </div>

      {/* YAML Drawer */}
      {yamlDrawerOpen && yamlTarget && (
        <YamlDrawer
          target={yamlTarget}
          onClose={() => {
            setYamlDrawerOpen(false);
            setYamlTarget(null);
          }}
        />
      )}
    </>
  );
};
