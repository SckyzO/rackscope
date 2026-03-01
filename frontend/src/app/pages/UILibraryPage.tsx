import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, X } from 'lucide-react';
import { usePageTitle } from '../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from './templates/EmptyPage';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComponentEntry {
  name: string;
  description: string;
  route: string;
  tag?: string; // optional sub-label (e.g. chart type)
}

interface CategorySection {
  id: string;
  title: string;
  color: string; // accent color for the dot indicator
  items: ComponentEntry[];
}

// ── Category data ─────────────────────────────────────────────────────────────

const CATEGORIES: CategorySection[] = [
  {
    id: 'components',
    title: 'Components',
    color: '#465fff',
    items: [
      { name: 'Badges', description: 'Status and label pills', route: '/ui/badges' },
      { name: 'Alerts', description: 'Contextual feedback messages', route: '/ui/alerts' },
      {
        name: 'Buttons',
        description: 'Primary, secondary, icon, sizes, states',
        route: '/ui/buttons',
      },
      {
        name: 'Buttons Group',
        description: 'Grouped buttons sharing a container',
        route: '/ui/buttons-group',
      },
      { name: 'Cards', description: 'Content container cards', route: '/ui/cards' },
      { name: 'Modals', description: 'Dialog overlays', route: '/ui/modals' },
      { name: 'Drawers', description: 'Slide-in side panels', route: '/ui/drawer' },
      {
        name: 'Dropdowns',
        description: 'Context menus and selects',
        route: '/ui/dropdowns',
      },
      { name: 'Tooltips', description: 'Hover information hints', route: '/ui/tooltips' },
      { name: 'Popovers', description: 'Rich hover content panels', route: '/ui/popovers' },
    ],
  },
  {
    id: 'forms',
    title: 'Forms',
    color: '#8b5cf6',
    items: [
      {
        name: 'Form Elements',
        description: 'Inputs, selects, checkboxes',
        route: '/ui/form-elements',
      },
      { name: 'OTP Input', description: 'One-time password entry', route: '/ui/otp-input' },
      {
        name: 'Range Slider',
        description: 'Numeric range selector',
        route: '/ui/range-slider',
      },
      { name: 'Tag Input', description: 'Multi-value token input', route: '/ui/tag-input' },
    ],
  },
  {
    id: 'charts',
    title: 'Charts',
    color: '#10b981',
    items: [
      {
        name: 'Realtime',
        description: 'Live metric with WARN/CRIT threshold lines',
        route: '/charts#realtime',
        tag: 'realtime',
      },
      {
        name: 'Line / Area',
        description: 'Smooth time-series with gradient fill',
        route: '/charts#line-area',
        tag: 'area',
      },
      {
        name: 'Radial Bar',
        description: 'Multi-series radial gauge',
        route: '/charts#radial-bar',
        tag: 'radialBar',
      },
      {
        name: 'Gradient Circle',
        description: 'Full circle with gradient fill',
        route: '/charts#gradient-circle',
        tag: 'gauge',
      },
      {
        name: 'Donut',
        description: 'Health distribution with center total',
        route: '/charts#donut',
        tag: 'donut',
      },
      {
        name: 'Donut Right Legend',
        description: 'Compact donut, legend on the right',
        route: '/charts#donut-legend',
        tag: 'donut',
      },
      {
        name: 'Semi-circle Gauges',
        description: 'Half-circle KPI — CPU / Mem / Disk',
        route: '/charts#semi-circle',
        tag: 'gauge',
      },
      {
        name: 'Stroked Gauge',
        description: 'Thin multi-track -135° to 135°',
        route: '/charts#stroked',
        tag: 'gauge',
      },
      {
        name: 'Sparklines',
        description: 'Mini inline trend charts for overview panels',
        route: '/charts#sparklines',
        tag: 'spark',
      },
      {
        name: 'Treemap',
        description: 'Area-proportional blocks — rack device footprint',
        route: '/charts#treemap',
        tag: 'tree',
      },
    ],
  },
  {
    id: 'data',
    title: 'Data Display',
    color: '#f59e0b',
    items: [
      {
        name: 'Stats Cards',
        description: 'KPI metric summary cards',
        route: '/ui/stats-cards',
      },
      {
        name: 'Data Tables',
        description: 'Sortable and filterable tables',
        route: '/tables',
      },
      { name: 'Avatars', description: 'User and entity avatars', route: '/ui/avatars' },
      { name: 'Ribbons', description: 'Corner ribbon decorations', route: '/ui/ribbons' },
      { name: 'List', description: 'Structured list items', route: '/ui/list' },
      { name: 'Links', description: 'Styled anchor variants', route: '/ui/links' },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    color: '#06b6d4',
    items: [
      { name: 'Tabs', description: 'Horizontal tab switcher', route: '/ui/tabs' },
      {
        name: 'Pagination',
        description: 'Page navigation controls',
        route: '/ui/pagination',
      },
      {
        name: 'Breadcrumb',
        description: 'Hierarchical path trail',
        route: '/ui/breadcrumb',
      },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    color: '#ef4444',
    items: [
      { name: 'Toast', description: 'Transient notification toasts', route: '/ui/toast' },
      { name: 'Spinners', description: 'Loading indicators', route: '/ui/spinners' },
      {
        name: 'Skeleton',
        description: 'Content loading placeholders',
        route: '/ui/skeleton',
      },
      {
        name: 'Progress Bar',
        description: 'Linear progress indicator',
        route: '/ui/progress-bar',
      },
      {
        name: 'Empty State',
        description: 'No-data placeholder views',
        route: '/ui/empty-state',
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    color: '#6366f1',
    items: [
      {
        name: 'Accordion',
        description: 'Collapsible content sections',
        route: '/ui/accordion',
      },
      { name: 'Stepper', description: 'Multi-step wizard flow', route: '/ui/stepper' },
      { name: 'Timeline', description: 'Chronological event list', route: '/ui/timeline' },
      { name: 'Carousel', description: 'Sliding content carousel', route: '/ui/carousel' },
      {
        name: 'Notifications',
        description: 'Notification feed items',
        route: '/ui/notifications',
      },
      { name: 'Calendar', description: 'Date and event calendar', route: '/calendar' },
    ],
  },
  {
    id: 'pages',
    title: 'Pages',
    color: '#6b7280',
    items: [
      {
        name: 'Empty Page',
        description: 'Standard full-width page template',
        route: '/templates/empty',
      },
      {
        name: 'Centered Page',
        description: 'Narrow centered layout for forms',
        route: '/templates/centered',
      },
      {
        name: 'Design System',
        description: 'All reusable building blocks',
        route: '/templates/showcase',
      },
      { name: 'Sign In', description: 'Authentication login page', route: '/auth/signin' },
      { name: 'Sign Up', description: 'Registration page', route: '/auth/signup' },
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring Templates',
    color: '#3b82f6',
    items: [
      {
        name: 'Rack View',
        description: 'Dual front/rear RackElevation + sidebar + device drawer',
        route: '/templates/rack',
        tag: 'live',
      },
      {
        name: 'Device View',
        description: 'Breadcrumb + metrics + instance selector + check tabs',
        route: '/templates/device',
        tag: 'live',
      },
      {
        name: 'Room View',
        description: 'Health summary + rack grid + elevation on click',
        route: '/templates/room',
        tag: 'live',
      },
    ],
  },
  {
    id: 'examples',
    title: 'Examples',
    color: '#0ea5e9',
    items: [
      {
        name: 'Health Status',
        description: 'OK/WARN/CRIT/UNKNOWN badges, dots, summary bars',
        route: '/rackscope/health',
      },
      {
        name: 'Alert Feed',
        description: 'Alert list with severity, filters and actions',
        route: '/rackscope/alerts',
      },
      {
        name: 'Metrics',
        description: 'Sparklines, gauges, progress bars, PDU bars',
        route: '/rackscope/metrics',
      },
      {
        name: 'Infra Navigation',
        description: 'Breadcrumb, rack mini-cards, device type icons',
        route: '/rackscope/infra-nav',
      },
      {
        name: 'Slurm (design)',
        description: 'HPC cluster layout — node grid, wallboard',
        route: '/rackscope/slurm',
      },
    ],
  },
];

const ALL_FILTER = 'all';

// ── Component card ─────────────────────────────────────────────────────────────

const ComponentCard = ({ entry, color }: { entry: ComponentEntry; color: string }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(entry.route)}
      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      {/* Color dot */}
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
            {entry.name}
          </p>
          {entry.tag && (
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">
              {entry.tag}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-400 dark:text-gray-500">{entry.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
    </button>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const UILibraryPage = () => {
  usePageTitle('UI Library');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);

  const totalCount = CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);

  // Filter logic: category tab + search query
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          (activeFilter === ALL_FILTER || activeFilter === cat.id) &&
          (!q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q))
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search, activeFilter]);

  const filteredCount = filtered.reduce((sum, c) => sum + c.items.length, 0);
  const hasQuery = search.trim().length > 0 || activeFilter !== ALL_FILTER;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="UI Library"
          description={
            hasQuery
              ? `${filteredCount} of ${totalCount} components`
              : `${totalCount} components across ${CATEGORIES.length} categories`
          }
          breadcrumb={
            <PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'UI Library' }]} />
          }
        />

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search components…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-white py-2 pr-8 pl-9 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Category filters ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter(ALL_FILTER)}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === ALL_FILTER
              ? 'bg-brand-500 text-white'
              : 'border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
          }`}
        >
          All
          <span
            className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeFilter === ALL_FILTER
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(activeFilter === cat.id ? ALL_FILTER : cat.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === cat.id
                ? 'border-2 text-gray-800 dark:text-gray-200'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
            style={
              activeFilter === cat.id
                ? { borderColor: cat.color, backgroundColor: cat.color + '15' }
                : {}
            }
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.title}
            <span className="rounded-full bg-gray-100 px-1 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {cat.items.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── No results ── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Search className="h-8 w-8 text-gray-200 dark:text-gray-700" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No components match &ldquo;{search}&rdquo;
          </p>
          <button
            onClick={() => {
              setSearch('');
              setActiveFilter(ALL_FILTER);
            }}
            className="text-brand-500 text-xs hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Component grids ── */}
      {filtered.map((cat) => (
        <div key={cat.id}>
          {/* Section header */}
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat.title}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {cat.items.length}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cat.items.map((item) => (
              <ComponentCard key={item.route + item.name} entry={item} color={cat.color} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
