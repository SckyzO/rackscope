import { useState, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  Search,
  ClipboardCopy,
  Check,
  BookOpen,
  Code2,
  SlidersHorizontal,
  Tag,
  Link2,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  EmptyState,
  LoadingState,
  ErrorState,
} from '../templates/EmptyPage';
import { api } from '../../../services/api';
import type { CheckDefinition, ChecksLibrary, Catalog } from '../../../types';

// ── Badge helpers ─────────────────────────────────────────────────────────────

const KIND_BADGE: Record<string, string> = {
  server: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  storage: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  network: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  pdu: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400',
  cooling: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
};
const KIND_FALLBACK = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

const SCOPE_BADGE: Record<string, string> = {
  node: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  chassis: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
  rack: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
};
const SCOPE_FALLBACK = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500';

const OUTPUT_BADGE: Record<string, string> = {
  bool: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400',
  numeric: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
};
const OUTPUT_FALLBACK = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500';

const SEVERITY_BADGE: Record<string, string> = {
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const pill = (cls: string, label: string) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
  >
    {label}
  </span>
);

// ── Filter chip ───────────────────────────────────────────────────────────────

const FilterChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? 'bg-brand-500 text-white'
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
    }`}
  >
    {label}
  </button>
);

// ── Check list item ───────────────────────────────────────────────────────────

const CheckListItem = ({
  check,
  selected,
  onClick,
}: {
  check: CheckDefinition;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
      selected
        ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 border'
        : 'border border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
    }`}
  >
    <p
      className={`truncate font-mono text-xs font-bold ${
        selected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'
      }`}
    >
      {check.id}
    </p>
    {check.name && (
      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{check.name}</p>
    )}
    <div className="mt-1.5 flex flex-wrap gap-1">
      {check.kind && pill(KIND_BADGE[check.kind] ?? KIND_FALLBACK, check.kind)}
      {pill(SCOPE_BADGE[check.scope] ?? SCOPE_FALLBACK, check.scope)}
      {check.output && pill(OUTPUT_BADGE[check.output] ?? OUTPUT_FALLBACK, check.output)}
    </div>
  </button>
);

// ── YAML serializer (minimal, for clipboard export) ───────────────────────────

const toYaml = (check: CheckDefinition): string => {
  const lines: string[] = ['checks:'];
  lines.push(`  - id: ${check.id}`);
  lines.push(`    name: "${check.name ?? ''}"`);
  if (check.kind) lines.push(`    kind: ${check.kind}`);
  lines.push(`    scope: ${check.scope}`);
  if (check.output) lines.push(`    output: ${check.output}`);
  lines.push(`    expr: |`);
  const exprLines = check.expr.split('\n');
  for (const l of exprLines) lines.push(`      ${l}`);
  if (check.rules && check.rules.length > 0) {
    lines.push(`    rules:`);
    for (const r of check.rules) {
      lines.push(`      - op: "${r.op}"`);
      lines.push(`        value: ${r.value}`);
      lines.push(`        severity: ${r.severity}`);
    }
  }
  return lines.join('\n');
};

// ── Usage cross-reference ─────────────────────────────────────────────────────

type UsageEntry = { kind: 'device' | 'rack' | 'component'; id: string; name: string };

const buildUsageMap = (catalog: Catalog): Map<string, UsageEntry[]> => {
  const map = new Map<string, UsageEntry[]>();
  const add = (checkId: string, entry: UsageEntry) => {
    const arr = map.get(checkId) ?? [];
    arr.push(entry);
    map.set(checkId, arr);
  };
  for (const t of catalog.device_templates) {
    for (const c of t.checks ?? []) add(c, { kind: 'device', id: t.id, name: t.name });
  }
  for (const t of catalog.rack_templates) {
    for (const c of t.checks ?? []) add(c, { kind: 'rack', id: t.id, name: t.name });
  }
  for (const t of catalog.rack_component_templates) {
    for (const c of t.checks ?? []) add(c, { kind: 'component', id: t.id, name: t.name });
  }
  return map;
};

// ── Detail panel ──────────────────────────────────────────────────────────────

const USAGE_KIND_BADGE: Record<string, string> = {
  device: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  rack: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  component: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
};

