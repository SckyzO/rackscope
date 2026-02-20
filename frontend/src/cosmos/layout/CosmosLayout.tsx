import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { CosmosSidebar } from './CosmosSidebar';
import { CosmosHeader } from './CosmosHeader';
import '../cosmos.css';

export const CosmosLayout = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('cosmos-dark-mode');
    return saved === null ? true : saved === 'true'; // dark by default (NOC-first)
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync Cosmos dark mode to html.dark so Tailwind dark: utilities work correctly.
  // Rackscope's ThemeContext will re-apply its own state when we navigate back.
  useEffect(() => {
    const htmlEl = document.documentElement;
    if (isDark) {
      htmlEl.classList.add('dark');
    } else {
      htmlEl.classList.remove('dark');
    }
    localStorage.setItem('cosmos-dark-mode', String(isDark));
  }, [isDark]);

  return (
    <div className={isDark ? 'cosmos-root dark' : 'cosmos-root'}>
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
        <CosmosSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CosmosHeader isDark={isDark} toggleDark={() => setIsDark((p) => !p)} />
          <main className="cosmos-scrollbar flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
