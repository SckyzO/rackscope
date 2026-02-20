import { useState } from 'react';
import {
  ChevronDown,
  Pencil,
  Settings,
  HelpCircle,
  LogOut,
  Archive,
  Trash2,
  Copy,
} from 'lucide-react';

const SectionCard = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

const Menu = ({ children }: { children: React.ReactNode }) => (
  <div className="shadow-theme-lg absolute top-full left-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 dark:border-gray-800 dark:bg-gray-900">
    {children}
  </div>
);

const Item = ({
  icon: Icon,
  label,
  danger = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  danger?: boolean;
}) => (
  <button
    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${danger ? 'text-error-500' : 'text-gray-700 dark:text-gray-300'}`}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {label}
  </button>
);

const Divider = () => <hr className="my-1 border-gray-100 dark:border-gray-800" />;

export const DropdownsPage = () => {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dropdowns</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Contextual menus for actions and options
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Default Dropdown" desc="Basic list of actions">
          <div className="relative inline-block">
            <button
              onClick={() => toggle('d1')}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Account Menu <ChevronDown className="h-4 w-4" />
            </button>
            {open === 'd1' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
                <Menu>
                  <Item label="Edit Profile" />
                  <Item label="Account Settings" />
                  <Item label="License" />
                  <Item label="Support" />
                </Menu>
              </>
            )}
          </div>
        </SectionCard>
        <SectionCard title="With Divider" desc="Items grouped by dividers">
          <div className="relative inline-block">
            <button
              onClick={() => toggle('d2')}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Options <ChevronDown className="h-4 w-4" />
            </button>
            {open === 'd2' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
                <Menu>
                  <Item label="Edit" />
                  <Item icon={Copy} label="Duplicate" />
                  <Divider />
                  <Item icon={Archive} label="Archive" />
                  <Item label="Move" />
                  <Divider />
                  <Item icon={Trash2} label="Delete" danger />
                </Menu>
              </>
            )}
          </div>
        </SectionCard>
        <SectionCard title="With Icons" desc="Menu items with leading icons">
          <div className="relative inline-block">
            <button
              onClick={() => toggle('d3')}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            >
              Account Menu <ChevronDown className="h-4 w-4" />
            </button>
            {open === 'd3' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
                <Menu>
                  <Item icon={Pencil} label="Edit Profile" />
                  <Item icon={Settings} label="Settings" />
                  <Item icon={HelpCircle} label="Support" />
                  <Divider />
                  <Item icon={LogOut} label="Sign Out" danger />
                </Menu>
              </>
            )}
          </div>
        </SectionCard>
        <SectionCard
          title="With Icons and Dividers"
          desc="Full-featured dropdown with icons and grouping"
        >
          <div className="relative inline-block">
            <button
              onClick={() => toggle('d4')}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Options <ChevronDown className="h-4 w-4" />
            </button>
            {open === 'd4' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
                <Menu>
                  <Item icon={Pencil} label="Edit Profile" />
                  <Item icon={Settings} label="Settings" />
                  <Divider />
                  <Item icon={Copy} label="Duplicate" />
                  <Item icon={Archive} label="Archive" />
                  <Divider />
                  <Item icon={Trash2} label="Delete" danger />
                </Menu>
              </>
            )}
          </div>
        </SectionCard>
        <SectionCard title="Positions" desc="Dropdown in different directions">
          <div className="flex flex-wrap gap-3">
            {['Left', 'Center', 'Right'].map((pos) => (
              <div key={pos} className="relative inline-block">
                <button
                  onClick={() => toggle(`pos-${pos}`)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {pos} <ChevronDown className="h-4 w-4" />
                </button>
                {open === `pos-${pos}` && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
                    <div
                      className={`shadow-theme-lg absolute top-full z-50 mt-2 w-40 rounded-xl border border-gray-200 bg-white py-1 dark:border-gray-800 dark:bg-gray-900 ${pos === 'Right' ? 'right-0' : pos === 'Center' ? 'left-1/2 -translate-x-1/2' : 'left-0'}`}
                    >
                      <Item label="Action 1" />
                      <Item label="Action 2" />
                      <Item label="Action 3" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Select Dropdown" desc="Dropdown with selected state">
          <div className="relative inline-block">
            <button
              onClick={() => toggle('sel')}
              className="flex w-48 items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <span>Select option...</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {open === 'sel' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />
                <div className="shadow-theme-lg absolute top-full left-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 dark:border-gray-800 dark:bg-gray-900">
                  {['Option 1', 'Option 2', 'Option 3', 'Option 4'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setOpen(null)}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