const CheckDetail = ({
  check,
  usageMap,
  isDark,
}: {
  check: CheckDefinition;
  usageMap: Map<string, UsageEntry[]>;
  isDark: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(toYaml(check)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const usages = usageMap.get(check.id) ?? [];

  return (
    <div className="space-y-4">
      {/* Detail header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-base font-bold text-gray-900 dark:text-white">{check.id}</p>
          {check.name && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{check.name}</p>
          )}
        </div>
        <button
          onClick={handleCopy}
          title="Copy YAML to clipboard"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3.5 w-3.5" />
              Export YAML
            </>
          )}
        </button>
      </div>

      {/* Identity */}
      <SectionCard
        title="Identity"
        icon={Tag}
        iconBg="bg-gray-100 dark:bg-gray-800"
        iconColor="text-gray-500 dark:text-gray-400"
      >
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">ID</span>
            <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
              {check.id}
            </span>
          </div>
          {check.name && (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {check.name}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Kind</span>
            {check.kind ? (
              pill(KIND_BADGE[check.kind] ?? KIND_FALLBACK, check.kind)
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
            )}
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Scope</span>
            {pill(SCOPE_BADGE[check.scope] ?? SCOPE_FALLBACK, check.scope)}
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Output</span>
            {check.output ? (
              pill(OUTPUT_BADGE[check.output] ?? OUTPUT_FALLBACK, check.output)
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* PromQL Expression */}
      <SectionCard
        title="PromQL Expression"
        desc="Query evaluated by the telemetry planner."
        icon={Code2}
        iconBg="bg-gray-100 dark:bg-gray-800"
        iconColor="text-gray-500 dark:text-gray-400"
      >
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <Editor
            height="120px"
            language="promql"
            value={check.expr}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'off',
              folding: false,
              wordWrap: 'on',
              fontSize: 12,
              renderLineHighlight: 'none',
              overviewRulerLanes: 0,
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
              padding: { top: 10, bottom: 10 },
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {[
            { token: '$instances', desc: 'Node instance IDs' },
            { token: '$chassis', desc: 'Chassis IDs' },
            { token: '$racks', desc: 'Rack IDs' },
          ].map(({ token, desc }) => (
            <div key={token} className="flex items-center gap-1.5">
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {token}
              </code>
              <span className="text-[11px] text-gray-400 dark:text-gray-600">{desc}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Threshold Rules */}
      <SectionCard
        title="Threshold Rules"
        desc="Conditions mapped to severity levels."
        icon={SlidersHorizontal}
        iconBg="bg-gray-100 dark:bg-gray-800"
        iconColor="text-gray-500 dark:text-gray-400"
      >
        {check.rules && check.rules.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Op
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Value
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {check.rules.map((rule, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                        {rule.op}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                        {String(rule.value)}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      {pill(SEVERITY_BADGE[rule.severity] ?? SEVERITY_BADGE.UNKNOWN, rule.severity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600">No threshold rules defined.</p>
        )}
      </SectionCard>

      {/* Usage */}
      <SectionCard
        title="Used by Templates"
        desc="Templates that reference this check."
        icon={Link2}
        iconBg="bg-gray-100 dark:bg-gray-800"
        iconColor="text-gray-500 dark:text-gray-400"
      >
        {usages.length > 0 ? (
          <div className="space-y-1.5">
            {usages.map((u) => (
              <div
                key={`${u.kind}-${u.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                {pill(USAGE_KIND_BADGE[u.kind] ?? KIND_FALLBACK, u.kind)}
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{u.id}</span>
                <span className="text-xs text-gray-400 dark:text-gray-600">{u.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600">
            Not referenced by any template.
          </p>
        )}
      </SectionCard>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const KIND_FILTERS = ['All', 'server', 'storage', 'network', 'pdu', 'cooling'];
const SCOPE_FILTERS = ['All', 'node', 'chassis', 'rack'];

export const CosmosChecksEditorPage = () => {
  usePageTitle('Checks Library');

  const [library, setLibrary] = useState<ChecksLibrary | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('All');
  const [scopeFilter, setScopeFilter] = useState('All');
  const [selected, setSelected] = useState<CheckDefinition | null>(null);

  // Detect dark mode from document class (ThemeContext applies it to <html>)
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getChecks(), api.getCatalog()])
      .then(([lib, cat]) => {
        setLibrary(lib);
        setCatalog(cat as Catalog);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load checks library.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const usageMap = useMemo(
    () => (catalog ? buildUsageMap(catalog) : new Map<string, UsageEntry[]>()),
    [catalog]
  );

  const filtered = useMemo(() => {
    if (!library) return [];
    return library.checks.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.id.toLowerCase().includes(q) ||
        (c.name ?? '').toLowerCase().includes(q) ||
        c.expr.toLowerCase().includes(q);
      const matchKind = kindFilter === 'All' || c.kind === kindFilter;
      const matchScope = scopeFilter === 'All' || c.scope === scopeFilter;
      return matchSearch && matchKind && matchScope;
    });
  }, [library, search, kindFilter, scopeFilter]);

  // Auto-select first item when filters change and current selection is not visible
  useEffect(() => {
    if (filtered.length > 0 && (!selected || !filtered.find((c) => c.id === selected.id))) {
      setSelected(filtered[0]);
    } else if (filtered.length === 0) {
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Checks Library"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'Editors', href: '#' },
              { label: 'Checks Library' },
            ]}
          />
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <LoadingState message="Loading checks library…" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

      {!loading && !error && library && (
        <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
          {/* ── Left panel ── */}
          <div
            className="shrink-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            style={{ width: 300 }}
          >
            {/* Search */}
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search checks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-2 pr-3 pl-9 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Kind filters */}
            <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
              <p className="mb-2 text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-600">
                Kind
              </p>
              <div className="flex flex-wrap gap-1.5">
                {KIND_FILTERS.map((k) => (
                  <FilterChip
                    key={k}
                    label={k}
                    active={kindFilter === k}
                    onClick={() => setKindFilter(k)}
                  />
                ))}
              </div>
            </div>

            {/* Scope filters */}
            <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
              <p className="mb-2 text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-600">
                Scope
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_FILTERS.map((s) => (
                  <FilterChip
                    key={s}
                    label={s}
                    active={scopeFilter === s}
                    onClick={() => setScopeFilter(s)}
                  />
                ))}
              </div>
            </div>

            {/* Result count */}
            <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {filtered.length} check{filtered.length !== 1 ? 's' : ''}
                {library.checks.length !== filtered.length && ` of ${library.checks.length}`}
              </p>
            </div>

            {/* Check list */}
            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <EmptyState
                  title="No checks match"
                  description="Try adjusting the filters or search."
                />
              ) : (
                <div className="space-y-1">
                  {filtered.map((c) => (
                    <CheckListItem
                      key={c.id}
                      check={c}
                      selected={selected?.id === c.id}
                      onClick={() => setSelected(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="min-w-0 flex-1">
            {selected ? (
              <CheckDetail check={selected} usageMap={usageMap} isDark={isDark} />
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <EmptyState
                  title="Select a check to view its definition"
                  description="Pick a check from the list on the left."
                  action={
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                      <BookOpen className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
