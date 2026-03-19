import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import jsYaml from 'js-yaml';
import {
  GripVertical,
  Plus,
  X,
  FileCode,
  ExternalLink,
  Server,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import type { Room, Aisle, Rack, RackTemplate } from '@src/types';
import { api } from '@src/services/api';

// ── Types ────────────────────────────────────────────────────────────────────

type RoomEditorCanvasProps = {
  room: Room;
  rackTemplates: RackTemplate[];
  onRoomUpdate: (updatedRoom: Room) => void;
  /** Called whenever the dirty/clean state changes */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Ref that will hold the save function — call from parent Save button */
  saveRef?: React.MutableRefObject<(() => Promise<void>) | undefined>;
};

// ── Tooltip ──────────────────────────────────────────────────────────────────

const Tooltip = ({ text, children }: { text: string; children: ReactNode }) => (
  <div className="group relative inline-flex">
    {children}
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-lg bg-gray-900 px-2 py-1 text-[10px] whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-700"
    >
      {text}
      <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
    </div>
  </div>
);

// ── DeleteConfirmModal — Default Modal design ─────────────────────────────────

type DeleteConfirmModalProps = {
  open: boolean;
  entityType: string;
  entityName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const DeleteConfirmModal = ({
  open,
  entityType,
  entityName,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Delete {entityType}?
        </h3>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          You are about to permanently delete{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{entityName}</span>. This
          will remove all racks within this aisle. This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ── YamlDrawer ────────────────────────────────────────────────────────────────

type YamlDrawerTarget = {
  type: 'aisle' | 'rack';
  data: Aisle | Rack;
};

type YamlDrawerProps = {
  target: YamlDrawerTarget;
  onClose: () => void;
};

const YamlDrawer = ({ target, onClose }: YamlDrawerProps) => {
  const yamlValue = jsYaml.dump(target.data, { lineWidth: 120 });

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer — dark to match Monaco */}
      <div className="fixed top-0 right-0 z-50 flex h-full w-[540px] flex-col border-l border-gray-800 bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileCode className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-white">{target.data.name}</h3>
            <span className="rounded-full bg-gray-800 px-2 py-0.5 font-mono text-[10px] text-gray-400">
              {target.type}
            </span>
            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500">
              read-only
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Monaco editor — read only */}
        <div className="min-h-0 flex-1">
          <MonacoEditor
            height="100%"
            defaultLanguage="yaml"
            theme="vs-dark"
            value={yamlValue}
            options={{
              readOnly: true,
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'none',
              contextmenu: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-800 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

// ── RackCard ──────────────────────────────────────────────────────────────────

type RackCardProps = {
  rack: Rack;
  aisleId: string;
  isDragTarget: boolean;
  isDragging: boolean;
  onDragStart: (rackId: string, aisleId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, aisleId: string, rackId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetAisleId: string, afterRackId: string | null) => void;
  onDeleteRack: (aisleId: string, rackId: string) => void;
  onEditYaml: (rack: Rack) => void;
};

const RackCard = ({
  rack,
  aisleId,
  isDragTarget,
  isDragging,
  onDragStart,
  onDragEnd,
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
        <div className="absolute top-0 -left-[3px] z-10 h-full w-[3px] rounded-full bg-blue-500" />
      )}

      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(rack.id, aisleId);
        }}
        onDragEnd={onDragEnd}
        className={[
          'group w-[148px] cursor-grab rounded-xl border bg-white p-3 transition-all duration-150 select-none active:cursor-grabbing dark:bg-gray-800',
          isDragging
            ? 'ring-brand-500/60 border-brand-400/50 dark:border-brand-500/50 scale-[1.04] rotate-[0.8deg] opacity-90 shadow-2xl ring-2'
            : 'hover:border-brand-400/70 hover:ring-brand-500/20 dark:hover:border-brand-500/60 dark:hover:ring-brand-500/25 border-gray-200 hover:shadow-lg hover:ring-2 hover:ring-offset-1 dark:border-gray-700 dark:hover:ring-offset-gray-800',
        ].join(' ')}
      >
        {/* Header: grip + icon + U-height badge */}
        <div className="mb-2 flex items-center gap-1">
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
          <Server className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
          <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-gray-500 dark:bg-gray-700/80 dark:text-gray-400">
            {rack.u_height}U
          </span>
        </div>

        {/* Rack ID */}
        <p className="font-mono text-[11px] leading-tight font-bold break-all text-gray-800 dark:text-gray-200">
          {rack.id}
        </p>

        {/* Rack name — up to 2 lines */}
        {rack.name && rack.name !== rack.id && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-gray-400 dark:text-gray-500">
            {rack.name}
          </p>
        )}

        {/* Stats row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {rack.devices.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600">
              {rack.devices.length} dev
            </span>
          )}
          {rack.template_id && (
            <span className="text-brand-500/70 dark:text-brand-400/60 max-w-full truncate text-[10px]">
              {rack.template_id}
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="mt-2 flex items-center gap-0.5 border-t border-gray-100 pt-2 dark:border-gray-700/80">
          <Tooltip text="View YAML definition">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditYaml(rack);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <FileCode className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Open in Rack Editor">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void navigate(`/editors/rack?rackId=${rack.id}`);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Remove rack from aisle">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRack(aisleId, rack.id);
              }}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

// ── AddRackForm ───────────────────────────────────────────────────────────────

type AddRackFormProps = {
  aisleId: string;
  roomId: string;
  rackTemplates: RackTemplate[];
  existingRacks: Rack[];
  onAdd: (rack: Rack) => void;
  onAddAndEdit: (rack: Rack) => void;
  onCancel: () => void;
};

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
    onAdd(buildRack());
  };

  const handleAddAndEdit = () => {
    if (!form.id.trim()) return;
    const rack = buildRack();
    onAddAndEdit(rack);
    void navigate(`/editors/rack?rackId=${rack.id}&aisleId=${aisleId}`);
  };

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
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
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
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
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!form.id.trim()}
            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-40"
          >
            Add Rack
          </button>
          <button
            onClick={handleAddAndEdit}
            disabled={!form.id.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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

type AisleBandProps = {
  aisle: Aisle;
  room: Room;
  rackTemplates: RackTemplate[];
  isDragOverAisle: boolean;
  dragOverRack: { aisleId: string; rackId: string } | null;
  dragOverAisleEmpty: string | null;
  draggingRackId: string | null;
  addingRack: string | null;
  onAisleDragStart: (aisleId: string) => void;
  onAisleDragOver: (e: React.DragEvent, aisleId: string) => void;
  onAisleDragLeave: () => void;
  onAisleDrop: (e: React.DragEvent, targetAisleId: string) => void;
  onRackDragStart: (rackId: string, fromAisleId: string) => void;
  onRackDragEnd: () => void;
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
};

const AisleBand = ({
  aisle,
  room,
  rackTemplates,
  isDragOverAisle,
  dragOverRack,
  dragOverAisleEmpty,
  draggingRackId,
  addingRack,
  onAisleDragStart,
  onAisleDragOver,
  onAisleDragLeave,
  onAisleDrop,
  onRackDragStart,
  onRackDragEnd,
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
          ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/5 border-dashed'
          : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
      ].join(' ')}
    >
      {/* Aisle header */}
      <div className="mb-3 flex items-center gap-2">
        <Tooltip text="Drag to reorder aisle">
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing dark:text-gray-600" />
        </Tooltip>

        <span className="flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
          {aisle.name}
        </span>

        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {aisle.racks.length} rack{aisle.racks.length !== 1 ? 's' : ''}
        </span>

        <div className="flex items-center gap-1">
          <Tooltip text="View aisle YAML">
            <button
              onClick={() => onEditYamlAisle(aisle)}
              className="flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <FileCode className="h-3.5 w-3.5" />
              YAML
            </button>
          </Tooltip>
          <Tooltip text="Add a rack to this aisle">
            <button
              onClick={() => onSetAddingRack(isAddingHere ? null : aisle.id)}
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
          </Tooltip>
          <Tooltip text="Delete this aisle">
            <button
              onClick={() => onDeleteAisle(aisle.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Rack row — wraps to multiple rows when aisle has many racks */}
      <div className="flex flex-wrap items-start gap-2.5">
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
                isDragging={draggingRackId === rack.id}
                onDragStart={onRackDragStart}
                onDragEnd={onRackDragEnd}
                onDragOver={onRackDragOver}
                onDragLeave={onRackDragLeave}
                onDrop={onRackDrop}
                onDeleteRack={onDeleteRack}
                onEditYaml={onEditYamlRack}
              />
            ))}
          </>
        )}
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

