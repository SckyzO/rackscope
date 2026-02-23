import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Search,
  Server,
  Zap,
  Wind,
  Network,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { RackTemplate, RackComponentTemplate } from '../../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type CompType = 'power' | 'cooling' | 'management' | 'network' | 'other';

type DraftComponent = {
  _key: string;
  template_id: string;
  u_position: number;
  side: 'left' | 'right';
};

type Draft = {
  id: string;
  name: string;
  u_height: number;
  components: DraftComponent[];
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<CompType, string> = {
  power: '#eab308',
  cooling: '#3b82f6',
  management: '#a855f7',
  network: '#465fff',
  other: '#6b7280',
};

const TYPE_ICON: Record<CompType, React.ElementType> = {
  power: Zap,
  cooling: Wind,
  management: Settings2,
  network: Network,
  other: Server,
};

const EMPTY_DRAFT: Draft = {
  id: '',
  name: '',
  u_height: 42,
  components: [],
};

const nextKey = (() => {
  let n = 0;
  return () => `c${++n}`;
})();

// ── Rack preview ──────────────────────────────────────────────────────────────

const RackPreview = ({
  draft,
  compTemplates,
}: {
  draft: Draft;
  compTemplates: Record<string, RackComponentTemplate>;
}) => {
  const uH = Math.max(1, draft.u_height);
  const U_PX = Math.max(10, Math.min(20, Math.floor(420 / uH)));

  // Build occupied map: u → { name, type, height }
  const occupied = useMemo(() => {
    const map = new Map<number, { name: string; type: CompType; height: number }>();
    for (const c of draft.components) {
      const tmpl = compTemplates[c.template_id];
      if (!tmpl || tmpl.location !== 'u-mount') continue;
      const h = tmpl.u_height ?? 1;
      if (c.u_position < 1 || c.u_position > uH) continue;
      const info = { name: tmpl.name, type: (tmpl.type as CompType) ?? 'other', height: h };
      for (let i = 0; i < h; i++) map.set(c.u_position + i, info);
    }
    return map;
  }, [draft.components, compTemplates, uH]);

  const sideComponents = draft.components
    .map((c) => compTemplates[c.template_id])
    .filter(Boolean)
    .filter((t) => t.location === 'side' || t.location === 'front' || t.location === 'rear');

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
        Preview — {uH}U
      </p>

      <div className="flex gap-2">
        {/* Side indicators left */}
        <div className="flex w-4 flex-col items-center gap-px pt-5">
          {draft.components
            .filter((c) => {
              const t = compTemplates[c.template_id];
              return t?.location === 'side' && c.side === 'left';
            })
            .slice(0, 3)
            .map((c) => {
              const t = compTemplates[c.template_id];
              const color = TYPE_COLOR[(t?.type as CompType) ?? 'other'];
              return (
                <div
                  key={c._key}
                  title={t?.name}
                  className="h-8 w-3 rounded-sm opacity-80"
                  style={{ backgroundColor: color }}
                />
              );
            })}
        </div>

        {/* Rack body */}
        <div
          className="flex-1 overflow-hidden rounded border-2 border-gray-700 bg-gray-950"
          style={{ minWidth: 0 }}
        >
          {/* Top rail */}
          <div className="h-3 border-b border-gray-700 bg-gray-900" />

          {/* U slots */}
          <div className="flex flex-col">
            {Array.from({ length: uH }).map((_, i) => {
              const u = i + 1;
              const info = occupied.get(u);
              const isStart =
                info &&
                draft.components.some(
                  (c) => c.u_position === u && compTemplates[c.template_id]?.location === 'u-mount'
                );

              return (
                <div
                  key={u}
                  className="flex items-center border-b border-gray-800/60"
                  style={{ height: U_PX }}
                >
                  {/* U number */}
                  <span
                    className="w-5 shrink-0 text-right font-mono text-gray-600"
                    style={{ fontSize: Math.max(7, U_PX * 0.45) }}
                  >
                    {u}
                  </span>

                  {/* Slot content */}
                  <div className="ml-1 flex min-w-0 flex-1 items-center overflow-hidden">
                    {info ? (
                      <div
                        className="flex w-full items-center gap-1 overflow-hidden rounded-sm px-1"
                        style={{
                          height: U_PX - 2,
                          backgroundColor: `${TYPE_COLOR[info.type]}22`,
                          borderLeft: `2px solid ${TYPE_COLOR[info.type]}`,
                        }}
                      >
                        {isStart && (
                          <span
                            className="truncate font-mono"
                            style={{
                              fontSize: Math.max(7, U_PX * 0.45),
                              color: TYPE_COLOR[info.type],
                            }}
                          >
                            {info.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-full rounded-sm bg-gray-900" style={{ height: U_PX - 2 }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom rail */}
          <div className="h-3 border-t border-gray-700 bg-gray-900" />
        </div>

        {/* Side indicators right */}
        <div className="flex w-4 flex-col items-center gap-px pt-5">
          {draft.components
            .filter((c) => {
              const t = compTemplates[c.template_id];
              return t?.location === 'side' && c.side === 'right';
            })
            .slice(0, 3)
            .map((c) => {
              const t = compTemplates[c.template_id];
              const color = TYPE_COLOR[(t?.type as CompType) ?? 'other'];
              return (
                <div
                  key={c._key}
                  title={t?.name}
                  className="h-8 w-3 rounded-sm opacity-80"
                  style={{ backgroundColor: color }}
                />
              );
            })}
        </div>
      </div>

      {/* Legend */}
      {sideComponents.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold tracking-wider text-gray-600 uppercase">
            Side / Front / Rear
          </p>
          {sideComponents.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: TYPE_COLOR[(t.type as CompType) ?? 'other'] }}
              />
              <span className="truncate text-gray-400">{t.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Component row ─────────────────────────────────────────────────────────────

const ComponentRow = ({
  comp,
  compTemplates,
  allTemplates,
  onChange,
  onDelete,
}: {
  comp: DraftComponent;
  compTemplates: Record<string, RackComponentTemplate>;
  allTemplates: RackComponentTemplate[];
  onChange: (updated: DraftComponent) => void;
  onDelete: () => void;
}) => {
  const tmpl = compTemplates[comp.template_id];
  const isSide = tmpl?.location === 'side';
  const isUMount = tmpl?.location === 'u-mount';
  const TypeIcon = tmpl ? (TYPE_ICON[(tmpl.type as CompType) ?? 'other'] ?? Server) : Server;
  const typeColor = tmpl ? TYPE_COLOR[(tmpl.type as CompType) ?? 'other'] : '#6b7280';

  return (
    <tr className="group border-b border-gray-100 dark:border-gray-800">
      {/* Template selector */}
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <TypeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: typeColor }} />
          <select
            value={comp.template_id}
            onChange={(e) => onChange({ ...comp, template_id: e.target.value })}
            className="focus:border-brand-500 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">— select component —</option>
            {allTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.type})
              </option>
            ))}
          </select>
        </div>
      </td>

      {/* Location badge */}
      <td className="px-2 py-2">
        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {tmpl?.location ?? '—'}
        </span>
      </td>

      {/* U position (only for u-mount) */}
      <td className="px-2 py-2">
        {isUMount ? (
          <input
            type="number"
            min={1}
            value={comp.u_position}
            onChange={(e) => onChange({ ...comp, u_position: parseInt(e.target.value, 10) || 1 })}
            className="focus:border-brand-500 w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
        )}
      </td>

      {/* Side (only for side-mounted) */}
      <td className="px-2 py-2">
        {isSide ? (
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {(['left', 'right'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...comp, side: s })}
                className={`px-2.5 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                  comp.side === s
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
        )}
      </td>

      {/* Delete */}
      <td className="py-2 pl-2 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-gray-700 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const CosmosRackTemplateEditorPage = () => {
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [compTemplatesList, setCompTemplatesList] = useState<RackComponentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  // Indexed component templates for quick lookup
  const compTemplates = useMemo(
    () => Object.fromEntries(compTemplatesList.map((t) => [t.id, t])),
    [compTemplatesList]
  );

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const cat = await api.getCatalog();
        setRackTemplates(cat.rack_templates ?? []);
        // getCatalog might not return rack_component_templates - handle gracefully
        const full = cat as unknown as { rack_component_templates?: RackComponentTemplate[] };
        setCompTemplatesList(full.rack_component_templates ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // ── Select template ────────────────────────────────────────────────────────
  const selectTemplate = useCallback((tmpl: RackTemplate) => {
    setSelectedId(tmpl.id);
    setIsNew(false);
    setDirty(false);
    setErrors([]);
    setSaveStatus('idle');

    // Flatten all component refs into our draft format
    const allRefs = [...(tmpl.infrastructure?.rack_components ?? [])];
    setDraft({
      id: tmpl.id,
      name: tmpl.name,
      u_height: tmpl.u_height,
      components: allRefs.map((ref) => ({
        _key: nextKey(),
        template_id: ref.template_id,
        u_position: ref.u_position,
        side: ref.side ?? 'left',
      })),
    });
  }, []);

  // ── New template ───────────────────────────────────────────────────────────
  const startNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setDirty(false);
    setErrors([]);
    setSaveStatus('idle');
    setDraft({ ...EMPTY_DRAFT });
  };

  // ── Patch draft ────────────────────────────────────────────────────────────
  const patchDraft = (updates: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setDirty(true);
    setSaveStatus('idle');
  };

  const addComponent = () => {
    patchDraft({
      components: [
        ...draft.components,
        {
          _key: nextKey(),
          template_id: compTemplatesList[0]?.id ?? '',
          u_position: 1,
          side: 'left',
        },
      ],
    });
  };

  const updateComponent = (key: string, updated: DraftComponent) => {
    patchDraft({
      components: draft.components.map((c) => (c._key === key ? updated : c)),
    });
  };

  const deleteComponent = (key: string) => {
    patchDraft({ components: draft.components.filter((c) => c._key !== key) });
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = (): string[] => {
    const errs: string[] = [];
    if (!draft.id.trim()) errs.push('Template ID is required');
    else if (!/^[a-z0-9_-]+$/.test(draft.id))
      errs.push('Template ID must be lowercase alphanumeric, hyphens or underscores');
    if (isNew && rackTemplates.some((t) => t.id === draft.id))
      errs.push(`Template ID "${draft.id}" already exists`);
    if (!draft.name.trim()) errs.push('Name is required');
    if (draft.u_height < 1 || draft.u_height > 100) errs.push('Height must be between 1 and 100U');
    for (const c of draft.components) {
      if (!c.template_id) errs.push('All components must have a template selected');
      const tmpl = compTemplates[c.template_id];
      if (tmpl?.location === 'u-mount') {
        if (c.u_position < 1 || c.u_position > draft.u_height)
          errs.push(
            `Component "${tmpl.name}" U position ${c.u_position} out of range (1–${draft.u_height})`
          );
      }
    }
    return errs;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSaveStatus('saving');

    const payload = {
      id: draft.id,
      name: draft.name,
      u_height: draft.u_height,
      infrastructure: {
        rack_components: draft.components.map((c) => {
          const tmpl = compTemplates[c.template_id];
          return {
            template_id: c.template_id,
            u_position: c.u_position,
            ...(tmpl?.location === 'side' ? { side: c.side } : {}),
          };
        }),
      },
    };

    try {
      if (isNew) {
        await api.createTemplate({ kind: 'rack', template: payload });
      } else {
        await api.updateTemplate({ kind: 'rack', template: payload });
      }
      // Reload catalog
      const cat = await api.getCatalog();
      setRackTemplates(cat.rack_templates ?? []);
      setSaveStatus('saved');
      setDirty(false);
      setIsNew(false);
      setSelectedId(draft.id);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rackTemplates.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  }, [rackTemplates, search]);

  const hasSelection = isNew || selectedId !== null;

  return (
    <div className="flex h-full gap-4 p-5">
      {/* ── Left: template list ────────────────────────────────────────────── */}
      <aside className="flex w-56 shrink-0 flex-col gap-3">
        {/* Search + new */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pr-3 pl-8 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={startNew}
            className="bg-brand-500 hover:bg-brand-600 flex items-center justify-center rounded-xl px-2.5 text-white transition-colors"
            title="New rack template"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <div className="border-t-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              {search ? 'No results' : 'No rack templates'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    selectedId === t.id && !isNew
                      ? 'bg-brand-50 dark:bg-brand-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      selectedId === t.id && !isNew
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                    }`}
                  >
                    <Server className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-xs font-medium ${
                        selectedId === t.id && !isNew
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {t.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-gray-400">{t.id}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-400 dark:bg-gray-800">
                    {t.u_height}U
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Center: editor ─────────────────────────────────────────────────── */}
      {!hasSelection ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <Server className="h-10 w-10 text-gray-200 dark:text-gray-700" />
          <p className="text-sm font-medium text-gray-400">Select a template or create a new one</p>
          <button
            onClick={startNew}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            New rack template
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Rack Templates</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {isNew ? 'New template' : draft.name}
              </span>
              {dirty && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  unsaved
                </span>
              )}
            </div>
            <button
              onClick={() => void handleSave()}
              disabled={saveStatus === 'saving' || !dirty}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                saveStatus === 'saved'
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {isNew ? 'Create' : 'Save'}
                </>
              )}
            </button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errors.length === 1 ? 'Validation error' : `${errors.length} validation errors`}
              </div>
              <ul className="mt-1.5 space-y-0.5 pl-6">
                {errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-500 dark:text-red-400">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Identity ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-4 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Identity
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Template ID
                </label>
                <input
                  type="text"
                  value={draft.id}
                  onChange={(e) =>
                    patchDraft({ id: e.target.value.toLowerCase().replace(/\s/g, '-') })
                  }
                  disabled={!isNew}
                  placeholder="standard-42u"
                  className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/50"
                />
                {!isNew && (
                  <p className="mt-1 text-[10px] text-gray-400">
                    ID cannot be changed after creation
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Name
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="Standard 42U Rack"
                  className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Height (U)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.u_height}
                  onChange={(e) => patchDraft({ u_height: parseInt(e.target.value, 10) || 42 })}
                  className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3 py-2 text-center font-mono text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* ── Components ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Infrastructure components ({draft.components.length})
              </p>
              <button
                onClick={addComponent}
                disabled={compTemplatesList.length === 0}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add component
              </button>
            </div>

            {compTemplatesList.length === 0 ? (
              <p className="text-xs text-gray-400">
                No rack component templates found. Define them in the templates library first.
              </p>
            ) : draft.components.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <Settings2 className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-400">No components yet</p>
                <button onClick={addComponent} className="text-brand-500 text-xs hover:underline">
                  Add the first component →
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Component template', 'Location', 'U position', 'Side', ''].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.components.map((comp) => (
                    <ComponentRow
                      key={comp._key}
                      comp={comp}
                      compTemplates={compTemplates}
                      allTemplates={compTemplatesList}
                      onChange={(updated) => updateComponent(comp._key, updated)}
                      onDelete={() => deleteComponent(comp._key)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Save error */}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed to save template. Check the console for details.
            </div>
          )}
        </div>
      )}

      {/* ── Right: preview ─────────────────────────────────────────────────── */}
      {hasSelection && (
        <aside className="flex w-52 shrink-0 flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <RackPreview draft={draft} compTemplates={compTemplates} />
        </aside>
      )}
    </div>
  );
};
