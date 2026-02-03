import React from 'react';
import { Save, Check } from 'lucide-react';

interface SettingsLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  activeTab,
  onTabChange,
  onSave,
  saving,
  saved,
  children,
}) => {
  const tabs = [
    { id: 'app', label: 'Application' },
    { id: 'telemetry', label: 'Telemetry' },
    { id: 'planner', label: 'Planner' },
    { id: 'plugins', label: 'Plugins' },
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-base)] p-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Settings</h1>
          <p className="mt-1 font-mono text-xs tracking-wider text-gray-500 uppercase">
            Application Configuration
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={saving || saved}
          className={`flex items-center gap-2 rounded-lg px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider transition ${
            saved
              ? 'bg-green-600 text-white'
              : saving
                ? 'bg-gray-700 text-gray-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-8">
        {children}
      </div>
    </div>
  );
};
