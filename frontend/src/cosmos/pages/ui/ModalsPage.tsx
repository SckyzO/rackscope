import { useState } from 'react';
import { X, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

export const ModalsPage = () => {
  const [open, setOpen] = useState<string | null>(null);
  const close = () => setOpen(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modals</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Dialog and overlay components for focused interactions</p>
      </div>

      {/* Default Modal */}
      {open === 'default' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
            <button onClick={close} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Modal Title</h3>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={close} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Close</button>
              <button onClick={close} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Modal */}
      {open === 'centered' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-theme-xl dark:bg-gray-900">
            <button onClick={close} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
              <CheckCircle className="h-8 w-8 text-success-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">All Done!</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Your action has been completed successfully.</p>
            <button onClick={close} className="mt-6 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Okay, Got It!</button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {open === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
            <button onClick={close} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h3>
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">First Name</label><input type="text" defaultValue="John" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Last Name</label><input type="text" defaultValue="Doe" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Email</label><input type="email" defaultValue="john@example.com" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Bio</label><textarea rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Tell us about yourself..." /></div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={close} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={close} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modals */}
      {['success', 'info', 'warning', 'danger'].map((type) => open === `alert-${type}` && (
        <div key={type} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-theme-xl dark:bg-gray-900">
            <button onClick={close} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              type === 'success' ? 'bg-success-50 dark:bg-success-500/10' :
              type === 'info' ? 'bg-brand-50 dark:bg-brand-500/10' :
              type === 'warning' ? 'bg-warning-50 dark:bg-warning-500/10' :
              'bg-error-50 dark:bg-error-500/10'
            }`}>
              {type === 'success' ? <CheckCircle className="h-7 w-7 text-success-500" /> :
               type === 'info' ? <Info className="h-7 w-7 text-brand-500" /> :
               type === 'warning' ? <AlertTriangle className="h-7 w-7 text-warning-500" /> :
               <XCircle className="h-7 w-7 text-error-500" />}
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white capitalize">{type === 'success' ? 'Well Done!' : type === 'info' ? 'Information' : type === 'warning' ? 'Warning Alert!' : 'Danger Alert!'}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Lorem ipsum dolor sit amet consectetur.</p>
            <button onClick={close} className={`mt-5 w-full rounded-lg py-2.5 text-sm font-medium text-white ${
              type === 'success' ? 'bg-success-500 hover:bg-success-600' :
              type === 'info' ? 'bg-brand-500 hover:bg-brand-600' :
              type === 'warning' ? 'bg-warning-500 hover:bg-warning-600' :
              'bg-error-500 hover:bg-error-600'
            }`}>Okay, Got It!</button>
          </div>
        </div>
      ))}

      {/* Full Screen Modal */}
      {open === 'fullscreen' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-dark">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Full Screen Modal</h3>
              <button onClick={close} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 p-6">
              <p className="text-gray-500 dark:text-gray-400">This is a full-screen modal. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-5 dark:border-gray-800">
              <button onClick={close} className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Close</button>
              <button onClick={close} className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Default Modal" desc="Standard header, body, and footer">
          <button onClick={() => setOpen('default')} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Open Modal</button>
        </SectionCard>
        <SectionCard title="Centered Modal" desc="Success confirmation dialog">
          <button onClick={() => setOpen('centered')} className="rounded-lg bg-success-500 px-4 py-2 text-sm font-medium text-white hover:bg-success-600">Open Centered</button>
        </SectionCard>
        <SectionCard title="Form Modal" desc="Modal with form inputs">
          <button onClick={() => setOpen('form')} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Open Form</button>
        </SectionCard>
        <SectionCard title="Full Screen Modal" desc="Takes up the entire viewport">
          <button onClick={() => setOpen('fullscreen')} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Open Full Screen</button>
        </SectionCard>
        <SectionCard title="Alert Modals" desc="Success, info, warning, and danger alerts">
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'success', label: 'Success', cls: 'bg-success-500 hover:bg-success-600' },
              { type: 'info', label: 'Info', cls: 'bg-brand-500 hover:bg-brand-600' },
              { type: 'warning', label: 'Warning', cls: 'bg-warning-500 hover:bg-warning-600' },
              { type: 'danger', label: 'Danger', cls: 'bg-error-500 hover:bg-error-600' },
            ].map(({ type, label, cls }) => (
              <button key={type} onClick={() => setOpen(`alert-${type}`)} className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${cls}`}>{label}</button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
