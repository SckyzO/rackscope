import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  DoorOpen,
  Plus,
  MoreHorizontal,
  X,
  Check,
  Loader2,
  AlertTriangle,
  FileCode2,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Site, Room, RackTemplate } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  PageHeader,
  LoadingState,
  EmptyState,
} from '../templates/EmptyPage';
// ── Types ─────────────────────────────────────────────────────────────────────

type ViewLevel = 'sites' | 'rooms' | 'room-editor';

import { RoomEditorCanvas } from '../../components/datacenter/RoomEditorCanvas';

// ── YamlDrawer ────────────────────────────────────────────────────────────────

import MonacoEditor from '@monaco-editor/react';
import jsYaml from 'js-yaml';

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
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync editor when drawer opens with new content
  useEffect(() => {
    setValue(initialYaml);
    setSaved(false);
    setParseError(null);
    setSaveError(null);
  }, [initialYaml, open]);

  // Validate YAML on every change
  const handleChange = (val: string | undefined) => {
    const newVal = val ?? '';
    setValue(newVal);
    try {
      jsYaml.load(newVal);
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
      await onSave(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const isValid = !parseError;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Drawer panel — 680px wide */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-[680px] flex-col border-l border-gray-800 bg-gray-950 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-white">{title}</span>
            {parseError && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
                <AlertTriangle className="h-3 w-3" /> Invalid YAML
              </span>
            )}
            {isValid && value !== initialYaml && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                Unsaved
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Monaco Editor */}
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
              wordWrap: 'on',
              tabSize: 2,
              renderLineHighlight: 'line',
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>

        {/* Validation error */}
        {parseError && (
          <div className="shrink-0 border-t border-red-500/20 bg-red-500/5 px-5 py-2.5">
            <p className="font-mono text-xs text-red-400">{parseError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-800 px-5 py-4">
          {saveError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{saveError}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600">
              {parseError ? '⚠ Fix YAML errors before saving' : isValid ? '✓ Valid YAML' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !isValid}
                title={parseError ? 'Cannot save: YAML is invalid' : 'Save changes'}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                {saved ? 'Saved' : 'Save YAML'}
              </button>
            </div>
          </div>
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

// ── Main page component ───────────────────────────────────────────────────────

export const DatacenterEditorPage = () => {
  const [level, setLevel] = useState<ViewLevel>('sites');
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  usePageTitle(
    level === 'room-editor' && currentRoom
      ? `${currentRoom.name} — Editor`
      : level === 'rooms' && currentSite
      ? `${currentSite.name} — Rooms`
      : 'Datacenter Editor'
  );

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

  // Canvas save state — lifted from RoomEditorCanvas
  const canvasSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [canvasIsDirty, setCanvasIsDirty] = useState(false);
  const [canvasSaving, setCanvasSaving] = useState(false);
  const [canvasSavedOk, setCanvasSavedOk] = useState(false);

  const handleCanvasSave = async () => {
    if (!canvasSaveRef.current) return;
    setCanvasSaving(true);
    try {
      await canvasSaveRef.current();
      setCanvasSavedOk(true);
      setTimeout(() => setCanvasSavedOk(false), 2000);
    } finally {
      setCanvasSaving(false);
    }
  };

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

  // ── Render ──────────────────────────────────────────────────────────────────

  const pageTitle =
    level === 'room-editor' && currentRoom
      ? currentRoom.name
      : level === 'rooms' && currentSite
      ? currentSite.name
      : 'Datacenter Editor';

  const pageDescription =
    level === 'room-editor' ? 'Aisles & Racks'
    : level === 'rooms' ? 'Select a room to edit'
    : 'Manage your datacenter sites and rooms';

  return (
    <div className="space-y-5">
      {/* Page header */}
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <div className="flex items-center gap-2">
            {/* Back button */}
            {level === 'rooms' && (
              <button
                title="Back to sites"
                onClick={() => { setLevel('sites'); setCurrentSite(null); setCurrentRoom(null); setCanvasIsDirty(false); }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" />
                Sites
              </button>
            )}
            {level === 'room-editor' && (
              <button
                title={`Back to rooms in ${currentSite?.name ?? ''}`}
                onClick={() => { setLevel('rooms'); setCurrentRoom(null); setCanvasIsDirty(false); }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" />
                Rooms
              </button>
            )}

            {/* Save button — only when canvas has unsaved changes */}
            {level === 'room-editor' && (canvasIsDirty || canvasSavedOk) && (
              <button
                title="Save aisle/rack layout changes"
                onClick={() => void handleCanvasSave()}
                disabled={canvasSaving}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
              >
                {canvasSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : canvasSavedOk ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {canvasSavedOk ? 'Saved' : 'Save'}
              </button>
            )}

            {/* Primary action */}
            {level === 'sites' && (
              <button
                title="Add a new datacenter site"
                onClick={() => setAddingSite(true)}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Site
              </button>
            )}
            {level === 'rooms' && currentSite && (
              <button
                title={`Add a room to ${currentSite.name}`}
                onClick={() => setAddingRoom(true)}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </button>
            )}
            {level === 'room-editor' && currentRoom && (
              <button
                title="Add a new aisle to this room"
                onClick={() => setAddingAisle(true)}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Aisle
              </button>
            )}
          </div>
        }
      />


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
                  onDelete={() => {
                    void api.deleteSite(site.id).then(() => reloadSites());
                  }}
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
                  onDelete={() => {
                    void api.deleteRoom(room.id).then(() => reloadSites());
                  }}
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

            <button
              onClick={() =>
                openYamlDrawer(
                  `Room YAML — ${currentRoom.name}`,
                  currentRoom,
                  async () => Promise.resolve()
                )
              }
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              View Room YAML
            </button>
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

          {/* Canvas */}
          <RoomEditorCanvas
            room={currentRoom}
            rackTemplates={rackTemplates}
            onRoomUpdate={(updated) => setCurrentRoom(updated)}
            onDirtyChange={setCanvasIsDirty}
            saveRef={canvasSaveRef}
          />

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
