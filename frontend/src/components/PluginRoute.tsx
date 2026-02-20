import type { ReactNode } from 'react';
import { usePluginsMenu } from '../context/PluginsMenuContext';
import { AlertTriangle } from 'lucide-react';

interface PluginRouteProps {
  pluginId: string;
  children: ReactNode;
}

export const PluginRoute = ({ pluginId, children }: PluginRouteProps) => {
  const { isPluginActive, loading } = usePluginsMenu();

  if (loading) return null;

  if (!isPluginActive(pluginId)) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-bg-base)]">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-600/30 bg-gray-800/50">
            <AlertTriangle className="h-7 w-7 text-gray-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-base)]">
              Plugin Not Active
            </h2>
            <p className="mt-2 text-[13px] text-gray-500">
              The <span className="font-mono text-gray-400">{pluginId}</span> plugin is not
              currently enabled or available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
