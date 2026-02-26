import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { CosmosSidebar } from './CosmosSidebar';
import { CosmosHeader } from './CosmosHeader';
import { PageTitleProvider } from '../contexts/PageTitleContext';
import { AppConfigProvider } from '../contexts/AppConfigContext';
import { PluginsMenuProvider } from '../../context/PluginsMenuContext';
import { PlaylistProvider } from '../contexts/PlaylistContext';
import '../cosmos.css';

export const CosmosLayout = () => {
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('cosmos-dark-mode');
    return saved === null ? true : saved === 'true';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Ref on the cosmos-root div — allows direct DOM class toggle without
  // waiting for React to re-render (avoids the html.dark vs .cosmos-root.dark
  // two-step lag where Tailwind dark: utilities and CSS variables update at
  // different times).
  const rootRef = useRef<HTMLDivElement>(null);

  const handleToggleDark = () => {
    const next = !isDark;
    // Toggle BOTH class gates synchronously before React re-renders:
    // 1. html.dark  → drives Tailwind dark: utilities across the whole page
    // 2. .cosmos-root.dark → drives CSS variables in cosmos.css (sidebar bg, borders…)
    document.documentElement.classList.toggle('dark', next);
    rootRef.current?.classList.toggle('dark', next);
    localStorage.setItem('cosmos-dark-mode', String(next));
    setIsDark(next);
  };

  return (
    <AppConfigProvider>
    <PluginsMenuProvider>
    <PlaylistProvider>
    <PageTitleProvider>
      {/* Page load preloader — matches TailAdmin's preloader.html */}
      {pageLoading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-white dark:bg-gray-950">
          <div className="border-brand-500 h-16 w-16 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}
      <div ref={rootRef} className={isDark ? 'cosmos-root dark' : 'cosmos-root'}>
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
          <CosmosSidebar collapsed={sidebarCollapsed} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <CosmosHeader
              isDark={isDark}
              toggleDark={handleToggleDark}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
            />
            <main className="cosmos-scrollbar flex flex-1 flex-col overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </PageTitleProvider>
    </PlaylistProvider>
    </PluginsMenuProvider>
    </AppConfigProvider>
  );
};
