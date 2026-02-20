import { useState, useRef, useEffect } from 'react';

const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

type Pos = 'top' | 'right' | 'bottom' | 'left';
type Trigger = 'default' | 'button' | 'link';

const posMap: Record<Pos, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
};

const Pop = ({ pos, trigger }: { pos: Pos; trigger: Trigger }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger === 'button' ? (
        <button onClick={() => setOpen(!open)} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">{pos}</button>
      ) : trigger === 'link' ? (
        <button onClick={() => setOpen(!open)} className="text-sm font-medium text-brand-500 hover:text-brand-600 hover:underline">{pos}</button>
      ) : (
        <button onClick={() => setOpen(!open)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">{pos}</button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 ${posMap[pos]}`}>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Popover Title</h4>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Lorem ipsum dolor sit amet, consectetur adipiscing elit vestibulum.</p>
            <a href="#" className="mt-2 block text-xs font-medium text-brand-500 hover:text-brand-600">Learn more →</a>
          </div>
        </>
      )}
    </div>
  );
};

export const PopoversPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Popovers</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Rich contextual overlays with click triggers</p>
    </div>
    <div className="grid gap-6">
      {(['default', 'button', 'link'] as Trigger[]).map((trigger) => (
        <SectionCard key={trigger} title={`Popover with ${trigger === 'default' ? 'Default Button' : trigger === 'button' ? 'Primary Button' : 'Link'}`} desc={`Click triggers in ${trigger} style — 4 positions`}>
          <div className="flex flex-wrap items-center gap-8 py-2">
            {(['top', 'right', 'bottom', 'left'] as Pos[]).map((pos) => (
              <Pop key={pos} pos={pos} trigger={trigger} />
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  </div>
);
