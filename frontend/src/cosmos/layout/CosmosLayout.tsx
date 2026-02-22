import { useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { CosmosSidebar } from './CosmosSidebar';
import { CosmosHeader } from './CosmosHeader';
import '../cosmos.css';

export const CosmosLayout = () => {
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
    <div ref={rootRef} className={isDark ? 'cosmos-root dark' : 'cosmos-root'}>
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
        <CosmosSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CosmosHeader isDark={isDark} toggleDark={handleToggleDark} />
          <main className="cosmos-scrollbar flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
