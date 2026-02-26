import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Save,
  Check,
  AlertCircle,
  Loader2,
  Settings2,
  Activity,
  Cpu,
  Shield,
  Layers,
  MonitorPlay,
} from 'lucide-react';
import { useSettingsConfig } from '../../../components/settings/useSettingsConfig';
import { useAppConfigSafe } from '../../contexts/AppConfigContext';
import { AppSettingsSection } from '../../../components/settings/sections/AppSettingsSection';
import { TelemetrySettingsSection } from '../../../components/settings/sections/TelemetrySettingsSection';
import { PlannerSettingsSection } from '../../../components/settings/sections/PlannerSettingsSection';
import { PluginsSettingsSection } from '../../../components/settings/sections/PluginsSettingsSection';
import { SecuritySettingsSection } from '../../../components/settings/sections/SecuritySettingsSection';
import { ViewsSettingsSection } from '../../../components/settings/sections/ViewsSettingsSection';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';

type TabId = 'general' | 'telemetry' | 'planner' | 'views' | 'security' | 'plugins';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general',   label: 'General',   icon: Settings2  },
  { id: 'telemetry', label: 'Telemetry', icon: Activity   },
  { id: 'planner',   label: 'Planner',   icon: Cpu        },
  { id: 'views',     label: 'Views',     icon: MonitorPlay },
  { id: 'security',  label: 'Security',  icon: Shield     },
  { id: 'plugins',   label: 'Plugins',   icon: Layers     },
];

const TAB_IDS = TABS.map((t) => t.id);

export const CosmosSettingsPage = () => {
  usePageTitle('Settings');
  const { draft, setDraft, loading, saving, saved, saveConfig } = useSettingsConfig();
  const { refresh: refreshAppConfig } = useAppConfigSafe();
  const location = useLocation();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState(false);

  // Derive active tab from URL hash
  const hashTab = location.hash.replace('#', '') as TabId;
  const activeTab: TabId = TAB_IDS.includes(hashTab) ? hashTab : 'general';

  const handleTabChange = (tabId: TabId) => {
    navigate(`${location.pathname}#${tabId}`, { replace: true });
  };

  useEffect(() => {
    if (!location.hash) navigate(`${location.pathname}#general`, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  const handleSave = async () => {
    setSaveError(false);
    try {
      await saveConfig();
      // Immediately refresh the app config context so sidebar/features update
      // without waiting for the full page reload
      void refreshAppConfig();
    } catch {
      setSaveError(true);
    }
  };

  // Save button state
  const saveBtn = saving
    ? { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: 'Saving…', cls: 'bg-brand-500 text-white opacity-70' }
    : saved
      ? { icon: <Check className="h-4 w-4" />, label: 'Saved', cls: 'bg-green-500 text-white' }
      : saveError
        ? { icon: <AlertCircle className="h-4 w-4" />, label: 'Error', cls: 'bg-red-500 text-white' }
        : { icon: <Save className="h-4 w-4" />, label: 'Save Changes', cls: 'bg-brand-500 hover:bg-brand-600 text-white' };

  if (loading || !draft) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-brand-500 h-5 w-5 animate-spin" />
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading configuration…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[800px] space-y-6">
      {/* Header */}
      <PageHeader
        title="Settings"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'Settings' },
            ]}
          />
        }
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed ${saveBtn.cls}`}
          >
            {saveBtn.icon}
            {saveBtn.label}
          </button>
        }
      />

      {/* Card with tabs */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

        {/* Underline with Icons tabs — exact style from /cosmos/ui/tabs */}
        <div className="border-b border-gray-200 px-6 dark:border-gray-800">
          <div className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'general'   && <AppSettingsSection    draft={draft} setDraft={setDraft} />}
          {activeTab === 'telemetry' && <TelemetrySettingsSection draft={draft} setDraft={setDraft} />}
          {activeTab === 'planner'   && <PlannerSettingsSection  draft={draft} setDraft={setDraft} />}
          {activeTab === 'views'     && <ViewsSettingsSection    draft={draft} setDraft={setDraft} />}
          {activeTab === 'security'  && <SecuritySettingsSection  draft={draft} setDraft={setDraft} />}
          {activeTab === 'plugins'   && <PluginsSettingsSection   draft={draft} setDraft={setDraft} />}
        </div>
      </div>

      {/* Status banners */}
      {saved && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 dark:border-green-500/20 dark:bg-green-500/10">
          <Check className="h-4 w-4 shrink-0 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Configuration saved. Backend is restarting to apply changes…
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
