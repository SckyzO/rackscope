import { useState } from 'react';
import { ChevronDown, CheckCircle, Settings, Bell, User } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const items = [
  {
    id: 'a1',
    title: 'What is Rackscope?',
    content:
      'Rackscope is a Prometheus-first physical infrastructure monitoring dashboard for data centers and HPC environments.',
  },
  {
    id: 'a2',
    title: 'How does it collect metrics?',
    content:
      'Rackscope queries Prometheus via PromQL in real-time. It does not collect metrics itself — it is a pure visualization layer.',
  },
  {
    id: 'a3',
    title: 'What health states are supported?',
    content:
      'OK (green), WARN (amber), CRIT (red), UNKNOWN (gray). These are derived from check rules evaluated against Prometheus results.',
  },
  {
    id: 'a4',
    title: 'Is Slurm integration supported?',
    content:
      'Yes. Rackscope integrates with Slurm workload manager to show node states (idle, allocated, down, draining) and partition statistics.',
  },
];

const iconsItems = [
  {
    id: 'i1',
    icon: CheckCircle,
    title: 'Health Checks',
    content:
      'Checks are defined as PromQL expressions with threshold rules. Results are cached and aggregated up the hierarchy.',
  },
  {
    id: 'i2',
    icon: Settings,
    title: 'Configuration',
    content:
      'All configuration is file-based YAML. No mandatory database. GitOps-friendly by design.',
  },
  {
    id: 'i3',
    icon: Bell,
    title: 'Alerts',
    content:
      'Active alerts are surfaced directly from Prometheus via the planner snapshot. CRIT/WARN states propagate to parent elements.',
  },
  {
    id: 'i4',
    icon: User,
    title: 'Plugin System',
    content:
      'Plugins like Slurm and Simulator extend the core without modifying it. Each plugin registers its own API routes and menu sections.',
  },
];

export const AccordionPage = () => {
  usePageTitle('Accordion');
  const [open1, setOpen1] = useState<string | null>('a1');
  const [open2, setOpen2] = useState<string[]>(['a1', 'a3']);
  const [openIcons, setOpenIcons] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accordion"
        description="Collapsible content sections"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Accordion' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Basic Accordion" desc="Only one item open at a time">
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {items.map(({ id, title, content }) => {
              const isOpen = open1 === id;
              return (
                <div key={id}>
                  <button
                    onClick={() => setOpen1(isOpen ? null : id)}
                    className={`flex w-full items-center justify-between px-4 py-4 text-left text-sm font-medium transition-colors ${isOpen ? 'text-brand-500' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {title}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'text-brand-500 rotate-180' : 'text-gray-400'}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                      {content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="Always Open" desc="Multiple items can be open simultaneously">
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {items.map(({ id, title, content }) => {
              const isOpen = open2.includes(id);
              return (
                <div key={id}>
                  <button
                    onClick={() =>
                      setOpen2(isOpen ? open2.filter((i) => i !== id) : [...open2, id])
                    }
                    className={`flex w-full items-center justify-between px-4 py-4 text-left text-sm font-medium transition-colors ${isOpen ? 'text-brand-500' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {title}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'text-brand-500 rotate-180' : 'text-gray-400'}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                      {content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="With Icons" desc="Each item has a colored leading icon">
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {iconsItems.map(({ id, icon: Icon, title, content }) => {
              const isOpen = openIcons === id;
              return (
                <div key={id}>
                  <button
                    onClick={() => setOpenIcons(isOpen ? null : id)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-medium text-gray-700 transition-colors dark:text-gray-300"
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${isOpen ? 'text-brand-500' : 'text-gray-400'}`}
                    />
                    <span className={`flex-1 ${isOpen ? 'text-brand-500' : ''}`}>{title}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pl-12 text-sm text-gray-600 dark:text-gray-400">
                      {content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="Flush Style" desc="No outer border, only internal dividers">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.slice(0, 3).map(({ id, title, content }) => {
              const isOpen = open1 === id;
              return (
                <div key={id}>
                  <button
                    onClick={() => setOpen1(isOpen ? null : id)}
                    className={`flex w-full items-center justify-between py-4 text-left text-sm font-medium transition-colors ${isOpen ? 'text-brand-500' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {title}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'text-brand-500 rotate-180' : 'text-gray-400'}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-4 text-sm text-gray-600 dark:text-gray-400">{content}</div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
