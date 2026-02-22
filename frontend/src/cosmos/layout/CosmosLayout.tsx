import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CosmosSidebar } from './CosmosSidebar';
import { CosmosHeader } from './CosmosHeader';
import '../cosmos.css';

// Apply dark class directly on the html element — synchronous, no React cycle
function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('cosmos-dark-mode', String(dark));
}

export const CosmosLayout = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('cosmos-dark-mode');
    const dark = saved === null ? true : saved === 'true';
    // Apply immediately at init so there's no flash
    document.documentElement.classList.toggle('dark', dark);
    return dark;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Toggle: update html.dark BEFORE React re-renders so both change in the same frame
  const handleToggleDark = () => {
    const next = !isDark;
    applyDark(next); // synchronous DOM mutation first
    setIsDark(next); // then trigger re-render
  };

  return (
    <div className={isDark ? 'cosmos-root dark' : 'cosmos-root'}>
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
