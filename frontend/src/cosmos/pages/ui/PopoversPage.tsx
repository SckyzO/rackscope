import { useState, useRef, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Twitter, Github } from 'lucide-react';

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
    <div className="h-14 rounded-t-xl bg-gradient-to-r from-brand-500 to-brand-700" />
    {/* Avatar */}
    <div className="-mt-7 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border-4 border-white bg-brand-500 text-base font-bold text-white dark:border-gray-900">
        JD
      </div>
    </div>
    {/* Info */}
    <div className="px-4 pb-4 pt-2">
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
        {[{ label: 'Posts', value: '48' }, { label: 'Followers', value: '12K' }, { label: 'Reviews', value: '4.9' }].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-medium text-white hover:bg-brand-600">Follow</button>
        <a href="#" className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"><Twitter className="h-3.5 w-3.5" /></a>
        <a href="#" className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"><Github className="h-3.5 w-3.5" /></a>
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
        <button onClick={() => setOpen(!open)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          {label}
        </button>
      ) : trigger === 'link' ? (
        <button onClick={() => setOpen(!open)} className="text-sm font-medium text-brand-500 hover:text-brand-600 hover:underline">
          {label}
        </button>
      ) : (
        <button onClick={() => setOpen(!open)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5">
          {label}
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900 ${posMap[pos]}`}>
            <PopoverContent />
          </div>
        </>
      )}
    </div>
  );
};

const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

export const PopoversPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Popovers</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Rich contextual overlays with profile card content</p>
    </div>
    <div className="grid gap-6">
      <SectionCard title="Default Popover" desc="Click any button to reveal the profile card — 4 positions">
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
