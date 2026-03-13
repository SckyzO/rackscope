import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Settings2,
  Activity,
  Cpu,
  Shield,
  Layers,
  MonitorPlay,
  Palette,
  Bell,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useSettingsConfig } from '@src/components/settings/useSettingsConfig';
import { useAppConfigSafe } from '@app/contexts/AppConfigContext';
import { ConfirmationModal } from '@app/components/layout/ConfirmationModal';
import { StatefulSaveButton, type SaveState } from '@app/components/ui/StatefulSaveButton';
import { AppSettingsSection } from '@src/components/settings/sections/AppSettingsSection';
import { AppearanceSettingsSection } from '@app/components/settings/AppearanceSettingsSection';
import { TelemetrySettingsSection } from '@src/components/settings/sections/TelemetrySettingsSection';
import { PlannerSettingsSection } from '@src/components/settings/sections/PlannerSettingsSection';
import { PluginsSettingsSection } from '@src/components/settings/sections/PluginsSettingsSection';
import { SecuritySettingsSection } from '@src/components/settings/sections/SecuritySettingsSection';
import { ViewsSettingsSection } from '@src/components/settings/sections/ViewsSettingsSection';
import { TooltipSettingsSection } from '@src/components/settings/sections/TooltipSettingsSection';
import { NotificationsSettingsSection } from './NotificationsSettingsSection';
import { SeverityLabelsSettingsSection } from './SeverityLabelsSettingsSection';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';

type TabId =
  | 'general'
  | 'telemetry'
  | 'planner'
  | 'views'
  | 'security'
  | 'plugins'
  | 'appearance'
  | 'notifications';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'telemetry', label: 'Telemetry', icon: Activity },
  { id: 'planner', label: 'Planner', icon: Cpu },
  { id: 'views', label: 'Views', icon: MonitorPlay },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'plugins', label: 'Plugins', icon: Layers },
];

const TAB_IDS = TABS.map((t) => t.id);

// ── Page ───────────────────────────────────────────────────────────────────────

export const SettingsPage = () => {
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
  // React Router's <Prompt> / useBlocker was removed in v6. Intercepting
  // history.pushState directly is the only reliable way to catch programmatic
  // navigation (sidebar clicks, NavLink) while the form has unsaved changes.
  const [showNavModal, setShowNavModal] = useState(false);
  const pendingNavUrl = useRef<string | null>(null);
  const origPushState = useRef<typeof window.history.pushState | null>(null);

  useEffect(() => {
    if (!isDirty) {
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

      // Hash-only changes are tab switches within this page — let them through.
      if (newPath === currentPath) {
        orig(state, unused, url);
        return;
      }

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
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const hashTab = location.hash.replace('#', '') as TabId;
  const activeTab: TabId = TAB_IDS.includes(hashTab) ? hashTab : 'general';

  const handleTabChange = (tabId: TabId) => {
    if (isDirty && tabId !== activeTab) {
      setPendingTab(tabId);
      return;
    }
    void navigate(`${location.pathname}#${tabId}`, { replace: true });
  };

  useEffect(() => {
    if (!location.hash) void navigate(`${location.pathname}#general`, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  const handleSave = async () => {
    setSaveError(false);
    try {
      // saveConfig() PUTs the draft to the backend (writes app.yaml and triggers backend reload).
      // refreshAppConfig() then re-fetches /api/config so the rest of the UI picks up the new
      // values without requiring a page reload. Order matters: refresh must follow the save.
      await saveConfig();
      void refreshAppConfig();
    } catch {
      setSaveError(true);
    }
  };

  // ── Tab modal actions ──────────────────────────────────────────────────────
  const tabModalSaveAndGo = async () => {
    await handleSave();
    if (pendingTab) void navigate(`${location.pathname}#${pendingTab}`, { replace: true });
    setPendingTab(null);
  };
  const tabModalDiscard = () => {
    if (pendingTab) void navigate(`${location.pathname}#${pendingTab}`, { replace: true });
    setPendingTab(null);
  };
  const tabModalStay = () => setPendingTab(null);

  // ── Nav modal actions (leaving settings page entirely) ─────────────────────
  const navModalSaveAndGo = async () => {
    const url = pendingNavUrl.current;
    pendingNavUrl.current = null;
    setShowNavModal(false);
    if (origPushState.current) {
      window.history.pushState = origPushState.current;
      origPushState.current = null;
    }
    await handleSave();
    if (url) void navigate(url);
  };
  const navModalDiscard = () => {
    const url = pendingNavUrl.current;
    pendingNavUrl.current = null;
    setShowNavModal(false);
    if (origPushState.current) {
      window.history.pushState = origPushState.current;
      origPushState.current = null;
    }
    if (url) void navigate(url);
  };
  const navModalStay = () => {
    pendingNavUrl.current = null;
    setShowNavModal(false);
  };

  // Derive save button state
  const saveState: SaveState = saving
    ? 'saving'
    : saved
      ? 'saved'
      : saveError
        ? 'error'
        : isDirty
          ? 'dirty'
          : 'idle';

  if (loading || !draft) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-brand-500 h-5 w-5 animate-spin" />
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
          Loading configuration…
        </span>
      </div>
    );
  }

  return (
    <>
      {/* ── Unsaved changes modal (tab switch) ──────────────────────────── */}
      <ConfirmationModal
        open={showTabModal}
        onSave={tabModalSaveAndGo}
        onDiscard={tabModalDiscard}
        onStay={tabModalStay}
        saving={saving}
      />

      {/* ── Unsaved changes modal (leaving settings page) ───────────────── */}
      <ConfirmationModal
        open={showNavModal}
        onSave={navModalSaveAndGo}
        onDiscard={navModalDiscard}
        onStay={navModalStay}
        saving={saving}
        message="You have unsaved settings changes. Save before leaving?"
      />

      <div className="mx-auto w-full max-w-[1000px] space-y-6">
        <PageHeader
          title="Settings"
          breadcrumb={
            <PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Settings' }]} />
          }
          actions={
            <div className="flex items-center gap-3">
              {isDirty && !saving && !saved && (
                <span className="text-xs text-amber-500 dark:text-amber-400">Unsaved changes</span>
              )}
              <StatefulSaveButton state={saveState} onClick={handleSave} />
            </div>
          }
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex w-full">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors ${
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

          <div className="p-6">
            {activeTab === 'general' && <AppSettingsSection draft={draft} setDraft={setDraft} />}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <AppearanceSettingsSection />
                <SeverityLabelsSettingsSection />
                <TooltipSettingsSection />
              </div>
            )}
            {activeTab === 'telemetry' && (
              <TelemetrySettingsSection draft={draft} setDraft={setDraft} />
            )}
            {activeTab === 'planner' && (
              <PlannerSettingsSection draft={draft} setDraft={setDraft} />
            )}
            {activeTab === 'views' && <ViewsSettingsSection draft={draft} setDraft={setDraft} />}
            {activeTab === 'notifications' && <NotificationsSettingsSection />}
            {activeTab === 'security' && (
              <SecuritySettingsSection draft={draft} setDraft={setDraft} />
            )}
            {activeTab === 'plugins' && (
              <PluginsSettingsSection draft={draft} setDraft={setDraft} />
            )}
          </div>
        </div>

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
