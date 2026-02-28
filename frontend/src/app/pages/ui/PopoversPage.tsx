import { useState, useRef, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Twitter, Github } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

type Pos = 'top' | 'right' | 'bottom' | 'left';
type Trigger = 'default' | 'button' | 'link';

const posMap: Record<Pos, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
  right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
  left: 'right-full top-1/2 -translate-y-1/2 mr-3',
};

// Rich popover panel — profile card style like TailAdmin
const PopoverContent = () => (
  <div className="w-72">
    {/* Cover */}
    <div className="from-brand-500 to-brand-700 h-14 rounded-t-xl bg-gradient-to-r" />
    {/* Avatar */}
    <div className="-mt-7 px-4">
      <div className="bg-brand-500 flex h-14 w-14 items-center justify-center rounded-xl border-4 border-white text-base font-bold text-white dark:border-gray-900">
        JD
      </div>
    </div>
    {/* Info */}
    <div className="px-4 pt-2 pb-4">
      <h4 className="text-sm font-bold text-gray-900 dark:text-white">John Doe</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">Senior Software Engineer</p>
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="h-3 w-3" /> San Francisco, CA
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <LinkIcon className="h-3 w-3" /> johndoe.dev
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        {[
          { label: 'Posts', value: '48' },
          { label: 'Followers', value: '12K' },
          { label: 'Reviews', value: '4.9' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="bg-brand-500 hover:bg-brand-600 flex-1 rounded-lg py-1.5 text-xs font-medium text-white">
          Follow
        </button>
        <a
          href="#"
          className="hover:text-brand-500 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
          <Twitter className="h-3.5 w-3.5" />
        </a>
        <a
          href="#"
          className="hover:text-brand-500 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
          <Github className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  </div>
);

const Pop = ({ pos, trigger }: { pos: Pos; trigger: Trigger }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const label = pos.charAt(0).toUpperCase() + pos.slice(1);

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger === 'button' ? (
        <button
          onClick={() => setOpen(!open)}
          className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          {label}
        </button>
      ) : trigger === 'link' ? (
        <button
          onClick={() => setOpen(!open)}
          className="text-brand-500 hover:text-brand-600 text-sm font-medium hover:underline"
        >
          {label}
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
        >
          {label}
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`shadow-theme-xl absolute z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${posMap[pos]}`}
          >
            <PopoverContent />
          </div>
        </>
      )}
    </div>
  );
};

export const PopoversPage = () => {
  usePageTitle('Popovers');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Popovers"
        description="Rich contextual overlays with profile card content"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Popovers' },
            ]}
          />
        }
      />
      <div className="grid gap-6">
        <SectionCard
          title="Default Popover"
          desc="Click any button to reveal the profile card — 4 positions"
        >
          <div className="flex flex-wrap items-center gap-6 py-4">
            {(['top', 'right', 'bottom', 'left'] as Pos[]).map((pos) => (
              <Pop key={pos} pos={pos} trigger="default" />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Popover with Button" desc="Primary brand button triggers">
          <div className="flex flex-wrap items-center gap-6 py-4">
            {(['top', 'right', 'bottom', 'left'] as Pos[]).map((pos) => (
              <Pop key={pos} pos={pos} trigger="button" />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Popover with Link" desc="Text link triggers">
          <div className="flex flex-wrap items-center gap-6 py-4">
            {(['top', 'right', 'bottom', 'left'] as Pos[]).map((pos) => (
              <Pop key={pos} pos={pos} trigger="link" />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
