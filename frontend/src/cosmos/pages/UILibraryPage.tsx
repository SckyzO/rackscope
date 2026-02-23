import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePageTitle } from '../contexts/PageTitleContext';
import { PageHeader, SectionCard } from './templates/EmptyPage';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComponentEntry {
  name: string;
  description: string;
  route: string;
}

interface CategorySection {
  title: string;
  items: ComponentEntry[];
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES: CategorySection[] = [
  {
    title: 'Components',
    items: [
      { name: 'Badges', description: 'Status and label pills', route: '/cosmos/ui/badges' },
      { name: 'Alerts', description: 'Contextual feedback messages', route: '/cosmos/ui/alerts' },
      {
        name: 'Buttons',
        description: 'Button variants and groups',
        route: '/cosmos/ui/buttons-group',
      },
      { name: 'Cards', description: 'Content container cards', route: '/cosmos/ui/cards' },
      { name: 'Modals', description: 'Dialog overlays', route: '/cosmos/ui/modals' },
      { name: 'Drawers', description: 'Slide-in side panels', route: '/cosmos/ui/drawer' },
      {
        name: 'Dropdowns',
        description: 'Context menus and selects',
        route: '/cosmos/ui/dropdowns',
      },
      { name: 'Tooltips', description: 'Hover information hints', route: '/cosmos/ui/tooltips' },
      { name: 'Popovers', description: 'Rich hover content panels', route: '/cosmos/ui/popovers' },
    ],
  },
  {
    title: 'Forms',
    items: [
      {
        name: 'Form Elements',
        description: 'Inputs, selects, checkboxes',
        route: '/cosmos/ui/form-elements',
      },
      { name: 'OTP Input', description: 'One-time password entry', route: '/cosmos/ui/otp-input' },
      {
        name: 'Range Slider',
        description: 'Numeric range selector',
        route: '/cosmos/ui/range-slider',
      },
      { name: 'Tag Input', description: 'Multi-value token input', route: '/cosmos/ui/tag-input' },
    ],
  },
  {
    title: 'Data Display',
    items: [
      {
        name: 'Stats Cards',
        description: 'KPI metric summary cards',
        route: '/cosmos/ui/stats-cards',
      },
      { name: 'Charts', description: 'Line, bar and area charts', route: '/cosmos/charts' },
      {
        name: 'Data Tables',
        description: 'Sortable and filterable tables',
        route: '/cosmos/tables',
      },
      { name: 'Avatars', description: 'User and entity avatars', route: '/cosmos/ui/avatars' },
      { name: 'Ribbons', description: 'Corner ribbon decorations', route: '/cosmos/ui/ribbons' },
      { name: 'List', description: 'Structured list items', route: '/cosmos/ui/list' },
      { name: 'Links', description: 'Styled anchor variants', route: '/cosmos/ui/links' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { name: 'Tabs', description: 'Horizontal tab switcher', route: '/cosmos/ui/tabs' },
      {
        name: 'Pagination',
        description: 'Page navigation controls',
        route: '/cosmos/ui/pagination',
      },
      {
        name: 'Breadcrumb',
        description: 'Hierarchical path trail',
        route: '/cosmos/ui/breadcrumb',
      },
    ],
  },
  {
    title: 'Feedback',
    items: [
      { name: 'Toast', description: 'Transient notification toasts', route: '/cosmos/ui/toast' },
      { name: 'Spinners', description: 'Loading indicators', route: '/cosmos/ui/spinners' },
      {
        name: 'Skeleton',
        description: 'Content loading placeholders',
        route: '/cosmos/ui/skeleton',
      },
      {
        name: 'Progress Bar',
        description: 'Linear progress indicator',
        route: '/cosmos/ui/progress-bar',
      },
      {
        name: 'Empty State',
        description: 'No-data placeholder views',
        route: '/cosmos/ui/empty-state',
      },
    ],
  },
  {
    title: 'Advanced',
    items: [
      {
        name: 'Accordion',
        description: 'Collapsible content sections',
        route: '/cosmos/ui/accordion',
      },
      { name: 'Stepper', description: 'Multi-step wizard flow', route: '/cosmos/ui/stepper' },
      { name: 'Timeline', description: 'Chronological event list', route: '/cosmos/ui/timeline' },
      { name: 'Carousel', description: 'Sliding content carousel', route: '/cosmos/ui/carousel' },
      {
        name: 'Notifications',
        description: 'Notification feed items',
        route: '/cosmos/ui/notifications',
      },
      { name: 'Calendar', description: 'Date and event calendar', route: '/cosmos/calendar' },
    ],
  },
  {
    title: 'Pages',
    items: [
      {
        name: 'Empty Page',
        description: 'Standard full-width page template',
        route: '/cosmos/templates/empty',
      },
      {
        name: 'Centered Page',
        description: 'Narrow centered layout for forms',
        route: '/cosmos/templates/centered',
      },
      {
        name: 'Design System',
        description: 'All reusable building blocks',
        route: '/cosmos/templates/showcase',
      },
      { name: 'Sign In', description: 'Authentication login page', route: '/cosmos/auth/signin' },
      { name: 'Sign Up', description: 'Registration page', route: '/cosmos/auth/signup' },
    ],
  },
];

const SUMMARY = [
  { label: 'Components', count: 9 },
  { label: 'Forms', count: 4 },
  { label: 'Data Display', count: 7 },
  { label: 'Navigation', count: 3 },
  { label: 'Feedback', count: 5 },
  { label: 'Advanced', count: 6 },
  { label: 'Pages', count: 5 },
];

// ── Component card ────────────────────────────────────────────────────────────

const ComponentCard = ({ name, description, route }: ComponentEntry) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(route)}
      className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
    >
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{name}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
    </button>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const UILibraryPage = () => {
  usePageTitle('UI Library');

  return (
    <div className="space-y-6">
      <PageHeader title="UI Library" description="All available components and patterns" />

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        {SUMMARY.map(({ label, count }) => (
          <span
            key={label}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {label} <span className="font-bold text-gray-900 dark:text-white">{count}</span>
          </span>
        ))}
      </div>

      {/* Category sections */}
      {CATEGORIES.map((category) => (
        <SectionCard key={category.title} title={category.title}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {category.items.map((item) => (
              <ComponentCard key={item.route} {...item} />
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
};
