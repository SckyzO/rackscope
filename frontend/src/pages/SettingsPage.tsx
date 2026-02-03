import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SettingsLayout } from '../components/settings/SettingsLayout';
import { useSettingsConfig } from '../components/settings/useSettingsConfig';
import { AppSettingsSection } from '../components/settings/sections/AppSettingsSection';
import { TelemetrySettingsSection } from '../components/settings/sections/TelemetrySettingsSection';
import { PlannerSettingsSection } from '../components/settings/sections/PlannerSettingsSection';
import { PluginsSettingsSection } from '../components/settings/sections/PluginsSettingsSection';

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const { draft, setDraft, loading, saving, saved, saveConfig } = useSettingsConfig();

  // Determine initial tab from URL hash or default to 'app'
  const getInitialTab = () => {
    const hash = location.hash.slice(1); // Remove '#'
    return ['app', 'telemetry', 'planner', 'plugins'].includes(hash) ? hash : 'app';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  if (loading || !draft) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse font-mono text-blue-500">
          LDR :: LOADING_CONFIGURATION...
        </div>
      </div>
    );
  }

  return (
    <SettingsLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        window.location.hash = tab;
      }}
      onSave={saveConfig}
      saving={saving}
      saved={saved}
    >
      {activeTab === 'app' && <AppSettingsSection draft={draft} setDraft={setDraft} />}
      {activeTab === 'telemetry' && <TelemetrySettingsSection draft={draft} setDraft={setDraft} />}
      {activeTab === 'planner' && <PlannerSettingsSection draft={draft} setDraft={setDraft} />}
      {activeTab === 'plugins' && <PluginsSettingsSection draft={draft} setDraft={setDraft} />}
    </SettingsLayout>
  );
};
