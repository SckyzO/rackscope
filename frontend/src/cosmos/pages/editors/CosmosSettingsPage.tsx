import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Save, Check, AlertCircle, Loader2, Settings } from 'lucide-react';
import { useSettingsConfig } from '../../../components/settings/useSettingsConfig';
import { AppSettingsSection } from '../../../components/settings/sections/AppSettingsSection';
import { TelemetrySettingsSection } from '../../../components/settings/sections/TelemetrySettingsSection';
import { PlannerSettingsSection } from '../../../components/settings/sections/PlannerSettingsSection';
import { PluginsSettingsSection } from '../../../components/settings/sections/PluginsSettingsSection';

type TabId = 'general' | 'telemetry' | 'planner' | 'plugins';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'planner', label: 'Planner' },
  { id: 'plugins', label: 'Plugins' },
];

const TAB_IDS = TABS.map((t) => t.id);

export const CosmosSettingsPage: React.FC = () => {
  const { draft, setDraft, loading, saving, saved, saveConfig } = useSettingsConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState(false);

  // Derive active tab from URL hash
  const hashTab = location.hash.replace('#', '') as TabId;
  const activeTab: TabId = TAB_IDS.includes(hashTab) ? hashTab : 'general';

  const handleTabChange = (tabId: TabId) => {
    navigate(`${location.pathname}#${tabId}`, { replace: true });
  };

  // Set hash to 'general' on first mount if no hash
  useEffect(() => {
    if (!location.hash) navigate(`${location.pathname}#general`, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  const handleSave = async () => {
    setSaveError(false);
    try {
      await saveConfig();
    } catch {
      setSaveError(true);
    }
  };

  const getSaveButtonContent = () => {
    if (saving) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      );
    }
    if (saved) {
      return (
        <>
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </>
      );
    }
    if (saveError) {
      return (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Error</span>
        </>
      );
    }
    return (
      <>
        <Save className="h-4 w-4" />
        <span>Save Changes</span>
      </>
    );
  };

  const getSaveButtonStyle = () => {
    if (saved) return 'bg-green-500 hover:bg-green-600 text-white';
    if (saveError) return 'bg-red-500 hover:bg-red-600 text-white';
    return 'bg-brand-500 hover:bg-brand-600 text-white';
  };

  if (loading || !draft) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="text-brand-500 h-5 w-5 animate-spin" />
          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
            Loading configuration...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-50 dark:bg-brand-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Settings className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Application configuration and integrations
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${getSaveButtonStyle()}`}
        >
          {getSaveButtonContent()}
        </button>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Tab bar */}
        <div className="border-b border-gray-200 px-6 dark:border-gray-800">
          <nav className="flex gap-1" aria-label="Settings tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative px-4 py-3.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-brand-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="bg-brand-500 absolute right-4 bottom-0 left-4 h-0.5 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'general' && <AppSettingsSection draft={draft} setDraft={setDraft} />}
          {activeTab === 'telemetry' && (
            <TelemetrySettingsSection draft={draft} setDraft={setDraft} />
          )}
          {activeTab === 'planner' && <PlannerSettingsSection draft={draft} setDraft={setDraft} />}
          {activeTab === 'plugins' && <PluginsSettingsSection draft={draft} setDraft={setDraft} />}
        </div>
      </div>

      {/* Save confirmation banner */}
      {saved && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 dark:border-green-500/20 dark:bg-green-500/10">
          <Check className="h-4 w-4 shrink-0 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Configuration saved. Backend is restarting to apply changes...
          </p>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Failed to save configuration. Please check your settings and try again.
          </p>
        </div>
      )}
    </div>
  );
};