export const RoomEditorCanvas = ({
  room,
  rackTemplates,
  onRoomUpdate,
  onDirtyChange,
  saveRef,
}: RoomEditorCanvasProps) => {
  // ── Aisle DnD refs / state ────────────────────────────────────────────────
  const dragAisleRef = useRef<string | null>(null);
  const [dragOverAisle, setDragOverAisle] = useState<string | null>(null);

  // ── Rack DnD refs / state ─────────────────────────────────────────────────
  const dragRackRef = useRef<{ rackId: string; fromAisleId: string } | null>(null);
  const [dragOverRack, setDragOverRack] = useState<{ aisleId: string; rackId: string } | null>(
    null
  );
  const [dragOverAisleEmpty, setDragOverAisleEmpty] = useState<string | null>(null);
  const [draggingRackId, setDraggingRackId] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [addingRack, setAddingRack] = useState<string | null>(null);
  const [yamlDrawerOpen, setYamlDrawerOpen] = useState(false);
  const [yamlTarget, setYamlTarget] = useState<YamlDrawerTarget | null>(null);
  const [pendingDeleteAisleId, setPendingDeleteAisleId] = useState<string | null>(null);

  // ── Save state — lifted to parent via callbacks ───────────────────────────
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep saveRef and dirty callback in sync
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const aisle of room.aisles) {
        await api.updateAisleRacks(
          aisle.id,
          room.id,
          aisle.racks.map((r) => r.id)
        );
      }
      const aislesRecord: Record<string, string[]> = {};
      room.aisles.forEach((a) => {
        aislesRecord[a.id] = a.racks.map((r) => r.id);
      });
      await api.updateRoomAisles(room.id, aislesRecord);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  };

  // Update saveRef every render so parent always has latest closure
  if (saveRef) saveRef.current = handleSaveAll;

  // Notify parent when dirty changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: update local state + mark dirty (no API call)
  const updateRoom = (updated: Room) => {
    onRoomUpdate(updated);
    setIsDirty(true);
  };

  // ── Aisle DnD handlers ────────────────────────────────────────────────────

  const handleAisleDragStart = (aisleId: string) => {
    dragAisleRef.current = aisleId;
    dragRackRef.current = null;
  };

  const handleAisleDragOver = (e: React.DragEvent, aisleId: string) => {
    if (!dragAisleRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragAisleRef.current !== aisleId) setDragOverAisle(aisleId);
  };

  const handleAisleDragLeave = () => {
    setDragOverAisle(null);
  };

  const handleAisleDrop = (e: React.DragEvent, targetAisleId: string) => {
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
    updateRoom({ ...room, aisles: newAisles });
  };

  // ── Rack DnD handlers ─────────────────────────────────────────────────────

  const handleRackDragStart = (rackId: string, fromAisleId: string) => {
    dragAisleRef.current = null;
    dragRackRef.current = { rackId, fromAisleId };
    setDraggingRackId(rackId);
  };

  const handleRackDragEnd = () => {
    setDraggingRackId(null);
    dragRackRef.current = null;
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

  const handleRackDrop = (
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

    const withRemoved = room.aisles.map((aisle) => {
      if (aisle.id === fromAisleId)
        return { ...aisle, racks: aisle.racks.filter((r) => r.id !== rackId) };
      return aisle;
    });

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

    updateRoom({ ...room, aisles: newAisles });
  };

  const handleRackDropEmpty = (e: React.DragEvent, targetAisleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAisleEmpty(null);
    handleRackDrop(e, targetAisleId, null);
  };

  // ── Rack CRUD ─────────────────────────────────────────────────────────────

  const handleAddRack = async (aisleId: string, rack: Rack) => {
    const newAisles = room.aisles.map((aisle) => {
      if (aisle.id === aisleId) return { ...aisle, racks: [...aisle.racks, rack] };
      return aisle;
    });
    setAddingRack(null);
    updateRoom({ ...room, aisles: newAisles });
    const targetAisle = newAisles.find((a) => a.id === aisleId);
    if (targetAisle) {
      await api
        .updateAisleRacks(
          aisleId,
          room.id,
          targetAisle.racks.map((r) => r.id)
        )
        .catch((_err) => {
          /* optimistic update already applied */
        });
    }
  };

  const handleDeleteRack = (aisleId: string, rackId: string) => {
    const newAisles = room.aisles.map((aisle) => {
      if (aisle.id === aisleId)
        return { ...aisle, racks: aisle.racks.filter((r) => r.id !== rackId) };
      return aisle;
    });
    updateRoom({ ...room, aisles: newAisles });
  };

  // handleDeleteAisle shows the confirmation modal; actual deletion is in confirmDeleteAisle
  const handleDeleteAisle = (aisleId: string) => {
    setPendingDeleteAisleId(aisleId);
  };

  const confirmDeleteAisle = async () => {
    if (!pendingDeleteAisleId) return;
    const aisleId = pendingDeleteAisleId;
    setPendingDeleteAisleId(null);
    // Optimistic update
    const newAisles = room.aisles.filter((a) => a.id !== aisleId);
    updateRoom({ ...room, aisles: newAisles });
    // Immediate API call — deletion is destructive
    await api.deleteAisle(aisleId).catch((_err) => {
      /* optimistic update already applied */
    });
    setIsDirty(false);
  };

  // ── YAML drawer handlers ──────────────────────────────────────────────────

  const handleEditYamlAisle = (aisle: Aisle) => {
    setYamlTarget({ type: 'aisle', data: aisle });
    setYamlDrawerOpen(true);
  };

  const handleEditYamlRack = (rack: Rack) => {
    setYamlTarget({ type: 'rack', data: rack });
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
      {/* Subtle saving indicator */}
      {saving && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Saving changes…
        </div>
      )}

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
            draggingRackId={draggingRackId}
            addingRack={addingRack}
            onAisleDragStart={handleAisleDragStart}
            onAisleDragOver={handleAisleDragOver}
            onAisleDragLeave={handleAisleDragLeave}
            onAisleDrop={handleAisleDrop}
            onRackDragStart={handleRackDragStart}
            onRackDragEnd={handleRackDragEnd}
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

      {/* Aisle delete confirmation */}
      {pendingDeleteAisleId && (
        <DeleteConfirmModal
          open
          entityType="aisle"
          entityName={
            room.aisles.find((a) => a.id === pendingDeleteAisleId)?.name ?? pendingDeleteAisleId
          }
          onConfirm={() => void confirmDeleteAisle()}
          onCancel={() => setPendingDeleteAisleId(null)}
        />
      )}
    </>
  );
};
