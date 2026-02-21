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
  ExternalLink,
  FolderOpen,
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

type TreeNodeProps = {
  label: string;
  badge?: string;
  depth: number;
  active: boolean;
  expanded?: boolean;
  hasChildren?: boolean;
  icon: React.ElementType;
  healthDot?: 'ok' | 'warn' | 'crit' | null;
  draggable?: boolean;
  isDragTarget?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onClick: () => void;
  onToggle?: () => void;
};

const TreeNode = ({
  label,
  badge,
  depth,
  active,
  expanded,
  hasChildren,
  icon: Icon,
  healthDot,
  draggable = false,
  isDragTarget = false,
  onDragOver,
  onDrop,
  onClick,
  onToggle,
}: TreeNodeProps) => (
  <div
    className={`group flex w-full cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-left transition-colors ${
      active
        ? 'bg-[#465fff]/10 text-[#465fff]'
        : isDragTarget
          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-400/10 dark:text-amber-400'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
    style={{ paddingLeft: `${6 + depth * 12}px` }}
    draggable={draggable}
    onDragOver={onDragOver}
    onDrop={onDrop}
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
    <Icon className="h-3 w-3 shrink-0 opacity-60" />
    <span className="flex-1 truncate text-[11px] font-medium">{label}</span>
    {healthDot && (
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor:
            healthDot === 'ok' ? '#22c55e' : healthDot === 'warn' ? '#f59e0b' : '#ef4444',
        }}
      />
    )}
    {badge && (
      <span className="rounded px-1 py-0.5 text-[9px] text-gray-400 dark:text-gray-500">
        {badge}
      </span>
    )}
  </div>
);

type SmallFormProps = {
  title: string;
  onSave: (name: string, id: string) => Promise<void>;
  onCancel: () => void;
};

const SmallForm = ({ title, onSave, onCancel }: SmallFormProps) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
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
      await onSave(name.trim(), id.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-1 my-1 rounded-lg border border-[#465fff]/40 bg-[#465fff]/5 p-2">
      <p className="mb-1.5 text-[10px] font-bold text-gray-600 dark:text-gray-400">{title}</p>
      {error && (
        <div className="mb-1 flex items-center gap-1 rounded bg-red-50 px-1.5 py-1 dark:bg-red-500/10">
          <AlertCircle className="h-2.5 w-2.5 shrink-0 text-red-500" />
          <p className="text-[9px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <input
        ref={nameRef}
        type="text"
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onCancel();
        }}
        className="mb-1 w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] focus:border-[#465fff] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <input
        type="text"
        placeholder="ID (opt)"
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="mb-1.5 w-full rounded border border-gray-200 bg-white px-1.5 py-1 font-mono text-[11px] focus:border-[#465fff] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="flex items-center gap-0.5 rounded bg-[#465fff] px-2 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-2 w-2 animate-spin" /> : <Save className="h-2 w-2" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-0.5 rounded border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 dark:border-gray-700"
        >
          <X className="h-2 w-2" />
        </button>
      </div>
    </div>
  );
};

// Right panel: site detail
type SiteDetailProps = {
  site: Site;
  onAddRoom: () => void;
  onSelectRoom: (room: Room) => void;
};

const SiteDetail = ({ site, onAddRoom, onSelectRoom }: SiteDetailProps) => {
  const [name, setName] = useState(site.name);
  const [desc, setDesc] = useState(site.description ?? '');
  const [lat, setLat] = useState(site.location?.lat?.toString() ?? '');
  const [lon, setLon] = useState(site.location?.lon?.toString() ?? '');

  const totalRacks = (site.rooms || []).reduce(
    (acc, r) =>
      acc +
      (r.aisles || []).reduce((a2, a) => a2 + (a.racks || []).length, 0) +
      (r.standalone_racks || []).length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-1 w-full rounded-xl border border-transparent bg-transparent text-2xl font-bold text-gray-900 outline-none hover:border-gray-200 focus:border-[#465fff] dark:text-white dark:hover:border-gray-700"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Add a description…"
          rows={2}
          className="w-full resize-none rounded-xl border border-transparent bg-transparent text-sm text-gray-500 outline-none hover:border-gray-200 focus:border-[#465fff] dark:text-gray-400 dark:hover:border-gray-700"
        />
        <p className="font-mono text-[11px] text-gray-400">ID: {site.id}</p>
      </div>

      {/* Location */}
      <div>
        <p className="mb-2 text-xs font-bold text-gray-500 uppercase dark:text-gray-400">
          Location
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-gray-400">Latitude</label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="0.0"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#465fff] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-gray-400">Longitude</label>
            <input
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="0.0"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#465fff] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Rooms', value: (site.rooms || []).length },
          { label: 'Total Racks', value: totalRacks },
          {
            label: 'Aisles',
            value: (site.rooms || []).reduce((a, r) => a + (r.aisles || []).length, 0),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Rooms mini list */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Rooms</p>
          <button
            onClick={onAddRoom}
            className="flex items-center gap-1 text-xs text-[#465fff] hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
        <div className="space-y-1.5">
          {(site.rooms || []).map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-[#465fff]/50 hover:bg-[#465fff]/5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {room.name}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {(room.aisles || []).reduce((a, aisle) => a + (aisle.racks || []).length, 0)} racks
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Right panel: room detail
type RoomDetailProps = {
  room: Room;
  onSelectAisle: (aisle: Aisle) => void;
  onAddAisle: () => void;
  onAddRack: (aisleId: string) => void;
};

const RoomDetail = ({ room, onSelectAisle, onAddAisle, onAddRack }: RoomDetailProps) => {
  const [name, setName] = useState(room.name);
  return (
    <div className="space-y-6">
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-transparent bg-transparent text-2xl font-bold text-gray-900 outline-none hover:border-gray-200 focus:border-[#465fff] dark:text-white dark:hover:border-gray-700"
        />
        <p className="font-mono text-[11px] text-gray-400">ID: {room.id}</p>
      </div>

      {/* Aisle strips */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Aisles</p>
          <button
            onClick={onAddAisle}
            className="flex items-center gap-1 text-xs text-[#465fff] hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add Aisle
          </button>
        </div>
        <div className="space-y-2">
          {(room.aisles || []).map((aisle) => {
            const rackCount = (aisle.racks || []).length;
            const maxDots = 20;
            const dots = Math.min(rackCount, maxDots);
            return (
              <div
                key={aisle.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800"
              >
                <button
                  onClick={() => onSelectAisle(aisle)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span className="w-20 shrink-0 text-xs font-bold text-gray-700 dark:text-gray-300">
                    {aisle.name}
                  </span>
                  <div className="flex flex-1 gap-0.5">
                    {Array.from({ length: dots }).map((_, i) => (
                      <div
                        key={i}
                        className="h-4 w-4 shrink-0 rounded bg-[#465fff]/20"
                        title={aisle.racks[i]?.name}
                      />
                    ))}
                    {rackCount > maxDots && (
                      <span className="text-[10px] text-gray-400">+{rackCount - maxDots}</span>
                    )}
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs text-gray-400">
                    {rackCount} racks
                  </span>
                </button>
                <button
                  onClick={() => onAddRack(aisle.id)}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-500 transition-colors hover:border-[#465fff] hover:text-[#465fff] dark:border-gray-600"
                >
                  <Plus className="h-3 w-3" />
                  Add Rack
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Right panel: aisle detail with DnD rack reordering
type AisleDetailProps = {
  aisle: Aisle;
  rackTemplates: RackTemplate[];
  onReorder: (fromIdx: number, toIdx: number) => Promise<void>;
  onTemplateChange: (rackId: string, templateId: string | null) => Promise<void>;
  onOpenRack: (rackId: string) => void;
};

const AisleDetail = ({
  aisle,
  rackTemplates,
  onReorder,
  onTemplateChange,
  onOpenRack,
}: AisleDetailProps) => {
  const [name, setName] = useState(aisle.name);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = async (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === toIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const from = dragIdx;
    setDragIdx(null);
    setOverIdx(null);
    await onReorder(from, toIdx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-transparent bg-transparent text-2xl font-bold text-gray-900 outline-none hover:border-gray-200 focus:border-[#465fff] dark:text-white dark:hover:border-gray-700"
        />
        <p className="font-mono text-[11px] text-gray-400">ID: {aisle.id}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-gray-500 uppercase dark:text-gray-400">
          Racks ({(aisle.racks || []).length})
        </p>
        <div className="space-y-1.5">
          {(aisle.racks || []).map((rack, idx) => (
            <div
              key={rack.id}
              className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 transition-all dark:bg-gray-800 ${
                dragIdx === idx
                  ? 'border-[#465fff] opacity-40'
                  : overIdx === idx
                    ? 'border-[#465fff] bg-[#465fff]/5'
                    : 'border-gray-200 dark:border-gray-700'
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-300 dark:text-gray-600" />
              <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                {rack.name}
              </span>
              <select
                value={rack.template_id ?? ''}
                onChange={(e) => onTemplateChange(rack.id, e.target.value || null)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:border-[#465fff] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">No template</option>
                {rackTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="w-12 text-right text-xs text-gray-400">
                {(rack.devices || []).length} dev
              </span>
              <button
                onClick={() => onOpenRack(rack.id)}
                className="text-gray-300 transition-colors hover:text-[#465fff] dark:text-gray-600"
                aria-label="Open rack"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Right panel: rack detail
type RackDetailV5Props = {
  rack: Rack;
  rackTemplates: RackTemplate[];
  aisle: Aisle | null;
  room: Room | null;
  site: Site | null;
  onTemplateChange: (templateId: string | null) => Promise<void>;
  onOpen: () => void;
};

const RackDetailV5 = ({
  rack,
  rackTemplates,
  aisle,
  room,
  site,
  onTemplateChange,
  onOpen,
}: RackDetailV5Props) => {
  const [saving, setSaving] = useState(false);
  const currentTemplate = rackTemplates.find((t) => t.id === rack.template_id);

  const handleChange = async (val: string) => {
    setSaving(true);
    try {
      await onTemplateChange(val || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{rack.name}</h2>
          <span className="mt-1 inline-block rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {rack.id}
          </span>
        </div>
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 rounded-xl bg-[#465fff] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Rack Editor
        </button>
      </div>

      {/* Physical info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{rack.u_height}U</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Height</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(rack.devices || []).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Devices</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{aisle?.name ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Aisle</p>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-xs font-bold text-gray-500 uppercase dark:text-gray-400">
          Location
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          {site && <span>{site.name}</span>}
          {site && room && <ChevronRight className="h-3 w-3" />}
          {room && <span>{room.name}</span>}
          {room && aisle && <ChevronRight className="h-3 w-3" />}
          {aisle && <span>{aisle.name}</span>}
        </div>
      </div>

      {/* Template */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-xs font-bold text-gray-500 uppercase dark:text-gray-400">
          Template
        </p>
        <div className="flex items-center gap-2">
          <select
            value={rack.template_id ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-[#465fff] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            <option value="">No template</option>
            {rackTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[#465fff]" />}
        </div>
        {currentTemplate && (
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-lg bg-[#465fff]/10 px-2 py-0.5 text-xs font-medium text-[#465fff]">
              {currentTemplate.u_height}U
            </span>
            <span className="text-xs text-gray-400">{currentTemplate.name}</span>
          </div>
        )}
      </div>

      {/* Devices */}
      {(rack.devices || []).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-gray-500 uppercase dark:text-gray-400">
            Devices
          </p>
          <div className="space-y-1">
            {(rack.devices || []).slice(0, 6).map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 dark:border-gray-700"
              >
                <Server className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
                  {d.name}
                </span>
                <span className="font-mono text-[10px] text-gray-400">{d.template_id}</span>
              </div>
            ))}
            {(rack.devices || []).length > 6 && (
              <p className="text-xs text-gray-400">+{(rack.devices || []).length - 6} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

type SelectedNode =
  | { kind: 'site'; siteId: string }
  | { kind: 'room'; siteId: string; roomId: string }
  | { kind: 'aisle'; siteId: string; roomId: string; aisleId: string }
  | { kind: 'rack'; siteId: string; roomId: string; aisleId: string; rackId: string }
  | null;

type FormInsert =
  | { kind: 'site' }
  | { kind: 'room'; siteId: string }
  | { kind: 'aisle'; roomId: string }
  | null;

export const CosmosTopologyEditorPageV5: React.FC = () => {
  const navigate = useNavigate();
  const [topology, setTopology] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<SelectedNode>(null);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedAisles, setExpandedAisles] = useState<Set<string>>(new Set());
  const [formInsert, setFormInsert] = useState<FormInsert>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [dragRackId, setDragRackId] = useState<string | null>(null);
  const [dragRackAisleId, setDragRackAisleId] = useState<string | null>(null);
  const [dragOverAisleId, setDragOverAisleId] = useState<string | null>(null);

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

  const moveRack = async (
    rackId: string,
    fromAisleId: string,
    toAisleId: string,
    roomId: string
  ) => {
    const room = topology.flatMap((s) => s.rooms).find((r) => r.id === roomId);
    if (!room || fromAisleId === toAisleId) return;
    const newAisles: Record<string, string[]> = {};
    room.aisles.forEach((a) => {
      if (a.id === fromAisleId)
        newAisles[a.id] = a.racks.filter((r) => r.id !== rackId).map((r) => r.id);
      else if (a.id === toAisleId) newAisles[a.id] = [...a.racks.map((r) => r.id), rackId];
      else newAisles[a.id] = a.racks.map((r) => r.id);
    });
    await withSave(() => api.updateRoomAisles(roomId, newAisles));
  };

  const toggleSite = (id: string) =>
    setExpandedSites((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleRoom = (id: string) =>
    setExpandedRooms((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAisle = (id: string) =>
    setExpandedAisles((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const handleAddSite = async (name: string, id: string) => {
    await withSave(() => api.createSite({ id: id || null, name }));
    setFormInsert(null);
  };

  const handleAddRoom = async (siteId: string, name: string, id: string) => {
    await withSave(() => api.createRoom(siteId, { id: id || null, name }));
    setFormInsert(null);
  };

  const handleAddAisle = async (roomId: string, name: string, id: string) => {
    await withSave(() => api.createRoomAisles(roomId, [{ id: id || null, name }]));
    setFormInsert(null);
  };

  const handleAisleReorder = async (
    aisle: Aisle,
    roomId: string,
    fromIdx: number,
    toIdx: number
  ) => {
    const racks = [...(aisle.racks || [])];
    const [moved] = racks.splice(fromIdx, 1);
    racks.splice(toIdx, 0, moved);
    await withSave(() =>
      api.updateAisleRacks(
        aisle.id,
        roomId,
        racks.map((r) => r.id)
      )
    );
  };

  const handleTemplateChange = async (rackId: string, templateId: string | null) => {
    await withSave(() => api.updateRackTemplate(rackId, templateId));
  };

  // Derive context for right panel
  const selectedSite = selected ? (topology.find((s) => s.id === selected.siteId) ?? null) : null;
  const selectedRoom =
    selected && 'roomId' in selected
      ? ((selectedSite?.rooms || []).find((r) => r.id === selected.roomId) ?? null)
      : null;
  const selectedAisle =
    selected && 'aisleId' in selected
      ? ((selectedRoom?.aisles || []).find((a) => a.id === selected.aisleId) ?? null)
      : null;
  const selectedRack =
    selected && 'rackId' in selected
      ? ((selectedAisle?.racks || []).find((r) => r.id === selected.rackId) ?? null)
      : null;

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
            <p className="text-sm text-gray-500 dark:text-gray-400">Tree + rich detail — V5</p>
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
          <VariantSwitcher active="V5" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Left tree (320px compact) */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
            <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Hierarchy
            </p>
            <button
              onClick={() => setFormInsert({ kind: 'site' })}
              className="text-gray-400 transition-colors hover:text-[#465fff]"
              aria-label="Add site"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {topology.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <FolderOpen className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400">No sites</p>
              </div>
            ) : (
              topology.map((site) => {
                const siteExpanded = expandedSites.has(site.id);
                const siteActive = selected?.siteId === site.id && selected.kind === 'site';
                return (
                  <div key={site.id}>
                    <TreeNode
                      label={site.name}
                      depth={0}
                      active={siteActive}
                      expanded={siteExpanded}
                      hasChildren={(site.rooms || []).length > 0}
                      icon={MapPin}
                      badge={`${(site.rooms || []).length}r`}
                      onClick={() => {
                        setSelected({ kind: 'site', siteId: site.id });
                        setFormInsert(null);
                      }}
                      onToggle={() => toggleSite(site.id)}
                    />
                    {siteExpanded &&
                      (site.rooms || []).map((room: Room) => {
                        const roomExpanded = expandedRooms.has(room.id);
                        const roomActive = selected?.kind === 'room' && selected.roomId === room.id;
                        return (
                          <div key={room.id}>
                            <TreeNode
                              label={room.name}
                              depth={1}
                              active={roomActive}
                              expanded={roomExpanded}
                              hasChildren={(room.aisles || []).length > 0}
                              icon={Building2}
                              badge={`${(room.aisles || []).length}a`}
                              onClick={() => {
                                setSelected({
                                  kind: 'room',
                                  siteId: site.id,
                                  roomId: room.id,
                                });
                                setFormInsert(null);
                              }}
                              onToggle={() => toggleRoom(room.id)}
                            />
                            {roomExpanded &&
                              (room.aisles || []).map((aisle: Aisle) => {
                                const aisleExpanded = expandedAisles.has(aisle.id);
                                const aisleActive =
                                  selected?.kind === 'aisle' && selected.aisleId === aisle.id;
                                return (
                                  <div key={aisle.id}>
                                    <TreeNode
                                      label={aisle.name}
                                      depth={2}
                                      active={aisleActive}
                                      expanded={aisleExpanded}
                                      hasChildren={(aisle.racks || []).length > 0}
                                      icon={Layers}
                                      badge={`${(aisle.racks || []).length}r`}
                                      isDragTarget={dragOverAisleId === aisle.id}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOverAisleId(aisle.id);
                                      }}
                                      onDrop={async (e) => {
                                        e.preventDefault();
                                        setDragOverAisleId(null);
                                        if (!dragRackId || !dragRackAisleId) return;
                                        const rId = dragRackId;
                                        const fromId = dragRackAisleId;
                                        setDragRackId(null);
                                        setDragRackAisleId(null);
                                        await moveRack(rId, fromId, aisle.id, room.id);
                                      }}
                                      onClick={() => {
                                        setSelected({
                                          kind: 'aisle',
                                          siteId: site.id,
                                          roomId: room.id,
                                          aisleId: aisle.id,
                                        });
                                        setFormInsert(null);
                                      }}
                                      onToggle={() => toggleAisle(aisle.id)}
                                    />
                                    {aisleExpanded &&
                                      (aisle.racks || []).map((rack: Rack) => {
                                        const rackActive =
                                          selected?.kind === 'rack' && selected.rackId === rack.id;
                                        return (
                                          <TreeNode
                                            key={rack.id}
                                            label={rack.name}
                                            depth={3}
                                            active={rackActive}
                                            hasChildren={false}
                                            icon={Server}
                                            draggable
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              setDragOverAisleId(aisle.id);
                                            }}
                                            onDrop={async (e) => {
                                              e.preventDefault();
                                              setDragOverAisleId(null);
                                              if (!dragRackId || !dragRackAisleId) return;
                                              const rId = dragRackId;
                                              const fromId = dragRackAisleId;
                                              setDragRackId(null);
                                              setDragRackAisleId(null);
                                              await moveRack(rId, fromId, aisle.id, room.id);
                                            }}
                                            onClick={() => {
                                              setSelected({
                                                kind: 'rack',
                                                siteId: site.id,
                                                roomId: room.id,
                                                aisleId: aisle.id,
                                                rackId: rack.id,
                                              });
                                              setFormInsert(null);
                                              setDragRackId(rack.id);
                                              setDragRackAisleId(aisle.id);
                                            }}
                                          />
                                        );
                                      })}
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}

            {/* Inline forms */}
            {formInsert?.kind === 'site' && (
              <SmallForm
                title="New Site"
                onSave={handleAddSite}
                onCancel={() => setFormInsert(null)}
              />
            )}
            {formInsert?.kind === 'room' && (
              <SmallForm
                title="New Room"
                onSave={(name, id) => handleAddRoom(formInsert.siteId, name, id)}
                onCancel={() => setFormInsert(null)}
              />
            )}
            {formInsert?.kind === 'aisle' && (
              <SmallForm
                title="New Aisle"
                onSave={(name, id) => handleAddAisle(formInsert.roomId, name, id)}
                onCancel={() => setFormInsert(null)}
              />
            )}
          </div>

          <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-800">
            <p className="text-[10px] text-gray-400">
              {topology.length} site{topology.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
          {selected?.kind === 'rack' && selectedRack ? (
            <RackDetailV5
              rack={selectedRack}
              rackTemplates={rackTemplates}
              aisle={selectedAisle}
              room={selectedRoom}
              site={selectedSite}
              onTemplateChange={(tId) => handleTemplateChange(selectedRack.id, tId)}
              onOpen={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
            />
          ) : selected?.kind === 'aisle' && selectedAisle && selectedRoom ? (
            <AisleDetail
              aisle={selectedAisle}
              rackTemplates={rackTemplates}
              onReorder={(from, to) => handleAisleReorder(selectedAisle, selectedRoom.id, from, to)}
              onTemplateChange={handleTemplateChange}
              onOpenRack={(rId) => navigate(`/cosmos/views/rack/${rId}`)}
            />
          ) : selected?.kind === 'room' && selectedRoom && selectedSite ? (
            <RoomDetail
              room={selectedRoom}
              onSelectAisle={(aisle) =>
                setSelected({
                  kind: 'aisle',
                  siteId: selectedSite.id,
                  roomId: selectedRoom.id,
                  aisleId: aisle.id,
                })
              }
              onAddAisle={() => setFormInsert({ kind: 'aisle', roomId: selectedRoom.id })}
              onAddRack={() => {}}
            />
          ) : selected?.kind === 'site' && selectedSite ? (
            <SiteDetail
              site={selectedSite}
              onAddRoom={() => setFormInsert({ kind: 'room', siteId: selectedSite.id })}
              onSelectRoom={(room) =>
                setSelected({
                  kind: 'room',
                  siteId: selectedSite.id,
                  roomId: room.id,
                })
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Select an item
              </h3>
              <p className="mt-1 max-w-xs text-sm text-gray-400 dark:text-gray-500">
                Click a site, room, aisle or rack in the tree to view and edit details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
