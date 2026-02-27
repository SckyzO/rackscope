import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  X,
  Palette,
} from 'lucide-react';
import { useSettingsConfig } from '../../../components/settings/useSettingsConfig';
import { useAppConfigSafe } from '../../contexts/AppConfigContext';
import { AppSettingsSection } from '../../../components/settings/sections/AppSettingsSection';
import { AppearanceSettingsSection } from '../../components/settings/AppearanceSettingsSection';
import { TelemetrySettingsSection } from '../../../components/settings/sections/TelemetrySettingsSection';
import { PlannerSettingsSection } from '../../../components/settings/sections/PlannerSettingsSection';
import { PluginsSettingsSection } from '../../../components/settings/sections/PluginsSettingsSection';
import { SecuritySettingsSection } from '../../../components/settings/sections/SecuritySettingsSection';
import { ViewsSettingsSection } from '../../../components/settings/sections/ViewsSettingsSection';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';

type TabId = 'general' | 'telemetry' | 'planner' | 'views' | 'security' | 'plugins' | 'appearance';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general',    label: 'General',    icon: Settings2  },
  { id: 'appearance', label: 'Appearance', icon: Palette    },
  { id: 'telemetry',  label: 'Telemetry',  icon: Activity   },
  { id: 'planner',    label: 'Planner',    icon: Cpu        },
  { id: 'views',      label: 'Views',      icon: MonitorPlay },
  { id: 'security',   label: 'Security',   icon: Shield     },
  { id: 'plugins',    label: 'Plugins',    icon: Layers     },
];

const TAB_IDS = TABS.map((t) => t.id);

// ── Unsaved Changes Modal ──────────────────────────────────────────────────────

const UnsavedModal = ({
  onSave,
  onDiscard,
  onStay,
  saving,
  message,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
  saving: boolean;
  message?: string;
}) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start gap-4 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">Unsaved changes</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {message ?? 'You have unsaved changes. What would you like to do?'}
          </p>
        </div>
        <button onClick={onStay} className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-nowrap items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
        <button onClick={onStay} className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          Stay
        </button>
        <button onClick={onDiscard} className="shrink-0 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700/40 dark:text-red-400 dark:hover:bg-red-500/10">
          Discard
        </button>
        <button onClick={onSave} disabled={saving} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-70">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save &amp; go
        </button>
      </div>
    </div>
  </div>
);

// ── Page ───────────────────────────────────────────────────────────────────────

