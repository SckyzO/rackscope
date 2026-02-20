import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { CosmosSidebar } from './CosmosSidebar';
import { CosmosHeader } from './CosmosHeader';
import '../cosmos.css';

export const CosmosLayout = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('cosmos-dark-mode');
    return saved === null ? false : saved === 'true';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem('cosmos-dark-mode', String(isDark));
  }, [isDark]);

  return (
    <div className={`cosmos-root${isDark ? ' dark' : ''}`}>
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
