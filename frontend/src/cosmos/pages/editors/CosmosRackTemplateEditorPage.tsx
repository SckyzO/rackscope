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
  ShieldCheck,
} from 'lucide-react';
import { RackElevation } from '../../../components/RackVisualizer';
import { api } from '../../../services/api';
import type {
  RackTemplate,
  RackComponentTemplate,
  CheckDefinition,
  InfrastructureComponent,
  Rack,
} from '../../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  checks: string[];
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  power: '#eab308',
  pdu: '#f97316',
  cooling: '#3b82f6',
  management: '#a855f7',
  network: '#465fff',
  other: '#6b7280',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  power: Zap,
  pdu: Zap,
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
  checks: [],
};

const nextKey = (() => {
  let n = 0;
  return () => `c${++n}`;
})();

// ── Helpers: convert draft → InfrastructureComponent[] ───────────────────────

const VALID_INFRA_TYPES = new Set(['power', 'cooling', 'management', 'network', 'other']);

function toInfraType(t: string): InfrastructureComponent['type'] {
  return VALID_INFRA_TYPES.has(t) ? (t as InfrastructureComponent['type']) : 'other';
}

function buildInfraComponents(
  draft: Draft,
  compTemplates: Record<string, RackComponentTemplate>
): {
  sideComps: InfrastructureComponent[];
  frontComps: InfrastructureComponent[];
  rearComps: InfrastructureComponent[];
} {
  const sideComps: InfrastructureComponent[] = [];
  const frontComps: InfrastructureComponent[] = [];
  const rearComps: InfrastructureComponent[] = [];

  for (const c of draft.components) {
    const tmpl = compTemplates[c.template_id];
    if (!tmpl) continue;

    if (tmpl.location === 'side') {
      sideComps.push({
        id: c._key,
        name: tmpl.name,
        type: toInfraType(tmpl.type ?? 'other'),
        model: tmpl.model,
        location: c.side === 'left' ? 'side-left' : 'side-right',
        u_position: c.u_position,
        u_height: tmpl.u_height,
      });
    } else if (tmpl.location === 'rear') {
      rearComps.push({
        id: c._key,
        name: tmpl.name,
        type: toInfraType(tmpl.type ?? 'other'),
        model: tmpl.model,
        location: 'u-mount',
        u_position: c.u_position,
        u_height: tmpl.u_height,
      });
    } else {
      // u-mount + front → show on front face
      frontComps.push({
        id: c._key,
        name: tmpl.name,
        type: toInfraType(tmpl.type ?? 'other'),
        model: tmpl.model,
        location: 'u-mount',
        u_position: c.u_position,
        u_height: tmpl.u_height,
      });
    }
  }

  return { sideComps, frontComps, rearComps };
}

// ── Live rack visualization ───────────────────────────────────────────────────

