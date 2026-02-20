import { useState } from 'react';
import { X } from 'lucide-react';

const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5"><h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}</div>
    {children}
  </div>
);

type DrawerType = 'right' | 'left' | 'bottom' | 'form' | null;

const Overlay = ({ onClick }: { onClick: () => void }) => (
  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClick} />
);

export const DrawerPage = () => {
  const [open, setOpen] = useState<DrawerType>(null);

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Drawer / Sheet</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Slide-in panel components for contextual content</p></div>

      {/* Right Drawer */}
      {open === 'right' && (
        <>
          <Overlay onClick={() => setOpen(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col bg-white shadow-theme-xl dark:bg-gray-dark">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Right Drawer</h3>
              <button onClick={() => setOpen(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">This is the right drawer content. Use this for contextual details, filters, or secondary actions.</p>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <button onClick={() => setOpen(null)} className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600">Apply</button>
            </div>
          </div>
        </>
      )}

      {/* Left Drawer */}
      {open === 'left' && (
        <>
          <Overlay onClick={() => setOpen(null)} />
          <div className="fixed left-0 top-0 z-50 flex h-full w-80 flex-col bg-white shadow-theme-xl dark:bg-gray-dark">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Left Drawer</h3>
              <button onClick={() => setOpen(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 p-5"><p className="text-sm text-gray-600 dark:text-gray-400">Left drawer — ideal for navigation menus or secondary sidebars.</p></div>
          </div>
        </>
      )}

      {/* Bottom Sheet */}
      {open === 'bottom' && (
        <>
          <Overlay onClick={() => setOpen(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-theme-xl dark:bg-gray-dark">
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bottom Sheet</h3>
              <button onClick={() => setOpen(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5"><p className="text-sm text-gray-600 dark:text-gray-400">Bottom sheet — common on mobile for action sheets and pickers.</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {['Share', 'Copy', 'Edit', 'Delete', 'Archive', 'Export'].map((a) => (
                  <button key={a} onClick={() => setOpen(null)} className="rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">{a}</button>
                ))}
              </div>
            </div>
            <div className="h-8" />
          </div>
        </>
      )}

      {/* Form Drawer */}
      {open === 'form' && (
        <>
          <Overlay onClick={() => setOpen(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col bg-white shadow-theme-xl dark:bg-gray-dark">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Device</h3>
              <button onClick={() => setOpen(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <form className="space-y-4">
                {[{ l: 'Device Name', p: 'e.g. r01-01-c01' }, { l: 'Template ID', p: 'e.g. bs-xh3140-trio-1u' }, { l: 'U Position', p: '1' }].map(({ l, p }) => (
                  <div key={l}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{l}</label>
                    <input type="text" placeholder={p} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                  </div>
                ))}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Instance Pattern</label>
                  <input type="text" placeholder="e.g. compute[001-004]" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              </form>
            </div>
            <div className="flex gap-3 border-t border-gray-200 p-5 dark:border-gray-800">
              <button onClick={() => setOpen(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={() => setOpen(null)} className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600">Save Changes</button>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { type: 'right' as DrawerType, label: 'Open Right Drawer', desc: 'Slides in from the right edge' },
          { type: 'left' as DrawerType, label: 'Open Left Drawer', desc: 'Slides in from the left edge' },
          { type: 'bottom' as DrawerType, label: 'Open Bottom Sheet', desc: 'Slides up from the bottom' },
          { type: 'form' as DrawerType, label: 'Open Form Drawer', desc: 'Right drawer with a device edit form' },
        ].map(({ type, label, desc }) => (
          <SectionCard key={type!} title={label.replace('Open ', '')} desc={desc}>
            <button onClick={() => setOpen(type)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">{label}</button>
          </SectionCard>
        ))}
      </div>
    </div>
  );
};