export const CosmosSettingsPage = () => {
  usePageTitle('Settings');
  const { draft, setDraft, loading, saving, saved, isDirty, saveConfig } = useSettingsConfig();
  const { refresh: refreshAppConfig } = useAppConfigSafe();
  const location = useLocation();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState(false);

  // ── Tab guard ─────────────────────────────────────────────────────────────
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const showTabModal = pendingTab !== null;

  // ── In-app navigation guard (history.pushState interception) ─────────────
  const [showNavModal, setShowNavModal] = useState(false);
  const pendingNavUrl = useRef<string | null>(null);
  const origPushState = useRef<typeof window.history.pushState | null>(null);

  useEffect(() => {
    if (!isDirty) {
      // Restore if we had previously intercepted
      if (origPushState.current) {
        window.history.pushState = origPushState.current;
        origPushState.current = null;
      }
      return;
    }

    const orig = window.history.pushState.bind(window.history);
    origPushState.current = orig;

    window.history.pushState = (state, unused, url) => {
      const newUrl = String(url ?? '');
      const currentPath = location.pathname;
      const newPath = newUrl.startsWith('/') ? newUrl.split('#')[0] : currentPath;

      // Allow hash-only changes (tab switching within settings page)
      if (newPath === currentPath) {
        orig(state, unused, url);
        return;
      }

      // Navigation to a different page — intercept
      pendingNavUrl.current = newUrl;
      setShowNavModal(true);
    };

    return () => {
      if (origPushState.current) {
        window.history.pushState = origPushState.current;
        origPushState.current = null;
      }
    };
  }, [isDirty, location.pathname]);

  // ── Browser-level guard (close tab / reload) ──────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Derive active tab from URL hash
  const hashTab = location.hash.replace('#', '') as TabId;
  const activeTab: TabId = TAB_IDS.includes(hashTab) ? hashTab : 'general';

  const handleTabChange = (tabId: TabId) => {
    if (isDirty && tabId !== activeTab) {
      setPendingTab(tabId);
      return;
    }
    navigate(`${location.pathname}#${tabId}`, { replace: true });
  };

  useEffect(() => {
    if (!location.hash) navigate(`${location.pathname}#general`, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  const handleSave = async () => {
    setSaveError(false);
    try {
      await saveConfig();
      void refreshAppConfig();
    } catch {
      setSaveError(true);
    }
  };

  // ── Tab modal actions ──────────────────────────────────────────────────────
  const tabModalSaveAndGo = async () => {
    await handleSave();
    if (pendingTab) navigate(`${location.pathname}#${pendingTab}`, { replace: true });
    setPendingTab(null);
  };
  const tabModalDiscard = () => {
    if (pendingTab) navigate(`${location.pathname}#${pendingTab}`, { replace: true });
    setPendingTab(null);
  };
  const tabModalStay = () => setPendingTab(null);

  // ── Nav modal actions (leaving settings page entirely) ─────────────────────
  const navModalSaveAndGo = async () => {
    const url = pendingNavUrl.current;
    pendingNavUrl.current = null;
    setShowNavModal(false);
    // Restore original pushState before navigating
    if (origPushState.current) {
      window.history.pushState = origPushState.current;
      origPushState.current = null;
    }
    await handleSave();
    if (url) navigate(url);
  };
  const navModalDiscard = () => {
    const url = pendingNavUrl.current;
    pendingNavUrl.current = null;
    setShowNavModal(false);
    if (origPushState.current) {
      window.history.pushState = origPushState.current;
      origPushState.current = null;
    }
    if (url) navigate(url);
  };
  const navModalStay = () => {
    pendingNavUrl.current = null;
    setShowNavModal(false);
  };

  // Save button state
  const saveBtn = saving
    ? { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: 'Saving…', cls: 'bg-brand-500 text-white opacity-70' }
    : saved
      ? { icon: <Check className="h-4 w-4" />, label: 'Saved', cls: 'bg-green-500 text-white' }
      : saveError
        ? { icon: <AlertCircle className="h-4 w-4" />, label: 'Error', cls: 'bg-red-500 text-white' }
        : isDirty
          ? { icon: <Save className="h-4 w-4" />, label: 'Save Changes', cls: 'bg-brand-500 hover:bg-brand-600 text-white animate-pulse' }
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
    <>
      {/* ── Unsaved changes modal (tab switch) ──────────────────────────── */}
      {showTabModal && (
        <UnsavedModal
          onSave={tabModalSaveAndGo}
          onDiscard={tabModalDiscard}
          onStay={tabModalStay}
          saving={saving}
        />
      )}

      {/* ── Unsaved changes modal (leaving settings page) ───────────────── */}
      {showNavModal && (
        <UnsavedModal
          onSave={navModalSaveAndGo}
          onDiscard={navModalDiscard}
          onStay={navModalStay}
          saving={saving}
          message="You have unsaved settings changes. Save before leaving?"
        />
      )}

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
            <div className="flex items-center gap-3">
              {isDirty && !saving && !saved && (
                <span className="text-xs text-amber-500 dark:text-amber-400">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed ${saveBtn.cls}`}
              >
                {saveBtn.icon}
                {saveBtn.label}
              </button>
            </div>
          }
        />

        {/* Card with tabs */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

          {/* Tabs — scrollable on narrow screens */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex w-full">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-medium transition-colors ${
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
            {activeTab === 'general'    && <AppSettingsSection    draft={draft} setDraft={setDraft} />}
            {activeTab === 'appearance' && <AppearanceSettingsSection />}
            {activeTab === 'telemetry'  && <TelemetrySettingsSection draft={draft} setDraft={setDraft} />}
            {activeTab === 'planner'    && <PlannerSettingsSection  draft={draft} setDraft={setDraft} />}
            {activeTab === 'views'      && <ViewsSettingsSection    draft={draft} setDraft={setDraft} />}
            {activeTab === 'security'   && <SecuritySettingsSection  draft={draft} setDraft={setDraft} />}
            {activeTab === 'plugins'    && <PluginsSettingsSection   draft={draft} setDraft={setDraft} />}
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
    </>
  );
};