const RackPanel = ({
  label,
  draft,
  compTemplates,
  face,
}: {
  label: string;
  draft: Draft;
  compTemplates: Record<string, RackComponentTemplate>;
  face: 'front' | 'rear';
}) => {
  const previewRack = useMemo(
    () =>
      ({
        id: draft.id || 'preview',
        name: draft.name || 'Preview',
        u_height: draft.u_height,
        devices: [],
      }) as Rack,
    [draft.id, draft.name, draft.u_height]
  );

  const { sideComps, frontComps, rearComps } = useMemo(
    () => buildInfraComponents(draft, compTemplates),
    [draft, compTemplates]
  );

  const infraComps = face === 'front' ? frontComps : rearComps;
  const isRear = face === 'rear';

  return (
    <div>
      <p className="mb-2 text-center text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        {label}
      </p>
      <RackElevation
        rack={previewRack}
        catalog={{}}
        health={undefined}
        nodesData={{}}
        isRearView={isRear}
        infraComponents={infraComps}
        sideComponents={sideComps}
        allowInfraOverlap={isRear}
        pduMetrics={undefined}
        onDeviceClick={() => {}}
      />
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
  const isUMount =
    tmpl?.location === 'u-mount' || tmpl?.location === 'front' || tmpl?.location === 'rear';
  const TypeIcon = TYPE_ICON[tmpl?.type ?? 'other'] ?? Server;
  const typeColor = TYPE_COLOR[tmpl?.type ?? 'other'];

  return (
    <tr className="group border-b border-gray-100 dark:border-gray-800">
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <TypeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: typeColor }} />
          <select
            value={comp.template_id}
            onChange={(e) => onChange({ ...comp, template_id: e.target.value })}
            className="focus:border-brand-500 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">— select —</option>
            {allTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.type})
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-2 py-2">
        {tmpl && (
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium text-white"
            style={{ backgroundColor: `${typeColor}aa` }}
          >
            {tmpl.location}
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        {isUMount ? (
          <input
            type="number"
            min={1}
            value={comp.u_position}
            onChange={(e) => onChange({ ...comp, u_position: parseInt(e.target.value, 10) || 1 })}
            className="focus:border-brand-500 w-14 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
        )}
      </td>
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
  const [rackChecks, setRackChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  const compTemplates = useMemo(
    () => Object.fromEntries(compTemplatesList.map((t) => [t.id, t])),
    [compTemplatesList]
  );

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cat, checksLib] = await Promise.all([
          api.getCatalog(),
          api.getChecks().catch(() => null),
        ]);
        setRackTemplates(cat.rack_templates ?? []);
        const full = cat as unknown as { rack_component_templates?: RackComponentTemplate[] };
        setCompTemplatesList(full.rack_component_templates ?? []);
        setRackChecks((checksLib?.checks ?? []).filter((c: CheckDefinition) => c.scope === 'rack'));
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
    const refs = tmpl.infrastructure?.rack_components ?? [];
    setDraft({
      id: tmpl.id,
      name: tmpl.name,
      u_height: tmpl.u_height,
      checks: tmpl.checks ?? [],
      components: refs.map((ref) => ({
        _key: nextKey(),
        template_id: ref.template_id,
        u_position: ref.u_position,
        side: ref.side ?? 'left',
      })),
    });
  }, []);

  const startNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setDirty(false);
    setErrors([]);
    setSaveStatus('idle');
    setDraft({ ...EMPTY_DRAFT });
  };

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
    patchDraft({ components: draft.components.map((c) => (c._key === key ? updated : c)) });
  };

  const deleteComponent = (key: string) => {
    patchDraft({ components: draft.components.filter((c) => c._key !== key) });
  };

  const toggleCheck = (checkId: string) => {
    const next = draft.checks.includes(checkId)
      ? draft.checks.filter((c) => c !== checkId)
      : [...draft.checks, checkId];
    patchDraft({ checks: next });
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = (): string[] => {
    const errs: string[] = [];
    if (!draft.id.trim()) errs.push('Template ID is required');
    else if (!/^[a-z0-9_-]+$/.test(draft.id))
      errs.push('Template ID: lowercase, digits, hyphens and underscores only');
    if (isNew && rackTemplates.some((t) => t.id === draft.id))
      errs.push(`Template ID "${draft.id}" already exists`);
    if (!draft.name.trim()) errs.push('Name is required');
    if (draft.u_height < 1 || draft.u_height > 100) errs.push('Height must be between 1 and 100U');
    for (const c of draft.components) {
      if (!c.template_id) {
        errs.push('All components must have a template selected');
        break;
      }
      const tmpl = compTemplates[c.template_id];
      if (tmpl?.location !== 'side') {
        const h = tmpl?.u_height ?? 1;
        if (c.u_position < 1 || c.u_position + h - 1 > draft.u_height)
          errs.push(`"${tmpl?.name}" (U${c.u_position}) out of rack bounds`);
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
      checks: draft.checks,
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
      if (isNew) await api.createTemplate({ kind: 'rack', template: payload });
      else await api.updateTemplate({ kind: 'rack', template: payload });
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rackTemplates.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  }, [rackTemplates, search]);

  const hasSelection = isNew || selectedId !== null;

  return (
    <div className="flex h-full gap-0">
      {/* ── LEFT: template list ─────────────────────────────────────────────── */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="shrink-0 border-b border-gray-100 p-3 dark:border-gray-800">
          <div className="mb-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pr-3 pl-8 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <div className="border-t-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-gray-200" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              {search ? 'No results' : 'No rack templates'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((t) => {
                const active = selectedId === t.id && !isNew;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'bg-brand-50 dark:bg-brand-500/10'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                      }`}
                    >
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-medium ${
                          active
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {t.name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-gray-400">{t.id}</p>
                    </div>
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-400 dark:bg-gray-800">
                      {t.u_height}U
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── CENTER: editor form ─────────────────────────────────────────────── */}
      {!hasSelection ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
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
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="space-y-4 p-5">
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
                  {errors.length} validation error{errors.length > 1 ? 's' : ''}
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
                    <p className="mt-1 text-[10px] text-gray-400">Immutable after creation</p>
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
                  Add
                </button>
              </div>

              {compTemplatesList.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No rack component templates found. Define them in the component library first.
                </p>
              ) : draft.components.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-5">
                  <Settings2 className="h-7 w-7 text-gray-200 dark:text-gray-700" />
                  <p className="text-sm text-gray-400">No components yet</p>
                  <button onClick={addComponent} className="text-brand-500 text-xs hover:underline">
                    Add the first component →
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['Component', 'Location', 'U pos', 'Side', ''].map((h) => (
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

            {/* ── Health checks ── */}
            {rackChecks.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="text-brand-500 h-4 w-4" />
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Health checks ({draft.checks.length}/{rackChecks.length} selected)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {rackChecks.map((c) => {
                    const active = draft.checks.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                          active
                            ? 'border-brand-300 bg-brand-50 dark:border-brand-700/50 dark:bg-brand-500/10'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleCheck(c.id)}
                          className="accent-brand-500 h-3.5 w-3.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className={`truncate text-xs font-medium ${
                              active
                                ? 'text-brand-700 dark:text-brand-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {c.name || c.id}
                          </p>
                          <p className="truncate font-mono text-[9px] text-gray-400">{c.id}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save error */}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Failed to save template.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RIGHT: live rack previews ────────────────────────────────────────── */}
      {hasSelection && (
        <aside className="flex w-[560px] shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="mb-4 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Live Preview — {draft.u_height}U
          </p>
          <div className="grid grid-cols-2 gap-4">
            <RackPanel label="Front" draft={draft} compTemplates={compTemplates} face="front" />
            <RackPanel label="Rear" draft={draft} compTemplates={compTemplates} face="rear" />
          </div>
        </aside>
      )}
    </div>
  );
};
