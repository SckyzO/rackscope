import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  DoorOpen,
  AlignJustify,
  Server,
  Plus,
  MoreHorizontal,
  X,
  Check,
  Loader2,
  AlertTriangle,
  FileCode2,
  Trash2,
  ChevronRight,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Site, Room, Aisle, RackTemplate } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  LoadingState,
  EmptyState,
} from '../templates/EmptyPage';
import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewLevel = 'sites' | 'rooms' | 'room-editor';

import { RoomEditorCanvas } from '../../components/datacenter/RoomEditorCanvas';

// ── YamlDrawer ────────────────────────────────────────────────────────────────

type YamlDrawerProps = {
  open: boolean;
  title: string;
  initialYaml: string;
  onSave: (yaml: string) => Promise<void>;
  onClose: () => void;
};

const YamlDrawer = ({ open, title, initialYaml, onSave, onClose }: YamlDrawerProps) => {
  const [value, setValue] = useState(initialYaml);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync textarea when drawer opens with new content
  useEffect(() => {
    setValue(initialYaml);
    setSaved(false);
    setError(null);
  }, [initialYaml, open]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-[480px] flex-col border-l border-gray-800 bg-gray-950 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Editor */}
        <div className="min-h-0 flex-1 p-4">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-full w-full resize-none rounded-xl border border-gray-700 bg-gray-900 p-4 font-mono text-sm leading-relaxed text-gray-200 placeholder-gray-600 focus:border-gray-600 focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-800 px-5 py-4">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ── AddRackModal ──────────────────────────────────────────────────────────────

type AddRackModalProps = {
  open: boolean;
  aisleId: string;
  roomId: string;
  rackTemplates: RackTemplate[];
  onSave: (rack: { id: string; name: string; u_height: number; template_id?: string }) => Promise<void>;
  onSaveAndEdit: (rack: { id: string; name: string; u_height: number; template_id?: string }) => void;
  onClose: () => void;
};

const AddRackModal = ({
  open,
  rackTemplates,
  onSave,
  onSaveAndEdit,
  onClose,
}: AddRackModalProps) => {
  const [rackId, setRackId] = useState('');
  const [name, setName] = useState('');
  const [uHeight, setUHeight] = useState(42);
  const [templateId, setTemplateId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRackId('');
      setName('');
      setUHeight(42);
      setTemplateId('');
      setError(null);
      setTimeout(() => idRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const buildPayload = () => ({
    id: rackId.trim(),
    name: name.trim(),
    u_height: uHeight,
    ...(templateId ? { template_id: templateId } : {}),
  });

  const validate = () => {
    if (!rackId.trim()) return 'Rack ID is required';
    if (!name.trim()) return 'Rack name is required';
    if (uHeight < 1 || uHeight > 100) return 'U Height must be 1–100';
    return null;
  };

  const handleAdd = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(buildPayload());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAndEdit = () => {
    const err = validate();
    if (err) { setError(err); return; }
    onSaveAndEdit(buildPayload());
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800">
              <Server className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <span className="text-sm font-semibold text-white">Add Rack</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white/10 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1 space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">
                Rack ID <span className="text-red-400">*</span>
              </label>
              <input
                ref={idRef}
                value={rackId}
                onChange={(e) => setRackId(e.target.value)}
                placeholder="r01-06"
                className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">
                U Height
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={uHeight}
                onChange={(e) => setUHeight(Number(e.target.value))}
                className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rack XH3000 Compute 06"
              className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400">
              Template <span className="text-gray-600">(optional)</span>
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:outline-none"
            >
              <option value="">— No template —</option>
              {rackTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleAdd()}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Rack
          </button>
          <button
            onClick={handleAddAndEdit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            Add &amp; Open Editor
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

// ── ContextMenu ───────────────────────────────────────────────────────────────

type ContextMenuProps = {
  open: boolean;
  onEditYaml: () => void;
  onDelete: () => void;
  onClose: () => void;
};

const ContextMenu = ({ open, onEditYaml, onDelete, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute top-8 right-0 z-30 w-44 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onEditYaml(); }}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
      >
        <FileCode2 className="h-3.5 w-3.5 text-gray-500" />
        Edit YAML
      </button>
      <div className="mx-2 border-t border-gray-800" />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );
};

// ── DeleteConfirmDialog ───────────────────────────────────────────────────────

type DeleteConfirmProps = {
  open: boolean;
  entityName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const DeleteConfirmDialog = ({ open, entityName, onConfirm, onCancel }: DeleteConfirmProps) => {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <div className="fixed top-1/2 left-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
          <Trash2 className="h-5 w-5 text-red-400" />
        </div>
        <h3 className="mb-1.5 text-sm font-semibold text-white">Delete {entityName}?</h3>
        <p className="mb-5 text-xs text-gray-500">
          This action cannot be undone. All data associated with this entry will be removed.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
};

// ── AddInlineForm ─────────────────────────────────────────────────────────────

type AddInlineFormProps = {
  placeholder: string;
  idPlaceholder?: string;
  onSave: (name: string, id: string) => Promise<void>;
  onCancel: () => void;
  label?: string;
};

const AddInlineForm = ({ placeholder, idPlaceholder, onSave, onCancel, label }: AddInlineFormProps) => {
  const [name, setName] = useState('');
  const [customId, setCustomId] = useState('');
  const [showId, setShowId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), customId.trim() || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-500/40 bg-white p-4 dark:border-brand-500/30 dark:bg-gray-900">
      {label && (
        <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-500">
          {label}
        </p>
      )}
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600"
        />

        {showId && (
          <input
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder={idPlaceholder ?? 'Custom ID (optional)'}
            className="focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-600 placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:placeholder-gray-600"
          />
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowId(!showId)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
          >
            {showId ? 'Hide custom ID' : '+ Custom ID'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ── StatChip ──────────────────────────────────────────────────────────────────

const StatChip = ({ label, value }: { label: string; value: number | string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
    <span className="font-bold text-gray-900 dark:text-white">{value}</span>
    {label}
  </span>
);

// ── SiteCard ──────────────────────────────────────────────────────────────────

type SiteCardProps = {
  site: Site;
  onDrillDown: () => void;
  onEditYaml: () => void;
  onDelete: () => void;
};

const SiteCard = ({ site, onDrillDown, onEditYaml, onDelete }: SiteCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const totalRooms = site.rooms?.length ?? 0;
  const totalRacks = (site.rooms ?? []).reduce(
    (acc, room) => {
      const aisleRacks = (room.aisles ?? []).reduce((a, aisle) => a + (aisle.racks?.length ?? 0), 0);
      const standaloneRacks = room.standalone_racks?.length ?? 0;
      return acc + aisleRacks + standaloneRacks;
    },
    0
  );

  return (
    <>
      <div className="group relative rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700/50">
        {/* Menu trigger */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <ContextMenu
            open={menuOpen}
            onEditYaml={() => { setMenuOpen(false); onEditYaml(); }}
            onDelete={() => { setMenuOpen(false); setDeleteOpen(true); }}
            onClose={() => setMenuOpen(false)}
          />
        </div>

        {/* Card body — clickable */}
        <button
          onClick={onDrillDown}
          className="block w-full text-left"
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Building2 className="h-4.5 w-4.5 text-brand-500" />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{site.name}</p>
              {site.description && (
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-500">
                  {site.description}
                </p>
              )}
              {site.location?.address && !site.description && (
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-500">
                  {site.location.address}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <StatChip value={totalRooms} label={totalRooms === 1 ? 'room' : 'rooms'} />
            <StatChip value={totalRacks} label={totalRacks === 1 ? 'rack' : 'racks'} />
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
            <span className="font-mono">{site.id}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300 dark:text-gray-700" />
          </div>
        </button>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        entityName={`site "${site.name}"`}
        onConfirm={() => { setDeleteOpen(false); onDelete(); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
};

// ── RoomCard ──────────────────────────────────────────────────────────────────

type RoomCardProps = {
  room: Room;
  onDrillDown: () => void;
  onEditYaml: () => void;
  onDelete: () => void;
};

const RoomCard = ({ room, onDrillDown, onEditYaml, onDelete }: RoomCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const aisleCount = room.aisles?.length ?? 0;
  const aisleRacks = (room.aisles ?? []).reduce((a, aisle) => a + (aisle.racks?.length ?? 0), 0);
  const standaloneRacks = room.standalone_racks?.length ?? 0;
  const totalRacks = aisleRacks + standaloneRacks;

  return (
    <>
      <div className="group relative rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700/50">
        {/* Menu trigger */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <ContextMenu
            open={menuOpen}
            onEditYaml={() => { setMenuOpen(false); onEditYaml(); }}
            onDelete={() => { setMenuOpen(false); setDeleteOpen(true); }}
            onClose={() => setMenuOpen(false)}
          />
        </div>

        {/* Card body — clickable */}
        <button
          onClick={onDrillDown}
          className="block w-full text-left"
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              <DoorOpen className="h-4.5 w-4.5 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{room.name}</p>
              {room.description && (
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-500">
                  {room.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <StatChip value={aisleCount} label={aisleCount === 1 ? 'aisle' : 'aisles'} />
            <StatChip value={totalRacks} label={totalRacks === 1 ? 'rack' : 'racks'} />
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
            <span className="font-mono">{room.id}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300 dark:text-gray-700" />
          </div>
        </button>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        entityName={`room "${room.name}"`}
        onConfirm={() => { setDeleteOpen(false); onDelete(); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
};

// ── AddCard ───────────────────────────────────────────────────────────────────

const AddCard = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-transparent p-5 text-gray-400 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-gray-700 dark:text-gray-600 dark:hover:border-brand-600 dark:hover:text-brand-400"
  >
    <Plus className="h-5 w-5" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

// ── AisleRow ──────────────────────────────────────────────────────────────────

type AisleRowProps = {
  aisle: Aisle;
  roomId: string;
  rackTemplates: RackTemplate[];
  onAisleAdded: () => void;
};

const AisleRow = ({ aisle, roomId, rackTemplates, onAisleAdded }: AisleRowProps) => {
  const navigate = useNavigate();
  const [addRackOpen, setAddRackOpen] = useState(false);
  const [racks, setRacks] = useState(aisle.racks ?? []);

  const handleSaveRack = async (rack: { id: string; name: string; u_height: number; template_id?: string }) => {
    const updatedRackIds = [...racks.map((r) => r.id), rack.id];
    await api.updateAisleRacks(aisle.id, roomId, updatedRackIds);
    setRacks([...racks, { id: rack.id, name: rack.name, u_height: rack.u_height, template_id: rack.template_id, devices: [], aisle_id: aisle.id }]);
    onAisleAdded();
  };

  const handleSaveAndEdit = (rack: { id: string; name: string; u_height: number; template_id?: string }) => {
    navigate(`/cosmos/editors/rack?rackId=${encodeURIComponent(rack.id)}`);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Aisle header */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <AlignJustify className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600" />
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{aisle.name}</span>
        <span className="font-mono text-[10px] text-gray-400 dark:text-gray-700">({aisle.id})</span>
        <div className="ml-auto flex items-center gap-1.5">
          <StatChip value={racks.length} label={racks.length === 1 ? 'rack' : 'racks'} />
          <button
            onClick={() => setAddRackOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-white/5"
          >
            <Plus className="h-3 w-3" />
            Add Rack
          </button>
        </div>
      </div>

      {/* Rack chips */}
      <div className="flex flex-wrap gap-2 p-4">
        {racks.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-700">No racks in this aisle.</p>
        ) : (
          racks.map((rack) => (
            <button
              key={rack.id}
              onClick={() => navigate(`/cosmos/editors/rack?rackId=${encodeURIComponent(rack.id)}`)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-600 dark:hover:text-brand-400"
            >
              <Server className="h-3 w-3" />
              {rack.name || rack.id}
            </button>
          ))
        )}
      </div>

      <AddRackModal
        open={addRackOpen}
        aisleId={aisle.id}
        roomId={roomId}
        rackTemplates={rackTemplates}
        onSave={handleSaveRack}
        onSaveAndEdit={handleSaveAndEdit}
        onClose={() => setAddRackOpen(false)}
      />
    </div>
  );
};

// ── Main page component ───────────────────────────────────────────────────────

export const DatacenterEditorPage = () => {
  usePageTitle('Datacenter Editor');

  const [level, setLevel] = useState<ViewLevel>('sites');
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingSite, setAddingSite] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [addingAisle, setAddingAisle] = useState(false);
  const [addAisleError, setAddAisleError] = useState<string | null>(null);

  // YamlDrawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerYaml, setDrawerYaml] = useState('');
  const [drawerOnSave, setDrawerOnSave] = useState<(yaml: string) => Promise<void>>(
    () => () => Promise.resolve()
  );

  // Load sites + catalog on mount
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sitesData, catalogData] = await Promise.all([
          api.getSites(),
          api.getCatalog(),
        ]);
        if (!active) return;
        setSites(sitesData);
        setRackTemplates(catalogData.rack_templates ?? []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const reloadSites = async () => {
    try {
      const sitesData = await api.getSites();
      setSites(sitesData);
    } catch {
      // silently ignore reload errors
    }
  };

  const reloadRoom = async (roomId: string) => {
    try {
      const room = await api.getRoomLayout(roomId);
      setCurrentRoom(room);
    } catch {
      // silently ignore
    }
  };

  // ── Create site ─────────────────────────────────────────────────────────────

  const handleCreateSite = async (name: string, id: string) => {
    await api.createSite({ name, id: id || null });
    await reloadSites();
    setAddingSite(false);
  };

  // ── Create room ─────────────────────────────────────────────────────────────

  const handleCreateRoom = async (name: string, id: string) => {
    if (!currentSite) return;
    await api.createRoom(currentSite.id, { name, id: id || null });
    await reloadSites();
    setAddingRoom(false);
  };

  // ── Create aisle ────────────────────────────────────────────────────────────

  const handleCreateAisle = async (name: string, id: string) => {
    if (!currentRoom) return;
    setAddAisleError(null);
    try {
      await api.createRoomAisles(currentRoom.id, [{ name, id: id || null }]);
      await reloadRoom(currentRoom.id);
      setAddingAisle(false);
    } catch (err) {
      setAddAisleError(err instanceof Error ? err.message : 'Failed to create aisle');
      throw err;
    }
  };

  // ── YAML drawer helpers ─────────────────────────────────────────────────────

  const openYamlDrawer = (title: string, entity: unknown, onSave: (yaml: string) => Promise<void>) => {
    setDrawerTitle(title);
    setDrawerYaml(JSON.stringify(entity, null, 2));
    setDrawerOnSave(() => onSave);
    setDrawerOpen(true);
  };

  // ── Drill-down navigation ───────────────────────────────────────────────────

  const handleDrillDownSite = (site: Site) => {
    setCurrentSite(site);
    setLevel('rooms');
  };

  const handleDrillDownRoom = async (room: Room) => {
    try {
      const fullRoom = await api.getRoomLayout(room.id);
      setCurrentRoom(fullRoom);
      setLevel('room-editor');
    } catch {
      setCurrentRoom(room);
      setLevel('room-editor');
    }
  };

  // ── Rooms for current site ──────────────────────────────────────────────────
  const currentSiteRooms: Room[] = currentSite
    ? (sites.find((s) => s.id === currentSite.id)?.rooms ?? [])
    : [];

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const breadcrumbItems = (() => {
    const items = [
      {
        label: 'Home',
        href: '/cosmos',
      },
      {
        label: 'Editors',
      },
      {
        label: 'Datacenter',
        href: '/cosmos/editors/datacenter',
        onClick: () => {
          setLevel('sites');
          setCurrentSite(null);
          setCurrentRoom(null);
        },
      },
    ];

    if (level === 'rooms' && currentSite) {
      items.push({ label: currentSite.name });
    }
    if (level === 'room-editor' && currentSite) {
      items.push({
        label: currentSite.name,
        onClick: () => setLevel('rooms'),
      });
    }
    if (level === 'room-editor' && currentRoom) {
      items.push({ label: currentRoom.name });
    }
    return items;
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page header */}
      <PageHeader
        title="Datacenter Editor"
        breadcrumb={
          <PageBreadcrumb
            items={breadcrumbItems.map((item) => ({
              label: item.label,
              href:
                'onClick' in item
                  ? '#'
                  : 'href' in item
                    ? item.href
                    : undefined,
            }))}
          />
        }
        actions={
          level === 'sites' ? (
            <button
              onClick={() => setAddingSite(true)}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Site
            </button>
          ) : level === 'rooms' && currentSite ? (
            <button
              onClick={() => setAddingRoom(true)}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </button>
          ) : level === 'room-editor' && currentRoom ? (
            <button
              onClick={() => setAddingAisle(true)}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Aisle
            </button>
          ) : null
        }
      />

      {/* Clickable breadcrumb navigation strip */}
      {(level === 'rooms' || level === 'room-editor') && (
        <nav className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => { setLevel('sites'); setCurrentSite(null); setCurrentRoom(null); }}
            className="text-brand-500 dark:text-brand-400 flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Sites
          </button>

          {currentSite && (
            <>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-700" />
              {level === 'room-editor' ? (
                <button
                  onClick={() => setLevel('rooms')}
                  className="text-brand-500 dark:text-brand-400 flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {currentSite.name}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                  <Building2 className="h-3.5 w-3.5 text-brand-500" />
                  {currentSite.name}
                </span>
              )}
            </>
          )}

          {level === 'room-editor' && currentRoom && (
            <>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-700" />
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                <DoorOpen className="h-3.5 w-3.5 text-brand-500" />
                {currentRoom.name}
              </span>
            </>
          )}
        </nav>
      )}

      {/* ── Level 0: Sites grid ─────────────────────────────────────────────── */}
      {level === 'sites' && (
        <section>
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <LoadingState message="Loading datacenter sites…" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/5">
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            </div>
          ) : sites.length === 0 && !addingSite ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <EmptyState
                title="No sites yet"
                description="Add your first datacenter site to get started."
                action={
                  <button
                    onClick={() => setAddingSite(true)}
                    className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Site
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onDrillDown={() => handleDrillDownSite(site)}
                  onEditYaml={() =>
                    openYamlDrawer(
                      `Site — ${site.name}`,
                      site,
                      async () => Promise.resolve()
                    )
                  }
                  onDelete={() => void reloadSites()}
                />
              ))}

              {addingSite ? (
                <AddInlineForm
                  label="New Site"
                  placeholder="Site name (e.g. Paris DC1)"
                  idPlaceholder="site-id (e.g. paris-dc1)"
                  onSave={handleCreateSite}
                  onCancel={() => setAddingSite(false)}
                />
              ) : (
                <AddCard label="Add Site" onClick={() => setAddingSite(true)} />
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Level 1: Rooms grid ─────────────────────────────────────────────── */}
      {level === 'rooms' && currentSite && (
        <section>
          {currentSiteRooms.length === 0 && !addingRoom ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <EmptyState
                title={`No rooms in ${currentSite.name}`}
                description="Add the first room to this site."
                action={
                  <button
                    onClick={() => setAddingRoom(true)}
                    className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Room
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentSiteRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onDrillDown={() => void handleDrillDownRoom(room)}
                  onEditYaml={() =>
                    openYamlDrawer(
                      `Room — ${room.name}`,
                      room,
                      async () => Promise.resolve()
                    )
                  }
                  onDelete={() => void reloadSites()}
                />
              ))}

              {addingRoom ? (
                <AddInlineForm
                  label="New Room"
                  placeholder="Room name (e.g. Room A)"
                  idPlaceholder="room-id (e.g. room-a)"
                  onSave={handleCreateRoom}
                  onCancel={() => setAddingRoom(false)}
                />
              ) : (
                <AddCard label="Add Room" onClick={() => setAddingRoom(true)} />
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Level 2: Room Editor ─────────────────────────────────────────────── */}
      {level === 'room-editor' && currentRoom && (
        <section className="space-y-4">
          {/* Room stats strip */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                <DoorOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{currentRoom.name}</p>
                <p className="font-mono text-[10px] text-gray-500 dark:text-gray-600">{currentRoom.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 ml-2">
              <StatChip
                value={(currentRoom.aisles ?? []).length}
                label={(currentRoom.aisles ?? []).length === 1 ? 'aisle' : 'aisles'}
              />
              <StatChip
                value={
                  (currentRoom.aisles ?? []).reduce((a, aisle) => a + (aisle.racks?.length ?? 0), 0) +
                  (currentRoom.standalone_racks?.length ?? 0)
                }
                label="racks"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() =>
                  openYamlDrawer(
                    `Room YAML — ${currentRoom.name}`,
                    currentRoom,
                    async () => Promise.resolve()
                  )
                }
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <FileCode2 className="h-3.5 w-3.5" />
                Edit Room YAML
              </button>
              <button
                onClick={() => setAddingAisle(true)}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Aisle
              </button>
            </div>
          </div>

          {/* Add aisle inline form */}
          {addingAisle && (
            <AddInlineForm
              label="New Aisle"
              placeholder="Aisle name (e.g. Aisle A1)"
              idPlaceholder="aisle-id (e.g. aisle-a1)"
              onSave={handleCreateAisle}
              onCancel={() => { setAddingAisle(false); setAddAisleError(null); }}
            />
          )}
          {addAisleError && !addingAisle && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {addAisleError}
            </div>
          )}

          {/* Canvas placeholder */}
          <RoomEditorCanvas
            room={currentRoom}
            rackTemplates={rackTemplates}
            onRoomUpdate={(updated) => setCurrentRoom(updated)}
          />

          {/* Aisles list */}
          {(currentRoom.aisles ?? []).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Layers className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Aisles &amp; Racks
                </h3>
              </div>
              {(currentRoom.aisles ?? []).map((aisle) => (
                <AisleRow
                  key={aisle.id}
                  aisle={aisle}
                  roomId={currentRoom.id}
                  rackTemplates={rackTemplates}
                  onAisleAdded={() => void reloadRoom(currentRoom.id)}
                />
              ))}
            </div>
          )}

          {(currentRoom.aisles ?? []).length === 0 && !addingAisle && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
              <AlignJustify className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-500">No aisles yet</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-700">
                Add the first aisle to organize racks in this room.
              </p>
            </div>
          )}
        </section>
      )}

      {/* YamlDrawer */}
      <YamlDrawer
        open={drawerOpen}
        title={drawerTitle}
        initialYaml={drawerYaml}
        onSave={drawerOnSave}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
